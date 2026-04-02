"""
CercaFungo — Valutazione modelli (detector + classificatore).

Genera metriche dettagliate, matrice di confusione,
e visualizzazioni delle predizioni migliori e peggiori.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)

console = Console()
ROOT = Path(__file__).resolve().parent.parent


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def evaluate_detector(
    weights_path: Path,
    dataset_yaml: Path,
    image_size: int = 640,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.5,
    save_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Valuta il detector YOLOv8 sul test set.

    Returns:
        Dict con metriche: mAP50, mAP50-95, precision, recall, F1.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        console.print("[red]Pacchetto ultralytics non installato[/red]")
        sys.exit(1)

    console.print(
        Panel(
            f"[bold green]Valutazione Detector YOLOv8[/bold green]\n\n"
            f"Weights: {weights_path}\n"
            f"Dataset: {dataset_yaml}\n"
            f"Image size: {image_size}\n"
            f"Confidence threshold: {conf_threshold}\n"
            f"IoU threshold: {iou_threshold}",
            title="CercaFungo - Detector Evaluation",
        )
    )

    model = YOLO(str(weights_path))

    # Valida sul test set (o val se test non disponibile)
    results = model.val(
        data=str(dataset_yaml),
        imgsz=image_size,
        conf=conf_threshold,
        iou=iou_threshold,
        split="test",
        verbose=True,
        plots=True,
        save_json=True,
    )

    # Estrai metriche
    metrics = {
        "mAP50": float(results.box.map50) if hasattr(results.box, "map50") else 0.0,
        "mAP50_95": float(results.box.map) if hasattr(results.box, "map") else 0.0,
        "precision": float(results.box.mp) if hasattr(results.box, "mp") else 0.0,
        "recall": float(results.box.mr) if hasattr(results.box, "mr") else 0.0,
    }
    metrics["f1"] = (
        2 * metrics["precision"] * metrics["recall"]
        / max(metrics["precision"] + metrics["recall"], 1e-6)
    )

    # Stampa risultati
    table = Table(title="Metriche Detector")
    table.add_column("Metrica", style="cyan")
    table.add_column("Valore", style="green", justify="right")

    for name, value in metrics.items():
        table.add_row(name, f"{value:.4f}")

    console.print(table)

    # Salva metriche
    if save_dir:
        save_dir.mkdir(parents=True, exist_ok=True)
        with open(save_dir / "detector_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)
        console.print(f"[green]Metriche salvate: {save_dir / 'detector_metrics.json'}[/green]")

    return metrics


def evaluate_classifier(
    weights_path: Path,
    test_dir: Path,
    image_size: int = 224,
    save_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Valuta il classificatore EfficientNet sul test set.

    Returns:
        Dict con metriche per-classe e aggregate.
    """
    from torchvision import transforms

    console.print(
        Panel(
            f"[bold green]Valutazione Classificatore Specie[/bold green]\n\n"
            f"Weights: {weights_path}\n"
            f"Test data: {test_dir}\n"
            f"Image size: {image_size}",
            title="CercaFungo - Classifier Evaluation",
        )
    )

    # Carica checkpoint
    checkpoint = torch.load(str(weights_path), map_location="cpu", weights_only=False)
    class_names = checkpoint.get("class_names", [])
    num_classes = checkpoint.get("num_classes", len(class_names))

    if not class_names:
        # Fallback: leggi da config
        config = load_config()
        class_names = [s["id"] for s in config["species"]]
        num_classes = len(class_names)

    console.print(f"  Classi ({num_classes}): {', '.join(class_names)}")

    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Modello
    from training.train_classifier import build_model
    model = build_model(num_classes=num_classes, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    # Trasformazione test
    test_transform = transforms.Compose([
        transforms.Resize(int(image_size * 1.14)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    # Carica dataset test
    from training.train_classifier import MushroomSpeciesDataset
    from torch.utils.data import DataLoader

    test_dataset = MushroomSpeciesDataset(test_dir, class_names, test_transform)
    if len(test_dataset) == 0:
        console.print(f"[red]Nessun dato di test trovato in {test_dir}[/red]")
        return {}

    test_loader = DataLoader(
        test_dataset,
        batch_size=32,
        shuffle=False,
        num_workers=4,
        pin_memory=True,
    )

    console.print(f"  Immagini di test: {len(test_dataset)}")

    # Inferenza
    all_predictions: List[int] = []
    all_labels: List[int] = []
    all_confidences: List[float] = []
    all_paths: List[Path] = []

    console.print("\n[bold]Inferenza sul test set...[/bold]")

    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probabilities = torch.softmax(outputs, dim=1)
            confidences, predicted = probabilities.max(1)

            all_predictions.extend(predicted.cpu().numpy().tolist())
            all_labels.extend(labels.numpy().tolist())
            all_confidences.extend(confidences.cpu().numpy().tolist())

    # Metriche
    y_true = np.array(all_labels)
    y_pred = np.array(all_predictions)

    # Classification report
    present_classes = sorted(set(y_true.tolist()) | set(y_pred.tolist()))
    present_names = [class_names[i] for i in present_classes if i < len(class_names)]

    report = classification_report(
        y_true, y_pred,
        labels=present_classes,
        target_names=present_names,
        output_dict=True,
        zero_division=0,
    )

    # Stampa report
    console.print("\n[bold]Classification Report:[/bold]\n")

    report_table = Table(title="Metriche per Classe")
    report_table.add_column("Specie", style="cyan")
    report_table.add_column("Precision", style="green", justify="right")
    report_table.add_column("Recall", style="yellow", justify="right")
    report_table.add_column("F1-Score", style="blue", justify="right")
    report_table.add_column("Support", style="dim", justify="right")

    for name in present_names:
        if name in report:
            r = report[name]
            report_table.add_row(
                name,
                f"{r['precision']:.4f}",
                f"{r['recall']:.4f}",
                f"{r['f1-score']:.4f}",
                str(int(r["support"])),
            )

    report_table.add_section()
    if "weighted avg" in report:
        wavg = report["weighted avg"]
        report_table.add_row(
            "[bold]Media pesata[/bold]",
            f"[bold]{wavg['precision']:.4f}[/bold]",
            f"[bold]{wavg['recall']:.4f}[/bold]",
            f"[bold]{wavg['f1-score']:.4f}[/bold]",
            str(int(wavg["support"])),
        )

    console.print(report_table)

    # Accuracy complessiva
    accuracy = (y_pred == y_true).mean()
    console.print(f"\n  [bold]Accuracy complessiva: {accuracy:.4f}[/bold]")

    # Matrice di confusione
    cm = confusion_matrix(y_true, y_pred, labels=present_classes)

    # Visualizzazione
    if save_dir:
        save_dir.mkdir(parents=True, exist_ok=True)

        from utils.visualization import plot_confusion_matrix
        plot_confusion_matrix(
            cm,
            present_names,
            title="Matrice di Confusione — Classificatore Specie",
            save_path=save_dir / "confusion_matrix.png",
            normalize=True,
        )
        console.print(f"[green]Confusion matrix salvata: {save_dir / 'confusion_matrix.png'}[/green]")

        # Matrice non normalizzata
        plot_confusion_matrix(
            cm,
            present_names,
            title="Matrice di Confusione (Conteggi)",
            save_path=save_dir / "confusion_matrix_counts.png",
            normalize=False,
        )

    # Analisi errori: specie tossiche
    _analyze_toxic_species_errors(y_true, y_pred, class_names, present_classes)

    # Salva metriche
    metrics = {
        "accuracy": float(accuracy),
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "class_names": class_names,
    }

    if save_dir:
        with open(save_dir / "classifier_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2, default=str)
        console.print(f"\n[green]Metriche salvate: {save_dir / 'classifier_metrics.json'}[/green]")

    return metrics


def _analyze_toxic_species_errors(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: List[str],
    present_classes: List[int],
) -> None:
    """
    Analisi specifica degli errori sulle specie tossiche/mortali.
    E' CRITICO che il modello non classifichi funghi tossici come commestibili.
    """
    config = load_config()
    species_list = config["species"]
    species_map = {s["id"]: s for s in species_list}

    toxic_ids = [
        i for i, name in enumerate(class_names)
        if name in species_map and species_map[name].get("toxic", False)
    ]
    edible_ids = [
        i for i, name in enumerate(class_names)
        if name in species_map and species_map[name].get("edible", False)
    ]

    if not toxic_ids or not edible_ids:
        return

    console.print("\n[bold red]Analisi Errori Critici — Specie Tossiche[/bold red]")

    # Conta errori critici: tossico predetto come commestibile
    critical_errors = 0
    total_toxic = 0

    for i in range(len(y_true)):
        if y_true[i] in toxic_ids:
            total_toxic += 1
            if y_pred[i] in edible_ids:
                critical_errors += 1
                true_name = class_names[y_true[i]] if y_true[i] < len(class_names) else "?"
                pred_name = class_names[y_pred[i]] if y_pred[i] < len(class_names) else "?"
                console.print(
                    f"  [red]CRITICO: {true_name} (TOSSICO) classificato come {pred_name} (commestibile)[/red]"
                )

    if total_toxic > 0:
        error_rate = critical_errors / total_toxic * 100
        safe_rate = 100 - error_rate
        color = "green" if error_rate == 0 else "red"
        console.print(
            f"\n  [bold]Tossici totali nel test: {total_toxic}[/bold]"
        )
        console.print(
            f"  [{color}]Errori critici (tossico -> commestibile): {critical_errors} ({error_rate:.1f}%)[/{color}]"
        )
        console.print(
            f"  [{color}]Tasso di sicurezza: {safe_rate:.1f}%[/{color}]"
        )

        if critical_errors > 0:
            console.print(
                "\n  [bold red]ATTENZIONE: Il modello ha errori critici di sicurezza![/bold red]\n"
                "  [red]NON usare in produzione finche' questi errori non sono azzerati.[/red]\n"
                "  [yellow]Strategie:\n"
                "  1. Aumentare dati di training per specie tossiche\n"
                "  2. Usare class weights per penalizzare errori su tossici\n"
                "  3. Aggiungere threshold alto per classificare come 'sconosciuto'\n"
                "  4. Forzare label 'tossico/sconosciuto' se confidence < 0.85[/yellow]"
            )
    else:
        console.print("  [dim]Nessuna specie tossica nel test set[/dim]")


def evaluate_all(
    config: Optional[Dict[str, Any]] = None,
    detector_weights: Optional[Path] = None,
    classifier_weights: Optional[Path] = None,
) -> None:
    """Esegue valutazione completa di tutti i modelli."""
    if config is None:
        config = load_config()

    paths_config = config["paths"]
    save_dir = ROOT / paths_config["models_output"] / "evaluation"
    save_dir.mkdir(parents=True, exist_ok=True)

    # Detector
    if detector_weights and detector_weights.exists():
        dataset_yaml = ROOT / paths_config["processed_dataset"] / "dataset.yaml"
        if dataset_yaml.exists():
            evaluate_detector(
                weights_path=detector_weights,
                dataset_yaml=dataset_yaml,
                image_size=config["detector"]["image_size"],
                save_dir=save_dir / "detector",
            )
    else:
        console.print("[yellow]Detector weights non trovati, skip valutazione detector[/yellow]")

    # Classifier
    if classifier_weights and classifier_weights.exists():
        test_dir = ROOT / paths_config["raw_images"] / "inaturalist"
        # Prova directory test se esiste
        test_split = test_dir / "test"
        if test_split.exists():
            test_dir = test_split

        evaluate_classifier(
            weights_path=classifier_weights,
            test_dir=test_dir,
            image_size=config["classifier"]["image_size"],
            save_dir=save_dir / "classifier",
        )
    else:
        console.print("[yellow]Classifier weights non trovati, skip valutazione classificatore[/yellow]")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Valutazione modelli"
    )
    parser.add_argument(
        "--detector-weights",
        type=str,
        default=None,
        help="Path ai pesi del detector (best.pt)",
    )
    parser.add_argument(
        "--classifier-weights",
        type=str,
        default=None,
        help="Path ai pesi del classificatore (best_model.pt)",
    )
    parser.add_argument(
        "--dataset-yaml",
        type=str,
        default=None,
        help="Path al dataset.yaml per il detector",
    )
    parser.add_argument(
        "--test-dir",
        type=str,
        default=None,
        help="Directory test per il classificatore",
    )
    parser.add_argument(
        "--save-dir",
        type=str,
        default=None,
        help="Directory dove salvare risultati",
    )
    args = parser.parse_args()

    config = load_config()

    # Se specificati singolarmente
    if args.detector_weights:
        dataset_yaml = Path(args.dataset_yaml) if args.dataset_yaml else (
            ROOT / config["paths"]["processed_dataset"] / "dataset.yaml"
        )
        evaluate_detector(
            weights_path=Path(args.detector_weights),
            dataset_yaml=dataset_yaml,
            save_dir=Path(args.save_dir) if args.save_dir else None,
        )

    if args.classifier_weights:
        test_dir = Path(args.test_dir) if args.test_dir else (
            ROOT / config["paths"]["raw_images"] / "inaturalist"
        )
        evaluate_classifier(
            weights_path=Path(args.classifier_weights),
            test_dir=test_dir,
            save_dir=Path(args.save_dir) if args.save_dir else None,
        )

    # Se nessuno specificato, cerca automaticamente
    if not args.detector_weights and not args.classifier_weights:
        console.print("[yellow]Nessun modello specificato, cerco automaticamente...[/yellow]")

        # Cerca ultimo detector
        det_dir = ROOT / config["paths"]["models_output"] / "detector"
        det_weights = None
        if det_dir.exists():
            for d in sorted(det_dir.iterdir(), reverse=True):
                best = d / "weights" / "best.pt"
                if best.exists():
                    det_weights = best
                    break

        # Cerca ultimo classifier
        cls_dir = ROOT / config["paths"]["models_output"] / "classifier"
        cls_weights = None
        if cls_dir.exists():
            for d in sorted(cls_dir.iterdir(), reverse=True):
                best = d / "best_model.pt"
                if best.exists():
                    cls_weights = best
                    break

        evaluate_all(
            config=config,
            detector_weights=det_weights,
            classifier_weights=cls_weights,
        )
