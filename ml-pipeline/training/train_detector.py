"""
CercaFungo — Training YOLOv8n Detector (Stage 1).

Addestra un modello YOLOv8 nano per la detection di funghi generici.
Classe singola: "fungo". Il modello serve come primo stadio della pipeline
di riconoscimento: prima trovi il fungo, poi lo classifichi.
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import torch
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()
ROOT = Path(__file__).resolve().parent.parent


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_device(device_config: str = "auto") -> str:
    """Determina il device da usare per il training."""
    if device_config == "auto":
        if torch.cuda.is_available():
            device = "0"  # Prima GPU
            gpu_name = torch.cuda.get_device_name(0)
            gpu_mem = torch.cuda.get_device_properties(0).total_mem / 1e9
            console.print(f"  [green]GPU trovata: {gpu_name} ({gpu_mem:.1f} GB)[/green]")
            return device
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            console.print("  [green]Apple Silicon MPS disponibile[/green]")
            return "mps"
        else:
            console.print("  [yellow]Nessuna GPU trovata, uso CPU (sara' lento!)[/yellow]")
            return "cpu"
    return device_config


def train_detector(
    config: Optional[Dict[str, Any]] = None,
    dataset_yaml: Optional[Path] = None,
    resume: bool = False,
    resume_weights: Optional[Path] = None,
) -> Path:
    """
    Addestra il detector YOLOv8n per la detection di funghi.

    Args:
        config: Configurazione (da config.yaml)
        dataset_yaml: Path al file dataset.yaml
        resume: Se True, riprende training da ultimo checkpoint
        resume_weights: Path specifica ai pesi da cui riprendere

    Returns:
        Path alla directory con i risultati del training.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        console.print(
            "[red]Errore: pacchetto 'ultralytics' non installato.[/red]\n"
            "Installa con: pip install ultralytics"
        )
        sys.exit(1)

    if config is None:
        config = load_config()

    det_config = config["detector"]
    paths_config = config["paths"]

    # Path al dataset
    if dataset_yaml is None:
        dataset_yaml = ROOT / paths_config["processed_dataset"] / "dataset.yaml"

    if not dataset_yaml.exists():
        console.print(
            f"[red]Dataset non trovato: {dataset_yaml}[/red]\n"
            "[dim]Esegui prima: python -m dataset.prepare_dataset[/dim]"
        )
        sys.exit(1)

    # Output directory
    output_dir = ROOT / paths_config["models_output"] / "detector"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Timestamp per il run
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = f"detector_{timestamp}"

    # Device
    console.print("\n[bold]Configurazione hardware...[/bold]")
    device = get_device(det_config.get("device", "auto"))

    # Info panel
    console.print(
        Panel(
            f"[bold green]Training Detector YOLOv8n[/bold green]\n\n"
            f"Modello base: {det_config['model']}\n"
            f"Dataset: {dataset_yaml}\n"
            f"Image size: {det_config['image_size']}px\n"
            f"Epochs: {det_config['epochs']}\n"
            f"Batch size: {det_config['batch_size']}\n"
            f"Learning rate: {det_config['learning_rate']}\n"
            f"Optimizer: {det_config['optimizer']}\n"
            f"Patience (early stopping): {det_config['patience']}\n"
            f"Device: {device}\n"
            f"Run name: {run_name}\n"
            f"Output: {output_dir}",
            title="CercaFungo - Stage 1 Detection Training",
        )
    )

    # Carica modello
    console.print("\n[bold]Caricamento modello...[/bold]")

    if resume and resume_weights and resume_weights.exists():
        console.print(f"  [cyan]Resume da: {resume_weights}[/cyan]")
        model = YOLO(str(resume_weights))
    elif resume:
        # Cerca ultimo checkpoint
        last_pt = output_dir / "weights" / "last.pt"
        if last_pt.exists():
            console.print(f"  [cyan]Resume da ultimo checkpoint: {last_pt}[/cyan]")
            model = YOLO(str(last_pt))
        else:
            console.print("  [yellow]Nessun checkpoint trovato, inizio da zero[/yellow]")
            model = YOLO(det_config["model"])
    else:
        model = YOLO(det_config["model"])
        console.print(f"  [green]Modello {det_config['model']} caricato (pretrained COCO)[/green]")

    # WandB (opzionale)
    wandb_config = det_config.get("wandb", {})
    if wandb_config.get("enabled", False):
        try:
            import wandb
            wandb.init(
                project=wandb_config.get("project", "cercafungo"),
                entity=wandb_config.get("entity"),
                name=run_name,
                config={
                    "model": det_config["model"],
                    "image_size": det_config["image_size"],
                    "epochs": det_config["epochs"],
                    "batch_size": det_config["batch_size"],
                    "learning_rate": det_config["learning_rate"],
                },
            )
            console.print("  [green]WandB inizializzato[/green]")
        except ImportError:
            console.print("  [yellow]WandB non installato, logging solo locale[/yellow]")

    # Training
    console.print(f"\n[bold]Avvio training ({det_config['epochs']} epochs)...[/bold]\n")

    results = model.train(
        data=str(dataset_yaml),
        epochs=det_config["epochs"],
        imgsz=det_config["image_size"],
        batch=det_config["batch_size"],
        patience=det_config["patience"],
        optimizer=det_config["optimizer"],
        lr0=det_config["learning_rate"],
        weight_decay=det_config["weight_decay"],
        warmup_epochs=det_config["warmup_epochs"],
        cos_lr=det_config.get("cos_lr", True),
        augment=det_config.get("augment", True),
        mosaic=det_config.get("mosaic", 1.0),
        mixup=det_config.get("mixup", 0.1),
        workers=det_config.get("num_workers", 4),
        device=device,
        project=str(output_dir),
        name=run_name,
        exist_ok=True,
        verbose=True,
        save=True,
        save_period=10,  # Salva checkpoint ogni 10 epoch
        plots=True,
        resume=resume and resume_weights is not None,
    )

    # Risultati
    results_dir = output_dir / run_name

    console.print(
        Panel(
            f"[bold green]Training completato![/bold green]\n\n"
            f"Risultati: {results_dir}\n"
            f"Best weights: {results_dir / 'weights' / 'best.pt'}\n"
            f"Last weights: {results_dir / 'weights' / 'last.pt'}",
            title="Training Complete",
        )
    )

    # Stampa metriche finali
    _print_training_results(results_dir)

    return results_dir


def _print_training_results(results_dir: Path) -> None:
    """Stampa le metriche finali del training."""
    results_csv = results_dir / "results.csv"
    if not results_csv.exists():
        return

    try:
        import pandas as pd
        df = pd.read_csv(results_csv)
        # Pulisci nomi colonne (ultralytics aggiunge spazi)
        df.columns = [c.strip() for c in df.columns]

        if len(df) == 0:
            return

        last = df.iloc[-1]

        table = Table(title="Metriche Finali")
        table.add_column("Metrica", style="cyan")
        table.add_column("Valore", style="green", justify="right")

        metric_names = {
            "metrics/precision(B)": "Precision",
            "metrics/recall(B)": "Recall",
            "metrics/mAP50(B)": "mAP@50",
            "metrics/mAP50-95(B)": "mAP@50-95",
            "train/box_loss": "Train Box Loss",
            "val/box_loss": "Val Box Loss",
        }

        for col, display_name in metric_names.items():
            if col in df.columns:
                val = last[col]
                table.add_row(display_name, f"{val:.4f}")

        table.add_row("Epochs completate", str(len(df)))

        console.print(table)

    except ImportError:
        console.print("[dim]Installa pandas per le metriche dettagliate[/dim]")
    except Exception as e:
        console.print(f"[yellow]Errore lettura risultati: {e}[/yellow]")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Training detector YOLOv8n"
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Path al file dataset.yaml",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Riprendi training da ultimo checkpoint",
    )
    parser.add_argument(
        "--weights",
        type=str,
        default=None,
        help="Path ai pesi da cui riprendere (con --resume)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=None,
        help="Override numero epoch",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Override batch size",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Device: auto, cpu, 0, 1, mps",
    )
    args = parser.parse_args()

    config = load_config()

    if args.epochs:
        config["detector"]["epochs"] = args.epochs
    if args.batch_size:
        config["detector"]["batch_size"] = args.batch_size
    if args.device:
        config["detector"]["device"] = args.device

    dataset = Path(args.dataset) if args.dataset else None
    weights = Path(args.weights) if args.weights else None

    train_detector(
        config=config,
        dataset_yaml=dataset,
        resume=args.resume,
        resume_weights=weights,
    )
