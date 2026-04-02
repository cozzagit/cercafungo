"""
CercaFungo — Preparazione dataset unificato per training.

Unisce tutte le sorgenti (Roboflow, sintetiche, foto manuali),
standardizza in formato YOLOv8, splitta train/val/test,
e genera il file dataset.yaml per Ultralytics.
"""

import random
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import cv2
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()
ROOT = Path(__file__).resolve().parent.parent

IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def find_image_label_pairs(
    source_dir: Path,
) -> List[Tuple[Path, Optional[Path]]]:
    """
    Trova coppie (immagine, label) in una directory.
    Supporta strutture:
    - images/ + labels/ (standard YOLO)
    - train/images/ + train/labels/ (split pre-esistenti)
    - file piatti nella stessa directory
    """
    pairs: List[Tuple[Path, Optional[Path]]] = []

    # Cerca tutte le immagini ricorsivamente
    for img_path in sorted(source_dir.rglob("*")):
        if img_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if img_path.name.startswith("."):
            continue

        # Cerca il label corrispondente
        label_path = _find_matching_label(img_path)
        pairs.append((img_path, label_path))

    return pairs


def _find_matching_label(img_path: Path) -> Optional[Path]:
    """
    Trova il file .txt di label corrispondente a un'immagine.
    Cerca in varie posizioni standard.
    """
    stem = img_path.stem

    # Possibili posizioni del label
    candidates = [
        # Stessa directory
        img_path.with_suffix(".txt"),
        # Directory labels/ parallela a images/
        img_path.parent.parent / "labels" / f"{stem}.txt",
        # Directory labels/ nella stessa cartella
        img_path.parent / "labels" / f"{stem}.txt",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def validate_yolo_label(label_path: Path, num_classes: int = 1) -> bool:
    """Valida che un file label sia in formato YOLO valido."""
    try:
        with open(label_path, "r") as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) != 5:
                return False

            class_id = int(parts[0])
            if class_id < 0 or class_id >= num_classes:
                return False

            # cx, cy, w, h devono essere float in [0, 1]
            for val_str in parts[1:]:
                val = float(val_str)
                if val < 0 or val > 1:
                    return False

        return True
    except (ValueError, IndexError):
        return False


def validate_image(img_path: Path, min_size: int = 320) -> bool:
    """Verifica che l'immagine sia valida e di dimensioni sufficienti."""
    try:
        img = cv2.imread(str(img_path))
        if img is None:
            return False
        h, w = img.shape[:2]
        return h >= min_size and w >= min_size
    except Exception:
        return False


def remap_class_ids(
    label_path: Path,
    class_mapping: Dict[int, int],
) -> List[str]:
    """
    Rimappa gli ID delle classi secondo un mapping.
    Utile quando si uniscono dataset con classi diverse.
    Per il detector: tutte le classi -> 0 (fungo).
    """
    remapped_lines: List[str] = []

    with open(label_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            old_class = int(parts[0])

            if old_class in class_mapping:
                new_class = class_mapping[old_class]
                remapped_lines.append(f"{new_class} {' '.join(parts[1:])}")
            else:
                # Se non e' nel mapping, assumi classe 0 (fungo generico)
                remapped_lines.append(f"0 {' '.join(parts[1:])}")

    return remapped_lines


def collect_all_sources(config: Dict[str, Any]) -> List[Tuple[Path, Optional[Path]]]:
    """
    Raccoglie tutte le coppie immagine/label da tutte le sorgenti.
    """
    paths_config = config["paths"]
    all_pairs: List[Tuple[Path, Optional[Path]]] = []

    sources = [
        ("Roboflow", ROOT / paths_config["raw_images"] / "roboflow"),
        ("Sintetiche", ROOT / paths_config["synthetic_images"]),
        ("Manuali", ROOT / paths_config["raw_images"] / "manual"),
    ]

    for source_name, source_dir in sources:
        if not source_dir.exists():
            console.print(f"  [dim]Sorgente '{source_name}': directory non trovata ({source_dir}), skip[/dim]")
            continue

        pairs = find_image_label_pairs(source_dir)
        labeled_pairs = [(img, lbl) for img, lbl in pairs if lbl is not None]
        unlabeled = len(pairs) - len(labeled_pairs)

        console.print(
            f"  [cyan]{source_name}[/cyan]: "
            f"{len(labeled_pairs)} con label, {unlabeled} senza label"
        )
        all_pairs.extend(labeled_pairs)

    return all_pairs


def prepare_dataset(
    config: Optional[Dict[str, Any]] = None,
    output_dir: Optional[Path] = None,
    validate_images: bool = True,
) -> Path:
    """
    Prepara il dataset finale unificato in formato YOLOv8.

    Struttura output:
        processed/
        ├── dataset.yaml
        ├── train/
        │   ├── images/
        │   └── labels/
        ├── val/
        │   ├── images/
        │   └── labels/
        └── test/
            ├── images/
            └── labels/
    """
    if config is None:
        config = load_config()

    dataset_config = config["dataset"]
    min_size = dataset_config.get("min_image_size", 320)
    seed = dataset_config.get("seed", 42)

    if output_dir is None:
        output_dir = ROOT / config["paths"]["processed_dataset"]

    console.print(
        Panel(
            f"[bold green]Preparazione Dataset Unificato[/bold green]\n"
            f"Split: {dataset_config['train_ratio']:.0%} train / "
            f"{dataset_config['val_ratio']:.0%} val / "
            f"{dataset_config['test_ratio']:.0%} test\n"
            f"Seed: {seed}\n"
            f"Min image size: {min_size}px\n"
            f"Output: {output_dir}",
            title="CercaFungo - Dataset Preparation",
        )
    )

    # Raccogli tutte le sorgenti
    console.print("\n[bold]Raccolta sorgenti...[/bold]")
    all_pairs = collect_all_sources(config)

    if not all_pairs:
        console.print("[red]Nessun dato trovato! Esegui prima download_roboflow.py e/o synthetic_generator.py[/red]")
        return output_dir

    console.print(f"\n  Totale coppie immagine/label: {len(all_pairs)}")

    # Validazione (opzionale ma consigliata)
    if validate_images:
        console.print("\n[bold]Validazione immagini...[/bold]")
        valid_pairs: List[Tuple[Path, Path]] = []
        invalid_count = 0
        bad_label_count = 0

        for img_path, label_path in all_pairs:
            if not validate_image(img_path, min_size):
                invalid_count += 1
                continue
            if label_path and not validate_yolo_label(label_path, num_classes=100):
                # num_classes alto perche' i dataset roboflow possono avere molte classi
                bad_label_count += 1
                continue
            if label_path:
                valid_pairs.append((img_path, label_path))

        console.print(
            f"  Valide: {len(valid_pairs)} | "
            f"Immagini invalide: {invalid_count} | "
            f"Label invalide: {bad_label_count}"
        )
    else:
        valid_pairs = [(img, lbl) for img, lbl in all_pairs if lbl is not None]

    if not valid_pairs:
        console.print("[red]Nessuna coppia valida dopo validazione![/red]")
        return output_dir

    # Shuffle deterministico
    random.seed(seed)
    random.shuffle(valid_pairs)

    # Split
    n = len(valid_pairs)
    train_end = int(n * dataset_config["train_ratio"])
    val_end = train_end + int(n * dataset_config["val_ratio"])

    splits = {
        "train": valid_pairs[:train_end],
        "val": valid_pairs[train_end:val_end],
        "test": valid_pairs[val_end:],
    }

    # Crea struttura directory
    console.print("\n[bold]Creazione dataset...[/bold]")
    for split_name, pairs in splits.items():
        split_images = output_dir / split_name / "images"
        split_labels = output_dir / split_name / "labels"
        split_images.mkdir(parents=True, exist_ok=True)
        split_labels.mkdir(parents=True, exist_ok=True)

        class_counts: Counter = Counter()

        for idx, (img_path, label_path) in enumerate(pairs):
            # Nome univoco per evitare collisioni tra sorgenti
            new_name = f"{split_name}_{idx:06d}"
            new_img_ext = img_path.suffix.lower()
            if new_img_ext not in {".jpg", ".jpeg", ".png"}:
                new_img_ext = ".jpg"

            # Copia immagine
            dest_img = split_images / f"{new_name}{new_img_ext}"
            shutil.copy2(str(img_path), str(dest_img))

            # Rimappa classi a classe singola "fungo" (0)
            # Tutti i dataset convergono su un'unica classe per il detector
            remapped = remap_class_ids(label_path, {})  # Tutto -> 0
            dest_label = split_labels / f"{new_name}.txt"
            with open(dest_label, "w") as f:
                f.write("\n".join(remapped) + "\n")

            # Conta oggetti per statistiche
            for line in remapped:
                cls_id = int(line.split()[0])
                class_counts[cls_id] += 1

        console.print(
            f"  [green]{split_name}[/green]: {len(pairs)} immagini, "
            f"{sum(class_counts.values())} oggetti"
        )

    # Genera dataset.yaml per Ultralytics
    dataset_yaml = {
        "path": str(output_dir.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": 1,
        "names": ["fungo"],
    }

    yaml_path = output_dir / "dataset.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(dataset_yaml, f, default_flow_style=False, allow_unicode=True)

    console.print(f"\n  [green]dataset.yaml salvato: {yaml_path}[/green]")

    # Statistiche finali
    _print_dataset_statistics(output_dir, splits)

    return output_dir


def _print_dataset_statistics(
    dataset_dir: Path,
    splits: Dict[str, List[Tuple[Path, Path]]],
) -> None:
    """Stampa statistiche dettagliate del dataset preparato."""
    console.print("\n")

    table = Table(title="Statistiche Dataset Finale")
    table.add_column("Split", style="cyan")
    table.add_column("Immagini", style="green", justify="right")
    table.add_column("Oggetti", style="yellow", justify="right")
    table.add_column("Obj/Img (media)", style="blue", justify="right")

    total_images = 0
    total_objects = 0

    for split_name, pairs in splits.items():
        num_images = len(pairs)
        # Conta oggetti dai label
        label_dir = dataset_dir / split_name / "labels"
        num_objects = 0
        if label_dir.exists():
            for label_file in label_dir.glob("*.txt"):
                with open(label_file) as f:
                    num_objects += sum(1 for line in f if line.strip())

        avg = num_objects / max(1, num_images)
        table.add_row(split_name, str(num_images), str(num_objects), f"{avg:.1f}")
        total_images += num_images
        total_objects += num_objects

    table.add_section()
    avg_total = total_objects / max(1, total_images)
    table.add_row(
        "[bold]TOTALE[/bold]",
        f"[bold]{total_images}[/bold]",
        f"[bold]{total_objects}[/bold]",
        f"[bold]{avg_total:.1f}[/bold]",
    )

    console.print(table)

    # Distribuzione dimensioni immagini
    sizes: List[Tuple[int, int]] = []
    for split_name in splits:
        img_dir = dataset_dir / split_name / "images"
        if not img_dir.exists():
            continue
        for img_path in list(img_dir.iterdir())[:100]:  # Campiona 100
            if img_path.suffix.lower() in IMAGE_EXTENSIONS:
                img = cv2.imread(str(img_path))
                if img is not None:
                    sizes.append((img.shape[1], img.shape[0]))

    if sizes:
        widths = [s[0] for s in sizes]
        heights = [s[1] for s in sizes]
        console.print(
            f"\n  Dimensioni immagini (campione di {len(sizes)}):\n"
            f"    Larghezza: min={min(widths)}, max={max(widths)}, media={sum(widths)/len(widths):.0f}\n"
            f"    Altezza: min={min(heights)}, max={max(heights)}, media={sum(heights)/len(heights):.0f}"
        )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Preparazione dataset unificato"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Directory di output per il dataset processato",
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Salta la validazione delle immagini (piu' veloce)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed per lo split",
    )
    args = parser.parse_args()

    config = load_config()
    if args.seed:
        config["dataset"]["seed"] = args.seed

    output = Path(args.output) if args.output else None
    prepare_dataset(
        config=config,
        output_dir=output,
        validate_images=not args.skip_validation,
    )
