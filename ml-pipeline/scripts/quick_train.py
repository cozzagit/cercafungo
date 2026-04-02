"""
CercaFungo — Quick Train: dal nulla a un modello funzionante in un solo comando.

Questo script fa TUTTO:
1. Scarica 2-3 dataset di mushroom detection da Roboflow Universe
2. Li fonde in un unico dataset YOLO format (classe singola: "mushroom")
3. Fine-tuna YOLOv8n (nano, veloce) dal pretrained COCO
4. Esporta in ONNX + TFLite
5. Test inference rapido su 5 immagini

Uso:
    # Con API key Roboflow (consigliato):
    set ROBOFLOW_API_KEY=your_key_here
    python scripts/quick_train.py

    # Senza API key (fallback su immagini locali):
    python scripts/quick_train.py --no-roboflow

    # Solo COCO pretrained, nessun download:
    python scripts/quick_train.py --coco-only
"""

import os
import random
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

# Root del progetto ML pipeline
ROOT = Path(__file__).resolve().parent.parent

# Rich console (setup prima di tutto)
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeRemainingColumn
    from rich.table import Table
    from rich import box
    console = Console()
except ImportError:
    print("ERRORE: installa rich — pip install rich")
    sys.exit(1)


# ============================================================
# CONFIGURAZIONE QUICK TRAIN
# ============================================================

QUICK_CONFIG = {
    "model": "yolov8n.pt",
    "imgsz": 640,
    "epochs": 50,
    "batch": 16,
    "patience": 10,
    "optimizer": "AdamW",
    "lr0": 0.001,
    "weight_decay": 0.0005,
    "warmup_epochs": 3,
    "cos_lr": True,
    "augment": True,
    "mosaic": 1.0,
    "mixup": 0.1,
    "workers": 4,
    "single_cls": True,
}

# Dataset Roboflow Universe conosciuti per mushroom detection.
# Questi sono i migliori che abbiamo trovato — li proviamo in ordine.
# Il formato workspace/project/version e' specifico per il pacchetto roboflow.
ROBOFLOW_DATASETS = [
    {
        "name": "Mushroom Detection (v2)",
        "workspace": "mushroomdetection-wicey",
        "project": "mushroom-detection-qbpao",
        "version": 2,
        "note": "Dataset generico di mushroom detection, buona varieta'",
    },
    {
        "name": "Mushrooms YOLOv8",
        "workspace": "final-year-project-vbjqr",
        "project": "mushrooms-0bfgq",
        "version": 1,
        "note": "Dataset di funghi per YOLOv8, annotazioni bounding box",
    },
    {
        "name": "Mushroom v5",
        "workspace": "muthukumaran-1401-gmail-com",
        "project": "mushroom-oypmn",
        "version": 5,
        "note": "Dataset di funghi con diverse specie, buono per transfer learning",
    },
]


def load_project_config() -> Dict[str, Any]:
    """Carica config.yaml del progetto se presente."""
    config_path = ROOT / "config.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


def print_banner() -> None:
    """Stampa il banner iniziale."""
    console.print(
        Panel(
            "[bold green]CercaFungo — Quick Train[/bold green]\n\n"
            "[white]Dal nulla a un modello di mushroom detection funzionante.[/white]\n"
            "[dim]YOLOv8n nano — ottimizzato per velocita', non per precisione.[/dim]\n"
            "[dim]Migliorerai dopo. Ora l'obiettivo e' TESTARE nel bosco![/dim]",
            title="[bold]QUICK TRAIN[/bold]",
            border_style="green",
            box=box.DOUBLE,
        )
    )


def estimate_training_time() -> None:
    """Stima e stampa il tempo di training."""
    import torch

    table = Table(title="Stima Tempi", box=box.SIMPLE)
    table.add_column("Hardware", style="cyan")
    table.add_column("50 epoch (~500 img)", style="green", justify="right")
    table.add_column("50 epoch (~2000 img)", style="green", justify="right")

    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        table.add_row(f"[bold]GPU: {gpu_name}[/bold]", "5-15 min", "15-30 min")
        console.print(f"\n  [green]GPU rilevata: {gpu_name}[/green]")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        table.add_row("[bold]Apple Silicon (MPS)[/bold]", "10-20 min", "30-60 min")
        console.print("\n  [green]Apple Silicon MPS rilevato[/green]")
    else:
        table.add_row("[bold yellow]CPU only[/bold yellow]", "30-60 min", "1-3 ore")
        console.print("\n  [yellow]Nessuna GPU trovata — training su CPU (sara' lento)[/yellow]")

    console.print(table)


def get_device() -> str:
    """Determina il device migliore disponibile."""
    import torch

    if torch.cuda.is_available():
        return "0"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


# ============================================================
# STEP 1: DOWNLOAD DATASET DA ROBOFLOW
# ============================================================

def download_roboflow_datasets(api_key: Optional[str] = None) -> List[Path]:
    """
    Scarica dataset di mushroom detection da Roboflow Universe.

    Prova i dataset nella lista ROBOFLOW_DATASETS. Serve una API key
    (gratuita su roboflow.com — registrati e ottieni la key dal profilo).

    Returns:
        Lista dei path delle cartelle dataset scaricate.
    """
    console.print(
        Panel(
            "[bold]Step 1: Download Dataset Roboflow[/bold]\n"
            f"Tentativi: {len(ROBOFLOW_DATASETS)} dataset",
            title="DOWNLOAD",
            border_style="blue",
        )
    )

    # Risolvi API key
    api_key = api_key or os.environ.get("ROBOFLOW_API_KEY")

    if not api_key:
        console.print(
            "[yellow]ATTENZIONE: ROBOFLOW_API_KEY non impostata.[/yellow]\n"
            "[dim]Roboflow richiede una API key anche per dataset pubblici.\n"
            "Registrati gratis su https://roboflow.com e ottieni la key dal profilo.\n"
            "Poi imposta: set ROBOFLOW_API_KEY=la_tua_key\n\n"
            "Provo comunque, ma probabilmente fallira'...[/dim]"
        )

    try:
        from roboflow import Roboflow
    except ImportError:
        console.print(
            "[red]Pacchetto 'roboflow' non installato.[/red]\n"
            "Installa con: pip install roboflow"
        )
        return []

    download_dir = ROOT / "data" / "roboflow_downloads"
    download_dir.mkdir(parents=True, exist_ok=True)

    downloaded: List[Path] = []

    for i, ds_info in enumerate(ROBOFLOW_DATASETS, 1):
        name = ds_info["name"]
        workspace = ds_info["workspace"]
        project_name = ds_info["project"]
        version = ds_info["version"]

        console.print(f"\n  [{i}/{len(ROBOFLOW_DATASETS)}] [bold]{name}[/bold]")
        console.print(f"      {workspace}/{project_name} v{version}")
        console.print(f"      [dim]{ds_info['note']}[/dim]")

        dataset_dir = download_dir / f"{workspace}_{project_name}_v{version}"

        # Skip se gia' scaricato
        if dataset_dir.exists() and any(dataset_dir.rglob("*.jpg")) or (
            dataset_dir.exists() and any(dataset_dir.rglob("*.png"))
        ):
            img_count = sum(
                1 for f in dataset_dir.rglob("*")
                if f.suffix.lower() in {".jpg", ".jpeg", ".png"}
            )
            console.print(f"      [green]Gia' scaricato ({img_count} immagini), skip[/green]")
            downloaded.append(dataset_dir)
            continue

        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                task = progress.add_task(f"      Connessione a Roboflow...", total=None)

                rf = Roboflow(api_key=api_key or "placeholder")
                project = rf.workspace(workspace).project(project_name)
                ds = project.version(version)

                progress.update(task, description=f"      Download {name}...")

                dataset_dir.mkdir(parents=True, exist_ok=True)
                ds.download("yolov8", location=str(dataset_dir), overwrite=True)

            # Conta immagini scaricate
            img_count = sum(
                1 for f in dataset_dir.rglob("*")
                if f.suffix.lower() in {".jpg", ".jpeg", ".png"}
            )
            label_count = sum(
                1 for f in dataset_dir.rglob("*.txt")
                if f.name != "classes.txt"
            )

            console.print(f"      [green]OK — {img_count} immagini, {label_count} label[/green]")
            downloaded.append(dataset_dir)

            time.sleep(1)  # Rate limit gentile

        except Exception as e:
            error_msg = str(e)
            if "401" in error_msg or "unauthorized" in error_msg.lower() or "api_key" in error_msg.lower():
                console.print(
                    f"      [yellow]Serve API key — registrati gratis su roboflow.com[/yellow]"
                )
            elif "404" in error_msg or "not found" in error_msg.lower():
                console.print(
                    f"      [yellow]Dataset non trovato (forse rimosso/rinominato)[/yellow]"
                )
            else:
                console.print(f"      [red]Errore: {error_msg}[/red]")

            # Pulizia cartella vuota
            if dataset_dir.exists() and not any(dataset_dir.rglob("*.jpg")):
                shutil.rmtree(dataset_dir, ignore_errors=True)
            continue

    # Riepilogo
    if downloaded:
        console.print(f"\n  [bold green]Scaricati {len(downloaded)} dataset[/bold green]")
    else:
        console.print("\n  [bold yellow]Nessun dataset scaricato da Roboflow[/bold yellow]")

    return downloaded


# ============================================================
# STEP 2: MERGE DATASET IN FORMATO YOLO UNICO
# ============================================================

def merge_datasets(
    roboflow_dirs: List[Path],
    include_local: bool = True,
) -> Path:
    """
    Fonde tutti i dataset scaricati in un unico dataset YOLO.
    Rimappa tutte le classi a classe 0 (mushroom).

    Args:
        roboflow_dirs: Cartelle dei dataset Roboflow scaricati.
        include_local: Se True, include anche le immagini in data/raw/.

    Returns:
        Path alla cartella del dataset unificato.
    """
    console.print(
        Panel(
            "[bold]Step 2: Merge Dataset[/bold]\n"
            "Classe singola: [cyan]mushroom[/cyan] (class 0)\n"
            "Tutte le classi dei dataset vengono rimappate a 0",
            title="MERGE",
            border_style="blue",
        )
    )

    merged_dir = ROOT / "data" / "merged_quick"

    # Pulisci se esiste (per idempotenza)
    if merged_dir.exists():
        shutil.rmtree(merged_dir)

    # Struttura YOLO
    for split in ["train", "valid", "test"]:
        (merged_dir / split / "images").mkdir(parents=True, exist_ok=True)
        (merged_dir / split / "labels").mkdir(parents=True, exist_ok=True)

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    stats = {"train": 0, "valid": 0, "test": 0, "remapped_labels": 0, "skipped": 0}
    global_idx = 0

    # --- Processa dataset Roboflow ---
    for ds_dir in roboflow_dirs:
        console.print(f"\n  Processando: [cyan]{ds_dir.name}[/cyan]")

        for split_name in ["train", "valid", "test", "val"]:
            # YOLO datasets usano "valid" o "val" per validation
            target_split = "valid" if split_name in ("valid", "val") else split_name

            images_dir = ds_dir / split_name / "images"
            labels_dir = ds_dir / split_name / "labels"

            if not images_dir.exists():
                # Prova struttura alternativa (alcune versioni Roboflow)
                images_dir = ds_dir / split_name
                labels_dir = ds_dir / split_name
                if not images_dir.exists():
                    continue

            for img_file in images_dir.iterdir():
                if img_file.suffix.lower() not in image_extensions:
                    continue

                global_idx += 1
                new_name = f"qk_{global_idx:06d}{img_file.suffix.lower()}"

                # Copia immagine
                dest_img = merged_dir / target_split / "images" / new_name
                shutil.copy2(str(img_file), str(dest_img))

                # Cerca e rimappa label
                label_name = img_file.stem + ".txt"
                label_file = labels_dir / label_name
                if not label_file.exists():
                    # Prova nella cartella labels parallela
                    alt_labels_dir = img_file.parent.parent / "labels"
                    label_file = alt_labels_dir / label_name

                if label_file.exists():
                    # Rimappa tutte le classi a 0 (mushroom)
                    new_label = merged_dir / target_split / "labels" / (f"qk_{global_idx:06d}.txt")
                    _remap_label_file(label_file, new_label)
                    stats["remapped_labels"] += 1
                else:
                    stats["skipped"] += 1

                stats[target_split] += 1

    # --- Include immagini locali (data/raw/) come training extra ---
    if include_local:
        local_raw = ROOT / "data" / "raw"
        if local_raw.exists():
            local_images = [
                f for f in local_raw.rglob("*")
                if f.suffix.lower() in image_extensions
            ]
            if local_images:
                console.print(f"\n  Aggiungendo {len(local_images)} immagini locali da data/raw/")
                console.print(
                    "  [dim]Nota: senza annotazioni YOLO, non hanno label "
                    "(usate come sfondo/negative)[/dim]"
                )

                for img_file in local_images:
                    global_idx += 1
                    new_name = f"qk_{global_idx:06d}{img_file.suffix.lower()}"
                    dest_img = merged_dir / "train" / "images" / new_name
                    shutil.copy2(str(img_file), str(dest_img))

                    # Crea label vuoto (immagine senza funghi = negative example)
                    # Non creiamo label vuoto per evitare confusione —
                    # YOLO ignora immagini senza label corrispondente per default
                    stats["train"] += 1

    # --- Se non abbiamo abbastanza dati nel validation, split dal train ---
    if stats["valid"] == 0 and stats["train"] > 10:
        console.print("\n  [yellow]Nessuna immagine di validazione — split 80/20 dal train[/yellow]")
        _split_train_to_valid(merged_dir, val_ratio=0.2)
        # Ricalcola stats
        stats["train"] = len(list((merged_dir / "train" / "images").iterdir()))
        stats["valid"] = len(list((merged_dir / "valid" / "images").iterdir()))

    # --- Crea dataset.yaml ---
    dataset_yaml = merged_dir / "dataset.yaml"
    yaml_content = {
        "path": str(merged_dir.resolve()),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images" if stats["test"] > 0 else "",
        "names": {0: "mushroom"},
        "nc": 1,
    }
    with open(dataset_yaml, "w", encoding="utf-8") as f:
        yaml.dump(yaml_content, f, default_flow_style=False, allow_unicode=True)

    # Riepilogo
    table = Table(title="Dataset Unificato", box=box.SIMPLE)
    table.add_column("Split", style="cyan")
    table.add_column("Immagini", style="green", justify="right")
    table.add_row("Train", str(stats["train"]))
    table.add_row("Valid", str(stats["valid"]))
    table.add_row("Test", str(stats["test"]))
    table.add_row("[dim]Label rimappate[/dim]", str(stats["remapped_labels"]))
    table.add_row("[dim]Senza label[/dim]", str(stats["skipped"]))
    console.print(table)

    total = stats["train"] + stats["valid"] + stats["test"]
    if total == 0:
        console.print("[bold red]ERRORE: Nessuna immagine nel dataset![/bold red]")
        console.print("[dim]Prova con --no-roboflow per usare solo dati locali, "
                       "oppure imposta ROBOFLOW_API_KEY[/dim]")
    else:
        console.print(f"\n  [bold green]Dataset pronto: {total} immagini totali[/bold green]")
        console.print(f"  [dim]{dataset_yaml}[/dim]")

    return merged_dir


def _remap_label_file(src: Path, dest: Path) -> None:
    """
    Legge un label file YOLO e rimappa tutte le classi a 0.

    Formato YOLO: class_id x_center y_center width height
    """
    lines = []
    try:
        with open(src, "r") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    # Rimappa class_id a 0, mantieni coordinate
                    parts[0] = "0"
                    lines.append(" ".join(parts))
    except Exception:
        return

    if lines:
        with open(dest, "w") as f:
            f.write("\n".join(lines) + "\n")


def _split_train_to_valid(merged_dir: Path, val_ratio: float = 0.2) -> None:
    """Sposta una percentuale di immagini da train a valid."""
    train_images = list((merged_dir / "train" / "images").iterdir())
    random.seed(42)
    random.shuffle(train_images)

    n_val = max(1, int(len(train_images) * val_ratio))
    val_images = train_images[:n_val]

    for img_file in val_images:
        # Sposta immagine
        dest = merged_dir / "valid" / "images" / img_file.name
        shutil.move(str(img_file), str(dest))

        # Sposta label se esiste
        label_file = merged_dir / "train" / "labels" / (img_file.stem + ".txt")
        if label_file.exists():
            label_dest = merged_dir / "valid" / "labels" / label_file.name
            shutil.move(str(label_file), str(label_dest))


# ============================================================
# STEP 3: TRAINING YOLOv8n
# ============================================================

def train_yolov8n(dataset_dir: Path, epochs: int = 50) -> Path:
    """
    Fine-tuna YOLOv8n (nano) sul dataset merged.

    Args:
        dataset_dir: Cartella del dataset unificato con dataset.yaml.
        epochs: Numero di epoch (default 50).

    Returns:
        Path alla directory dei risultati del training.
    """
    from ultralytics import YOLO

    console.print(
        Panel(
            f"[bold]Step 3: Training YOLOv8n[/bold]\n"
            f"Epochs: {epochs} | Image size: {QUICK_CONFIG['imgsz']}px\n"
            f"Patience: {QUICK_CONFIG['patience']} (early stopping)\n"
            f"Batch: {QUICK_CONFIG['batch']} | Optimizer: {QUICK_CONFIG['optimizer']}",
            title="TRAINING",
            border_style="blue",
        )
    )

    dataset_yaml = dataset_dir / "dataset.yaml"
    if not dataset_yaml.exists():
        console.print(f"[red]dataset.yaml non trovato in {dataset_dir}[/red]")
        sys.exit(1)

    device = get_device()
    console.print(f"  Device: [bold]{device}[/bold]")

    estimate_training_time()

    # Output directory
    output_dir = ROOT / "models" / "quick_train"
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = f"quick_{timestamp}"

    console.print(f"\n  [bold]Avvio training...[/bold]")
    console.print(f"  [dim]Output: {output_dir / run_name}[/dim]\n")

    start_time = time.time()

    # Carica modello pretrained COCO
    model = YOLO(QUICK_CONFIG["model"])

    # Training
    results = model.train(
        data=str(dataset_yaml),
        epochs=epochs,
        imgsz=QUICK_CONFIG["imgsz"],
        batch=QUICK_CONFIG["batch"],
        patience=QUICK_CONFIG["patience"],
        optimizer=QUICK_CONFIG["optimizer"],
        lr0=QUICK_CONFIG["lr0"],
        weight_decay=QUICK_CONFIG["weight_decay"],
        warmup_epochs=QUICK_CONFIG["warmup_epochs"],
        cos_lr=QUICK_CONFIG["cos_lr"],
        augment=QUICK_CONFIG["augment"],
        mosaic=QUICK_CONFIG["mosaic"],
        mixup=QUICK_CONFIG["mixup"],
        workers=QUICK_CONFIG["workers"],
        device=device,
        project=str(output_dir),
        name=run_name,
        exist_ok=True,
        verbose=True,
        save=True,
        save_period=10,
        plots=True,
        single_cls=True,  # Forza classe singola
    )

    elapsed = time.time() - start_time
    elapsed_str = f"{int(elapsed // 60)}m {int(elapsed % 60)}s"

    results_dir = output_dir / run_name

    console.print(
        Panel(
            f"[bold green]Training completato in {elapsed_str}![/bold green]\n\n"
            f"Risultati: {results_dir}\n"
            f"Best weights: {results_dir / 'weights' / 'best.pt'}\n"
            f"Last weights: {results_dir / 'weights' / 'last.pt'}",
            title="TRAINING COMPLETATO",
            border_style="green",
        )
    )

    # Metriche finali
    _print_metrics(results_dir)

    return results_dir


def _print_metrics(results_dir: Path) -> None:
    """Stampa metriche finali dal CSV di ultralytics."""
    results_csv = results_dir / "results.csv"
    if not results_csv.exists():
        return

    try:
        import pandas as pd
        df = pd.read_csv(results_csv)
        df.columns = [c.strip() for c in df.columns]

        if len(df) == 0:
            return

        last = df.iloc[-1]

        table = Table(title="Metriche Finali", box=box.SIMPLE)
        table.add_column("Metrica", style="cyan")
        table.add_column("Valore", style="green", justify="right")

        metrics = {
            "metrics/precision(B)": "Precision",
            "metrics/recall(B)": "Recall",
            "metrics/mAP50(B)": "mAP@50",
            "metrics/mAP50-95(B)": "mAP@50-95",
        }

        for col, display in metrics.items():
            if col in df.columns:
                val = last[col]
                # Colora in base alla qualita'
                if val > 0.7:
                    color = "green"
                elif val > 0.4:
                    color = "yellow"
                else:
                    color = "red"
                table.add_row(display, f"[{color}]{val:.4f}[/{color}]")

        table.add_row("Epochs completate", str(len(df)))
        console.print(table)

        # Commento qualitativo
        map50 = last.get("metrics/mAP50(B)", 0)
        if map50 > 0.7:
            console.print("  [bold green]Buono per un MVP! Pronto per testare.[/bold green]")
        elif map50 > 0.4:
            console.print("  [bold yellow]Decente. Funzionera' per funghi ovvi, non perfetto.[/bold yellow]")
        elif map50 > 0.1:
            console.print("  [bold yellow]Mediocre — ma meglio di niente. Servono piu' dati.[/bold yellow]")
        else:
            console.print("  [bold red]Training non riuscito bene. Servono piu' dati annotati.[/bold red]")

    except ImportError:
        console.print("[dim]Installa pandas per vedere le metriche: pip install pandas[/dim]")
    except Exception as e:
        console.print(f"[dim]Errore lettura metriche: {e}[/dim]")


# ============================================================
# STEP 4: EXPORT ONNX + TFLITE
# ============================================================

def export_model(results_dir: Path) -> Dict[str, Path]:
    """
    Esporta il modello trainato in ONNX e TFLite.

    Returns:
        Dict formato -> path del modello esportato.
    """
    from ultralytics import YOLO

    console.print(
        Panel(
            "[bold]Step 4: Export Modelli[/bold]\n"
            "Formati: ONNX (web) + TFLite (mobile)",
            title="EXPORT",
            border_style="blue",
        )
    )

    best_weights = results_dir / "weights" / "best.pt"
    if not best_weights.exists():
        # Fallback a last.pt
        best_weights = results_dir / "weights" / "last.pt"
    if not best_weights.exists():
        console.print("[red]Nessun peso trovato! Il training e' fallito?[/red]")
        return {}

    model = YOLO(str(best_weights))
    exports_dir = ROOT / "exports" / "quick_train"
    exports_dir.mkdir(parents=True, exist_ok=True)

    exported: Dict[str, Path] = {}

    # --- ONNX ---
    console.print("\n  [bold]1. Export ONNX...[/bold]")
    try:
        onnx_path = model.export(
            format="onnx",
            imgsz=QUICK_CONFIG["imgsz"],
            simplify=True,
            opset=17,
            dynamic=False,
        )
        onnx_path = Path(onnx_path)
        dest = exports_dir / "detector.onnx"
        shutil.copy2(str(onnx_path), str(dest))
        exported["onnx"] = dest
        size_mb = dest.stat().st_size / (1024 * 1024)
        console.print(f"     [green]OK — {dest} ({size_mb:.1f} MB)[/green]")
    except Exception as e:
        console.print(f"     [red]Errore ONNX: {e}[/red]")

    # --- TFLite ---
    console.print("\n  [bold]2. Export TFLite INT8...[/bold]")
    try:
        tflite_path = model.export(
            format="tflite",
            imgsz=QUICK_CONFIG["imgsz"],
            int8=True,
        )
        tflite_path = Path(tflite_path)

        # Ultralytics puo' creare una directory, trova il .tflite
        if tflite_path.is_dir():
            tflite_files = list(tflite_path.glob("*.tflite"))
            if tflite_files:
                tflite_path = tflite_files[0]

        dest = exports_dir / "detector.tflite"
        shutil.copy2(str(tflite_path), str(dest))
        exported["tflite"] = dest
        size_mb = dest.stat().st_size / (1024 * 1024)
        console.print(f"     [green]OK — {dest} ({size_mb:.1f} MB)[/green]")
    except Exception as e:
        console.print(
            f"     [yellow]TFLite non esportato: {e}[/yellow]\n"
            f"     [dim]Richiede tensorflow: pip install tensorflow[/dim]"
        )

    # --- Copia in assets/models/ ---
    app_assets = ROOT.parent / "assets" / "models"
    if app_assets.parent.exists():
        app_assets.mkdir(parents=True, exist_ok=True)
        console.print(f"\n  [bold]Copia in {app_assets}...[/bold]")
        for fmt, src in exported.items():
            dest = app_assets / src.name
            shutil.copy2(str(src), str(dest))
            console.print(f"     [green]Copiato: {dest.name}[/green]")
    else:
        console.print(
            f"\n  [dim]Cartella app assets ({app_assets}) non presente, "
            f"skip copia. Modelli in: {exports_dir}[/dim]"
        )

    # Salva anche il .pt per ulteriore fine-tuning
    pt_dest = exports_dir / "detector_best.pt"
    shutil.copy2(str(best_weights), str(pt_dest))
    exported["pt"] = pt_dest
    console.print(f"\n  [green]Pesi PyTorch copiati: {pt_dest}[/green]")

    return exported


# ============================================================
# STEP 5: QUICK TEST INFERENCE
# ============================================================

def quick_test_inference(
    results_dir: Path,
    dataset_dir: Path,
    n_images: int = 5,
) -> None:
    """
    Test rapido di inferenza su N immagini casuali dal dataset.
    """
    from ultralytics import YOLO

    console.print(
        Panel(
            f"[bold]Step 5: Test Inference[/bold]\n"
            f"Test su {n_images} immagini casuali dal dataset",
            title="TEST",
            border_style="blue",
        )
    )

    best_weights = results_dir / "weights" / "best.pt"
    if not best_weights.exists():
        best_weights = results_dir / "weights" / "last.pt"
    if not best_weights.exists():
        console.print("[red]Nessun peso trovato[/red]")
        return

    model = YOLO(str(best_weights))

    # Trova immagini per il test
    image_extensions = {".jpg", ".jpeg", ".png"}
    test_images = []

    # Prima prova dalla cartella test
    test_dir = dataset_dir / "test" / "images"
    if test_dir.exists():
        test_images = [f for f in test_dir.iterdir() if f.suffix.lower() in image_extensions]

    # Fallback a valid
    if len(test_images) < n_images:
        valid_dir = dataset_dir / "valid" / "images"
        if valid_dir.exists():
            test_images += [f for f in valid_dir.iterdir() if f.suffix.lower() in image_extensions]

    # Fallback a train
    if len(test_images) < n_images:
        train_dir = dataset_dir / "train" / "images"
        if train_dir.exists():
            test_images += [f for f in train_dir.iterdir() if f.suffix.lower() in image_extensions]

    if not test_images:
        console.print("[yellow]Nessuna immagine trovata per il test[/yellow]")
        return

    # Seleziona N casuali
    random.seed(42)
    test_images = random.sample(test_images, min(n_images, len(test_images)))

    table = Table(title="Risultati Inference", box=box.SIMPLE)
    table.add_column("#", style="dim", justify="right")
    table.add_column("Immagine", style="cyan")
    table.add_column("Detections", style="green", justify="right")
    table.add_column("Conf. Max", style="yellow", justify="right")
    table.add_column("Tempo (ms)", style="blue", justify="right")

    for i, img_path in enumerate(test_images, 1):
        start = time.perf_counter()
        results = model.predict(str(img_path), verbose=False, conf=0.25)
        elapsed_ms = (time.perf_counter() - start) * 1000

        n_detections = len(results[0].boxes) if results and results[0].boxes is not None else 0
        max_conf = 0.0
        if n_detections > 0:
            max_conf = float(results[0].boxes.conf.max())

        table.add_row(
            str(i),
            img_path.name[:30],
            str(n_detections),
            f"{max_conf:.2f}" if n_detections > 0 else "-",
            f"{elapsed_ms:.0f}",
        )

    console.print(table)

    # Salva immagini con predizioni per controllo visuale
    predictions_dir = ROOT / "exports" / "quick_train" / "predictions"
    predictions_dir.mkdir(parents=True, exist_ok=True)

    for img_path in test_images:
        results = model.predict(str(img_path), verbose=False, conf=0.25, save=False)
        if results:
            # Salva immagine annotata
            annotated = results[0].plot()
            from PIL import Image
            import numpy as np
            img = Image.fromarray(annotated[..., ::-1])  # BGR -> RGB
            img.save(str(predictions_dir / f"pred_{img_path.name}"))

    console.print(f"\n  [green]Predizioni salvate in: {predictions_dir}[/green]")
    console.print(f"  [dim]Controlla le immagini per verificare la qualita' del modello[/dim]")


# ============================================================
# FALLBACK: COCO-ONLY (nessun download)
# ============================================================

def coco_only_approach() -> Optional[Path]:
    """
    Fallback: usa YOLOv8n pretrained COCO direttamente.
    COCO ha la classe 'mushroom'? No, ma ha oggetti simili.
    Questo esporta il modello pretrained per test basilare.

    Se ci sono immagini locali annotate in data/raw/manual/,
    fa fine-tuning su quelle.
    """
    from ultralytics import YOLO

    console.print(
        Panel(
            "[bold yellow]FALLBACK: Modalita' COCO-only[/bold yellow]\n\n"
            "Nessun download. Uso il modello COCO pretrained.\n"
            "Se ci sono immagini annotate in data/raw/manual/,\n"
            "faccio fine-tuning su quelle.",
            title="COCO FALLBACK",
            border_style="yellow",
        )
    )

    # Controlla se abbiamo dati locali annotati
    manual_dir = ROOT / "data" / "raw" / "manual"
    annotations_dir = ROOT / "data" / "annotations"
    has_local_data = False

    if manual_dir.exists() and annotations_dir.exists():
        images = list(manual_dir.rglob("*.jpg")) + list(manual_dir.rglob("*.png"))
        labels = list(annotations_dir.rglob("*.txt"))
        if images and labels:
            console.print(
                f"  [green]Trovate {len(images)} immagini e {len(labels)} annotazioni locali[/green]"
            )
            has_local_data = True

    if has_local_data:
        # Prepara mini-dataset YOLO
        console.print("  [bold]Preparazione mini-dataset locale...[/bold]")
        mini_dir = ROOT / "data" / "merged_quick"
        if mini_dir.exists():
            shutil.rmtree(mini_dir)

        for split in ["train", "valid"]:
            (mini_dir / split / "images").mkdir(parents=True, exist_ok=True)
            (mini_dir / split / "labels").mkdir(parents=True, exist_ok=True)

        # 80/20 split
        images = sorted(list(manual_dir.rglob("*.jpg")) + list(manual_dir.rglob("*.png")))
        random.seed(42)
        random.shuffle(images)
        n_val = max(1, int(len(images) * 0.2))

        for i, img in enumerate(images):
            split = "valid" if i < n_val else "train"
            dest = mini_dir / split / "images" / img.name
            shutil.copy2(str(img), str(dest))

            # Cerca label corrispondente
            label = annotations_dir / (img.stem + ".txt")
            if label.exists():
                label_dest = mini_dir / split / "labels" / label.name
                # Rimappa a classe 0
                _remap_label_file(label, label_dest)

        # dataset.yaml
        yaml_content = {
            "path": str(mini_dir.resolve()),
            "train": "train/images",
            "val": "valid/images",
            "names": {0: "mushroom"},
            "nc": 1,
        }
        dataset_yaml = mini_dir / "dataset.yaml"
        with open(dataset_yaml, "w") as f:
            yaml.dump(yaml_content, f, default_flow_style=False)

        # Train con pochi epoch (dati pochi)
        results_dir = train_yolov8n(mini_dir, epochs=30)
        return results_dir

    else:
        # Nessun dato locale — esporta solo COCO pretrained
        console.print(
            "\n  [yellow]Nessun dato locale annotato trovato.[/yellow]\n"
            "  [dim]Esporto YOLOv8n COCO pretrained come baseline.[/dim]\n"
            "  [dim]Rileva 80 classi COCO (nessuna specifica per funghi).[/dim]\n"
            "  [dim]Per risultati migliori, raccogli foto e annotale con:[/dim]\n"
            "  [dim]  python -m tools.annotate_manual[/dim]"
        )

        model = YOLO("yolov8n.pt")
        exports_dir = ROOT / "exports" / "quick_train"
        exports_dir.mkdir(parents=True, exist_ok=True)

        # Esporta ONNX
        try:
            onnx_path = model.export(format="onnx", imgsz=640, simplify=True)
            dest = exports_dir / "detector_coco_baseline.onnx"
            shutil.copy2(str(onnx_path), str(dest))
            console.print(f"  [green]ONNX baseline: {dest}[/green]")
        except Exception as e:
            console.print(f"  [red]Errore export ONNX: {e}[/red]")

        console.print(
            "\n  [bold yellow]ATTENZIONE: Questo modello NON e' specifico per funghi.[/bold yellow]\n"
            "  [dim]Per un modello utile, serve almeno uno di:[/dim]\n"
            "  [dim]  1. API key Roboflow (gratuita) per scaricare dataset[/dim]\n"
            "  [dim]  2. Foto manuali annotate in data/raw/manual/[/dim]"
        )

        return None


# ============================================================
# MAIN
# ============================================================

def main() -> None:
    """Entry point principale."""
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Quick Train: modello di mushroom detection in un comando",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi:
  # Standard (scarica da Roboflow + train):
  set ROBOFLOW_API_KEY=your_key
  python scripts/quick_train.py

  # Senza Roboflow (solo dati locali):
  python scripts/quick_train.py --no-roboflow

  # Solo export COCO pretrained (nessun training):
  python scripts/quick_train.py --coco-only

  # Custom epochs:
  python scripts/quick_train.py --epochs 100

  # Skip download (usa dataset gia' scaricato):
  python scripts/quick_train.py --skip-download
        """,
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Roboflow API key (oppure env var ROBOFLOW_API_KEY)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Numero di epoch per il training (default: 50)",
    )
    parser.add_argument(
        "--no-roboflow",
        action="store_true",
        help="Non scaricare da Roboflow, usa solo dati locali",
    )
    parser.add_argument(
        "--coco-only",
        action="store_true",
        help="Modalita' fallback: esporta solo COCO pretrained (nessun training specifico)",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Salta il download, usa dataset gia' scaricati in data/roboflow_downloads/",
    )
    parser.add_argument(
        "--skip-export",
        action="store_true",
        help="Salta l'export ONNX/TFLite",
    )
    parser.add_argument(
        "--skip-test",
        action="store_true",
        help="Salta il test di inferenza",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=None,
        help="Override batch size (default: 16)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Forza device: cpu, 0, mps",
    )

    args = parser.parse_args()

    # Override config se necessario
    if args.batch:
        QUICK_CONFIG["batch"] = args.batch
    if args.device:
        # Override get_device
        import types
        original_get_device = get_device
        _forced_device = args.device
        globals()["get_device"] = lambda: _forced_device

    # Banner
    print_banner()

    # Timing globale
    global_start = time.time()

    # === COCO-ONLY FALLBACK ===
    if args.coco_only:
        results_dir = coco_only_approach()
        if results_dir and not args.skip_export:
            exported = export_model(results_dir)
        _print_final_summary(global_start)
        return

    # === STEP 1: DOWNLOAD ===
    roboflow_dirs: List[Path] = []

    if not args.no_roboflow and not args.skip_download:
        roboflow_dirs = download_roboflow_datasets(api_key=args.api_key)

    if args.skip_download:
        # Cerca dataset gia' scaricati
        download_dir = ROOT / "data" / "roboflow_downloads"
        if download_dir.exists():
            roboflow_dirs = [
                d for d in download_dir.iterdir()
                if d.is_dir() and not d.name.startswith("_")
            ]
            console.print(
                f"\n  [cyan]Trovati {len(roboflow_dirs)} dataset gia' scaricati[/cyan]"
            )

    # Se nessun dataset Roboflow, prova fallback
    if not roboflow_dirs and not args.no_roboflow:
        console.print(
            "\n  [yellow]Nessun dataset Roboflow disponibile.[/yellow]\n"
            "  [dim]Procedo con dati locali (se presenti)...[/dim]"
        )

    # === STEP 2: MERGE ===
    dataset_dir = merge_datasets(
        roboflow_dirs=roboflow_dirs,
        include_local=True,
    )

    # Controlla che ci siano abbastanza immagini
    total_images = sum(
        1 for f in dataset_dir.rglob("*")
        if f.suffix.lower() in {".jpg", ".jpeg", ".png"}
        and "labels" not in str(f)
    )

    if total_images == 0:
        console.print(
            "\n[bold red]Nessuna immagine nel dataset![/bold red]\n"
            "[dim]Opzioni:[/dim]\n"
            "[dim]  1. Imposta ROBOFLOW_API_KEY e riesegui[/dim]\n"
            "[dim]  2. Aggiungi foto in data/raw/manual/ e annotale[/dim]\n"
            "[dim]  3. Usa --coco-only per il baseline COCO[/dim]"
        )
        sys.exit(1)

    if total_images < 20:
        console.print(
            f"\n  [yellow]Solo {total_images} immagini — il modello sara' molto impreciso.[/yellow]\n"
            f"  [dim]Procedo comunque (meglio di niente)...[/dim]"
        )

    # === STEP 3: TRAIN ===
    results_dir = train_yolov8n(dataset_dir, epochs=args.epochs)

    # === STEP 4: EXPORT ===
    exported = {}
    if not args.skip_export:
        exported = export_model(results_dir)

    # === STEP 5: TEST ===
    if not args.skip_test:
        quick_test_inference(results_dir, dataset_dir)

    # === RIEPILOGO FINALE ===
    _print_final_summary(global_start, exported=exported)


def _print_final_summary(
    start_time: float,
    exported: Optional[Dict[str, Path]] = None,
) -> None:
    """Stampa il riepilogo finale."""
    elapsed = time.time() - start_time
    elapsed_str = f"{int(elapsed // 60)}m {int(elapsed % 60)}s"

    summary_lines = [
        f"[bold green]Quick Train completato in {elapsed_str}[/bold green]\n",
    ]

    if exported:
        summary_lines.append("[bold]Modelli esportati:[/bold]")
        for fmt, path in exported.items():
            size_mb = path.stat().st_size / (1024 * 1024) if path.exists() else 0
            summary_lines.append(f"  {fmt.upper():8s} — {path} ({size_mb:.1f} MB)")

    summary_lines.append(
        "\n[bold]Prossimi passi:[/bold]\n"
        "  1. Controlla le predizioni in exports/quick_train/predictions/\n"
        "  2. Se il modello e' decente, portalo nel bosco!\n"
        "  3. Per migliorare: raccogli piu' foto e annota con:\n"
        "     python -m tools.annotate_manual\n"
        "  4. Riesegui quick_train con piu' dati e --epochs 100"
    )

    console.print(
        Panel(
            "\n".join(summary_lines),
            title="[bold]RIEPILOGO FINALE[/bold]",
            border_style="green",
            box=box.DOUBLE,
        )
    )


if __name__ == "__main__":
    main()
