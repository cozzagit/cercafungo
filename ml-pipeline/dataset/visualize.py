"""
CercaFungo — Visualizzazione dataset e annotazioni.

Mostra anteprime delle immagini annotate e statistiche del dataset.
"""

import random
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import cv2
import matplotlib.pyplot as plt
import numpy as np
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


def parse_yolo_label(
    label_path: Path,
) -> List[Tuple[int, float, float, float, float]]:
    """Legge un file label YOLO e restituisce lista di (class_id, cx, cy, w, h)."""
    annotations: List[Tuple[int, float, float, float, float]] = []

    if not label_path.exists():
        return annotations

    with open(label_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 5:
                class_id = int(parts[0])
                cx, cy, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                annotations.append((class_id, cx, cy, w, h))

    return annotations


def draw_yolo_annotations(
    image: np.ndarray,
    annotations: List[Tuple[int, float, float, float, float]],
    class_names: Optional[List[str]] = None,
    colors: Optional[List[Tuple[int, int, int]]] = None,
) -> np.ndarray:
    """Disegna bounding box YOLO sull'immagine."""
    if class_names is None:
        class_names = ["fungo"]
    if colors is None:
        colors = [
            (0, 255, 0),    # Verde
            (255, 0, 0),    # Blu
            (0, 0, 255),    # Rosso
            (255, 255, 0),  # Ciano
            (0, 255, 255),  # Giallo
            (255, 0, 255),  # Magenta
        ]

    result = image.copy()
    h, w = result.shape[:2]

    for class_id, cx, cy, bw, bh in annotations:
        # Converti YOLO -> pixel
        x1 = int((cx - bw / 2) * w)
        y1 = int((cy - bh / 2) * h)
        x2 = int((cx + bw / 2) * w)
        y2 = int((cy + bh / 2) * h)

        color = colors[class_id % len(colors)]
        cv2.rectangle(result, (x1, y1), (x2, y2), color, 2)

        label = class_names[class_id] if class_id < len(class_names) else f"cls_{class_id}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(
            result,
            (x1, y1 - label_size[1] - 6),
            (x1 + label_size[0] + 4, y1),
            color,
            -1,
        )
        cv2.putText(
            result,
            label,
            (x1 + 2, y1 - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            1,
        )

    return result


def preview_annotations(
    dataset_dir: Path,
    split: str = "train",
    num_images: int = 12,
    class_names: Optional[List[str]] = None,
    save_path: Optional[Path] = None,
    seed: int = 42,
) -> None:
    """
    Mostra una griglia di immagini con le annotazioni disegnate.
    """
    images_dir = dataset_dir / split / "images"
    labels_dir = dataset_dir / split / "labels"

    if not images_dir.exists():
        console.print(f"[red]Directory non trovata: {images_dir}[/red]")
        return

    # Trova immagini
    image_files = sorted(
        [f for f in images_dir.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS]
    )

    if not image_files:
        console.print(f"[yellow]Nessuna immagine trovata in {images_dir}[/yellow]")
        return

    # Campiona casualmente
    random.seed(seed)
    sample = random.sample(image_files, min(num_images, len(image_files)))

    cols = min(4, len(sample))
    rows = (len(sample) + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(5 * cols, 5 * rows))
    if rows == 1 and cols == 1:
        axes = np.array([[axes]])
    elif rows == 1:
        axes = axes[np.newaxis, :]
    elif cols == 1:
        axes = axes[:, np.newaxis]

    for idx, img_path in enumerate(sample):
        r, c = divmod(idx, cols)
        ax = axes[r][c]

        # Carica immagine
        img = cv2.imread(str(img_path))
        if img is None:
            ax.set_title("Errore caricamento")
            ax.axis("off")
            continue

        # Cerca label corrispondente
        label_path = labels_dir / f"{img_path.stem}.txt"
        annotations = parse_yolo_label(label_path)

        # Disegna annotazioni
        img_annotated = draw_yolo_annotations(img, annotations, class_names)
        img_rgb = cv2.cvtColor(img_annotated, cv2.COLOR_BGR2RGB)

        ax.imshow(img_rgb)
        ax.set_title(f"{img_path.name}\n{len(annotations)} oggetti", fontsize=8)
        ax.axis("off")

    # Nascondi assi vuoti
    for idx in range(len(sample), rows * cols):
        r, c = divmod(idx, cols)
        axes[r][c].axis("off")

    fig.suptitle(
        f"Preview Dataset — Split: {split} ({len(image_files)} immagini totali)",
        fontsize=14,
    )
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150)
        console.print(f"[green]Preview salvata: {save_path}[/green]")
    else:
        plt.show()


def compute_dataset_statistics(
    dataset_dir: Path,
    class_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Calcola statistiche complete del dataset.
    """
    if class_names is None:
        class_names = ["fungo"]

    stats: Dict[str, Any] = {
        "splits": {},
        "total_images": 0,
        "total_objects": 0,
        "class_distribution": Counter(),
        "bbox_sizes": [],  # (w, h) normalizzate
        "objects_per_image": [],
        "image_sizes": [],
    }

    for split_name in ["train", "val", "test"]:
        images_dir = dataset_dir / split_name / "images"
        labels_dir = dataset_dir / split_name / "labels"

        if not images_dir.exists():
            continue

        image_files = [
            f for f in images_dir.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS
        ]
        num_images = len(image_files)

        split_objects = 0
        split_class_counts: Counter = Counter()

        for img_path in image_files:
            # Dimensione immagine
            img = cv2.imread(str(img_path))
            if img is not None:
                stats["image_sizes"].append((img.shape[1], img.shape[0]))

            # Annotazioni
            label_path = labels_dir / f"{img_path.stem}.txt"
            annotations = parse_yolo_label(label_path)
            stats["objects_per_image"].append(len(annotations))

            for class_id, cx, cy, bw, bh in annotations:
                split_class_counts[class_id] += 1
                stats["bbox_sizes"].append((bw, bh))

            split_objects += len(annotations)

        stats["splits"][split_name] = {
            "images": num_images,
            "objects": split_objects,
            "class_counts": dict(split_class_counts),
        }
        stats["total_images"] += num_images
        stats["total_objects"] += split_objects
        stats["class_distribution"].update(split_class_counts)

    return stats


def print_statistics(
    dataset_dir: Path,
    class_names: Optional[List[str]] = None,
) -> None:
    """Stampa statistiche formattate del dataset."""
    if class_names is None:
        class_names = ["fungo"]

    stats = compute_dataset_statistics(dataset_dir, class_names)

    # Tabella split
    table = Table(title="Dataset Statistics")
    table.add_column("Split", style="cyan")
    table.add_column("Immagini", style="green", justify="right")
    table.add_column("Oggetti", style="yellow", justify="right")
    table.add_column("Obj/Img", style="blue", justify="right")

    for split_name, split_stats in stats["splits"].items():
        avg = split_stats["objects"] / max(1, split_stats["images"])
        table.add_row(
            split_name,
            str(split_stats["images"]),
            str(split_stats["objects"]),
            f"{avg:.1f}",
        )

    table.add_section()
    avg_total = stats["total_objects"] / max(1, stats["total_images"])
    table.add_row(
        "[bold]TOTALE[/bold]",
        f"[bold]{stats['total_images']}[/bold]",
        f"[bold]{stats['total_objects']}[/bold]",
        f"[bold]{avg_total:.1f}[/bold]",
    )
    console.print(table)

    # Distribuzione classi
    if stats["class_distribution"]:
        cls_table = Table(title="Distribuzione Classi")
        cls_table.add_column("ID", style="dim")
        cls_table.add_column("Nome", style="cyan")
        cls_table.add_column("Conteggio", style="green", justify="right")
        cls_table.add_column("%", style="yellow", justify="right")

        total = sum(stats["class_distribution"].values())
        for class_id, count in sorted(stats["class_distribution"].items()):
            name = class_names[class_id] if class_id < len(class_names) else f"cls_{class_id}"
            pct = (count / total * 100) if total > 0 else 0
            cls_table.add_row(str(class_id), name, str(count), f"{pct:.1f}%")

        console.print(cls_table)

    # Statistiche bbox
    if stats["bbox_sizes"]:
        bw_list = [s[0] for s in stats["bbox_sizes"]]
        bh_list = [s[1] for s in stats["bbox_sizes"]]
        console.print(
            f"\n  [bold]Dimensioni BBox (normalizzate):[/bold]\n"
            f"    Larghezza: min={min(bw_list):.3f}, max={max(bw_list):.3f}, "
            f"media={np.mean(bw_list):.3f}\n"
            f"    Altezza: min={min(bh_list):.3f}, max={max(bh_list):.3f}, "
            f"media={np.mean(bh_list):.3f}"
        )

    # Distribuzione oggetti per immagine
    if stats["objects_per_image"]:
        opi = stats["objects_per_image"]
        console.print(
            f"\n  [bold]Oggetti per immagine:[/bold]\n"
            f"    Min: {min(opi)}, Max: {max(opi)}, "
            f"Media: {np.mean(opi):.1f}, Mediana: {np.median(opi):.0f}"
        )

        # Immagini senza annotazioni
        empty = sum(1 for o in opi if o == 0)
        if empty > 0:
            console.print(
                f"    [yellow]Immagini senza annotazioni: {empty} "
                f"({empty / len(opi) * 100:.1f}%)[/yellow]"
            )


def plot_bbox_distribution(
    dataset_dir: Path,
    save_path: Optional[Path] = None,
) -> None:
    """Plotta la distribuzione delle dimensioni dei bounding box."""
    stats = compute_dataset_statistics(dataset_dir)

    if not stats["bbox_sizes"]:
        console.print("[yellow]Nessun bbox trovato[/yellow]")
        return

    widths = [s[0] for s in stats["bbox_sizes"]]
    heights = [s[1] for s in stats["bbox_sizes"]]

    fig, axes = plt.subplots(1, 3, figsize=(16, 5))

    # Distribuzione larghezza
    axes[0].hist(widths, bins=50, color="#4caf50", edgecolor="white", alpha=0.8)
    axes[0].set_title("Larghezza BBox")
    axes[0].set_xlabel("Larghezza (normalizzata)")
    axes[0].set_ylabel("Conteggio")

    # Distribuzione altezza
    axes[1].hist(heights, bins=50, color="#2196f3", edgecolor="white", alpha=0.8)
    axes[1].set_title("Altezza BBox")
    axes[1].set_xlabel("Altezza (normalizzata)")

    # Scatter w vs h
    axes[2].scatter(widths, heights, alpha=0.3, s=5, c="#ff7043")
    axes[2].set_title("Larghezza vs Altezza")
    axes[2].set_xlabel("Larghezza")
    axes[2].set_ylabel("Altezza")
    axes[2].set_xlim(0, 1)
    axes[2].set_ylim(0, 1)

    plt.suptitle("Distribuzione Dimensioni BBox", fontsize=14)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150)
        console.print(f"[green]Plot salvato: {save_path}[/green]")
    else:
        plt.show()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Visualizzazione dataset"
    )
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default=None,
        help="Directory del dataset processato",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="train",
        choices=["train", "val", "test"],
        help="Split da visualizzare",
    )
    parser.add_argument(
        "--num-images",
        type=int,
        default=12,
        help="Numero di immagini da mostrare nella preview",
    )
    parser.add_argument(
        "--stats-only",
        action="store_true",
        help="Mostra solo statistiche senza preview",
    )
    parser.add_argument(
        "--save",
        type=str,
        default=None,
        help="Salva le visualizzazioni in questa directory",
    )
    args = parser.parse_args()

    config = load_config()

    if args.dataset_dir:
        dataset_dir = Path(args.dataset_dir)
    else:
        dataset_dir = ROOT / config["paths"]["processed_dataset"]

    if not dataset_dir.exists():
        console.print(f"[red]Dataset non trovato: {dataset_dir}[/red]")
        console.print("[dim]Esegui prima prepare_dataset.py[/dim]")
        sys.exit(1)

    # Statistiche (sempre)
    print_statistics(dataset_dir)

    if not args.stats_only:
        save_dir = Path(args.save) if args.save else None

        preview_annotations(
            dataset_dir,
            split=args.split,
            num_images=args.num_images,
            save_path=save_dir / "preview.png" if save_dir else None,
        )

        plot_bbox_distribution(
            dataset_dir,
            save_path=save_dir / "bbox_distribution.png" if save_dir else None,
        )
