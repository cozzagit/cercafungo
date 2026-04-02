"""
CercaFungo — Tool di annotazione manuale per foto raccolte in campo.

Apre le immagini una alla volta con OpenCV, permette di disegnare
bounding box con il mouse e salva annotazioni in formato YOLO.

Controlli:
    Mouse click+drag  ->  Disegna bounding box
    n                 ->  Prossima immagine
    p                 ->  Immagine precedente
    u                 ->  Annulla ultima bbox
    s                 ->  Salva annotazioni correnti
    1-9, 0            ->  Seleziona classe (0=fungo per detection)
    c                 ->  Mostra classi disponibili
    d                 ->  Elimina TUTTE le bbox dell'immagine corrente
    q                 ->  Salva e esci

Formato output: YOLO (class_id cx cy w h) normalizzato 0-1.
Progresso salvato automaticamente: riparte da dove ti eri fermato.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()
ROOT = Path(__file__).resolve().parent.parent

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Stato globale per callback mouse OpenCV
_mouse_state: Dict[str, Any] = {
    "drawing": False,
    "start_x": 0,
    "start_y": 0,
    "end_x": 0,
    "end_y": 0,
    "new_bbox": None,
}


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_class_names(config: Dict[str, Any]) -> List[str]:
    """
    Restituisce la lista dei nomi classi dal config.
    Per il detector: ['fungo']
    Per il classificatore: lista specie.
    """
    # Per detection usiamo la classe singola "fungo"
    detector_classes = config.get("detector", {}).get("classes", ["fungo"])
    return detector_classes


def mouse_callback(event: int, x: int, y: int, flags: int, param: Any) -> None:
    """Callback per eventi del mouse in OpenCV."""
    global _mouse_state

    if event == cv2.EVENT_LBUTTONDOWN:
        _mouse_state["drawing"] = True
        _mouse_state["start_x"] = x
        _mouse_state["start_y"] = y
        _mouse_state["end_x"] = x
        _mouse_state["end_y"] = y
        _mouse_state["new_bbox"] = None

    elif event == cv2.EVENT_MOUSEMOVE:
        if _mouse_state["drawing"]:
            _mouse_state["end_x"] = x
            _mouse_state["end_y"] = y

    elif event == cv2.EVENT_LBUTTONUP:
        _mouse_state["drawing"] = False
        _mouse_state["end_x"] = x
        _mouse_state["end_y"] = y

        # Calcola bbox solo se ha dimensioni minime (evita click accidentali)
        w = abs(_mouse_state["end_x"] - _mouse_state["start_x"])
        h = abs(_mouse_state["end_y"] - _mouse_state["start_y"])
        if w > 5 and h > 5:
            x1 = min(_mouse_state["start_x"], _mouse_state["end_x"])
            y1 = min(_mouse_state["start_y"], _mouse_state["end_y"])
            x2 = max(_mouse_state["start_x"], _mouse_state["end_x"])
            y2 = max(_mouse_state["start_y"], _mouse_state["end_y"])
            _mouse_state["new_bbox"] = (x1, y1, x2, y2)


def pixel_to_yolo(
    x1: int, y1: int, x2: int, y2: int, img_w: int, img_h: int
) -> Tuple[float, float, float, float]:
    """Converte coordinate pixel in formato YOLO normalizzato."""
    cx = ((x1 + x2) / 2.0) / img_w
    cy = ((y1 + y2) / 2.0) / img_h
    w = (x2 - x1) / img_w
    h = (y2 - y1) / img_h
    return cx, cy, w, h


def yolo_to_pixel(
    cx: float, cy: float, w: float, h: float, img_w: int, img_h: int
) -> Tuple[int, int, int, int]:
    """Converte coordinate YOLO in pixel."""
    x1 = int((cx - w / 2) * img_w)
    y1 = int((cy - h / 2) * img_h)
    x2 = int((cx + w / 2) * img_w)
    y2 = int((cy + h / 2) * img_h)
    return x1, y1, x2, y2


def load_existing_annotations(label_path: Path) -> List[Tuple[int, float, float, float, float]]:
    """Carica annotazioni YOLO esistenti da file."""
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
                try:
                    cls_id = int(parts[0])
                    cx, cy, w, h = (
                        float(parts[1]),
                        float(parts[2]),
                        float(parts[3]),
                        float(parts[4]),
                    )
                    annotations.append((cls_id, cx, cy, w, h))
                except ValueError:
                    continue
    return annotations


def save_annotations(
    label_path: Path,
    annotations: List[Tuple[int, float, float, float, float]],
) -> None:
    """Salva annotazioni in formato YOLO."""
    label_path.parent.mkdir(parents=True, exist_ok=True)
    with open(label_path, "w") as f:
        for cls_id, cx, cy, w, h in annotations:
            f.write(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")


def load_progress(progress_file: Path) -> int:
    """Carica l'indice dell'ultima immagine annotata."""
    if progress_file.exists():
        try:
            data = json.loads(progress_file.read_text())
            return data.get("last_index", 0)
        except (json.JSONDecodeError, KeyError):
            pass
    return 0


def save_progress(progress_file: Path, index: int, total: int) -> None:
    """Salva il progresso corrente."""
    progress_file.parent.mkdir(parents=True, exist_ok=True)
    data = {"last_index": index, "total_images": total}
    progress_file.write_text(json.dumps(data, indent=2))


def draw_annotations(
    image: np.ndarray,
    annotations: List[Tuple[int, float, float, float, float]],
    class_names: List[str],
    current_class: int,
    img_index: int,
    total_images: int,
) -> np.ndarray:
    """Disegna tutte le bbox e le info sull'immagine."""
    display = image.copy()
    img_h, img_w = display.shape[:2]

    # Disegna bbox esistenti
    colors = [
        (0, 255, 0),    # Verde
        (255, 100, 0),  # Arancione
        (0, 100, 255),  # Rosso
        (255, 255, 0),  # Ciano
        (0, 255, 255),  # Giallo
        (255, 0, 255),  # Magenta
    ]

    for idx, (cls_id, cx, cy, w, h) in enumerate(annotations):
        x1, y1, x2, y2 = yolo_to_pixel(cx, cy, w, h, img_w, img_h)
        color = colors[cls_id % len(colors)]
        cv2.rectangle(display, (x1, y1), (x2, y2), color, 2)

        # Label
        cls_name = class_names[cls_id] if cls_id < len(class_names) else f"cls_{cls_id}"
        label = f"[{idx}] {cls_name}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(
            display,
            (x1, y1 - label_size[1] - 6),
            (x1 + label_size[0] + 4, y1),
            color,
            -1,
        )
        cv2.putText(
            display, label, (x1 + 2, y1 - 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
        )

    # Disegna bbox in corso di creazione
    if _mouse_state["drawing"]:
        cv2.rectangle(
            display,
            (_mouse_state["start_x"], _mouse_state["start_y"]),
            (_mouse_state["end_x"], _mouse_state["end_y"]),
            (0, 200, 255),
            2,
        )

    # HUD in alto
    hud_h = 40
    cv2.rectangle(display, (0, 0), (img_w, hud_h), (40, 40, 40), -1)

    cls_name = class_names[current_class] if current_class < len(class_names) else f"cls_{current_class}"
    hud_text = (
        f"Img {img_index + 1}/{total_images} | "
        f"Classe: [{current_class}] {cls_name} | "
        f"BBox: {len(annotations)} | "
        f"n/p=nav u=undo s=save q=quit"
    )
    cv2.putText(
        display, hud_text, (10, 28),
        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 255, 200), 1,
    )

    return display


def annotate_images(
    images_dir: Optional[Path] = None,
    labels_dir: Optional[Path] = None,
    config: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Apre lo strumento di annotazione manuale.

    Args:
        images_dir: Cartella con le immagini da annotare
        labels_dir: Cartella dove salvare le annotazioni YOLO
        config: Configurazione (da config.yaml)
    """
    if config is None:
        config = load_config()

    ann_config = config.get("annotation", {})
    class_names = get_class_names(config)

    # Directory immagini
    if images_dir is None:
        images_dir = ROOT / config["paths"]["manual_photos"]
    if labels_dir is None:
        labels_dir = ROOT / config["paths"].get("annotations", "./data/annotations")

    if not images_dir.exists():
        console.print(
            f"[red]Directory immagini non trovata: {images_dir}[/red]\n"
            f"[yellow]Crea la cartella e aggiungi le foto da annotare.[/yellow]"
        )
        sys.exit(1)

    # Trova tutte le immagini
    image_files = sorted(
        f for f in images_dir.rglob("*")
        if f.suffix.lower() in IMAGE_EXTENSIONS and not f.name.startswith(".")
    )

    if not image_files:
        console.print(f"[red]Nessuna immagine trovata in {images_dir}[/red]")
        sys.exit(1)

    labels_dir.mkdir(parents=True, exist_ok=True)

    # Progresso
    progress_file = labels_dir / ".annotation_progress.json"
    start_index = load_progress(progress_file)

    # Info iniziale
    annotated_count = sum(
        1
        for img in image_files
        if (labels_dir / f"{img.stem}.txt").exists()
    )

    console.print(
        Panel(
            f"[bold green]Annotazione Manuale[/bold green]\n\n"
            f"Immagini: {len(image_files)}\n"
            f"Gia' annotate: {annotated_count}\n"
            f"Classi: {', '.join(class_names)}\n"
            f"Riparto da: immagine {start_index + 1}\n"
            f"Immagini: {images_dir}\n"
            f"Labels: {labels_dir}\n\n"
            f"[bold]Controlli:[/bold]\n"
            f"  Mouse drag = disegna bbox\n"
            f"  n = prossima, p = precedente\n"
            f"  u = annulla ultima bbox, d = cancella tutte\n"
            f"  0-9 = seleziona classe\n"
            f"  s = salva, q = salva e esci",
            title="CercaFungo - Annotation Tool",
        )
    )

    # Setup finestra OpenCV
    window_name = "CercaFungo - Annotazione"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    win_w = ann_config.get("window_width", 1280)
    win_h = ann_config.get("window_height", 960)
    cv2.resizeWindow(window_name, win_w, win_h)
    cv2.setMouseCallback(window_name, mouse_callback)

    current_index = min(start_index, len(image_files) - 1)
    current_class = ann_config.get("default_class", 0)
    current_annotations: List[Tuple[int, float, float, float, float]] = []
    unsaved_changes = False

    # Carica annotazioni per l'immagine corrente
    def load_current() -> None:
        nonlocal current_annotations
        img_path = image_files[current_index]
        label_path = labels_dir / f"{img_path.stem}.txt"
        current_annotations = load_existing_annotations(label_path)

    def save_current() -> None:
        nonlocal unsaved_changes
        img_path = image_files[current_index]
        label_path = labels_dir / f"{img_path.stem}.txt"
        save_annotations(label_path, current_annotations)
        save_progress(progress_file, current_index, len(image_files))
        unsaved_changes = False

    load_current()

    while True:
        # Carica e mostra immagine
        img_path = image_files[current_index]
        image = cv2.imread(str(img_path))

        if image is None:
            console.print(f"[red]Impossibile caricare: {img_path}[/red]")
            current_index = min(current_index + 1, len(image_files) - 1)
            load_current()
            continue

        # Controlla se c'e' una nuova bbox dal mouse
        if _mouse_state["new_bbox"] is not None:
            x1, y1, x2, y2 = _mouse_state["new_bbox"]
            _mouse_state["new_bbox"] = None

            img_h, img_w = image.shape[:2]
            # Clamp alle dimensioni dell'immagine originale
            # (la finestra potrebbe essere ridimensionata)
            scale_x = img_w / win_w if win_w > 0 else 1
            scale_y = img_h / win_h if win_h > 0 else 1

            # Le coordinate mouse sono relative alla finestra ridimensionata,
            # ma OpenCV WINDOW_NORMAL gestisce internamente lo scaling
            cx, cy, w, h = pixel_to_yolo(x1, y1, x2, y2, img_w, img_h)

            # Valida: valori devono essere in [0, 1]
            cx = max(0.0, min(1.0, cx))
            cy = max(0.0, min(1.0, cy))
            w = max(0.001, min(1.0, w))
            h = max(0.001, min(1.0, h))

            current_annotations.append((current_class, cx, cy, w, h))
            unsaved_changes = True

        # Disegna annotazioni sull'immagine
        display = draw_annotations(
            image, current_annotations, class_names,
            current_class, current_index, len(image_files),
        )

        # Indicatore modifiche non salvate
        if unsaved_changes:
            cv2.circle(display, (display.shape[1] - 20, 20), 8, (0, 0, 255), -1)

        cv2.imshow(window_name, display)
        key = cv2.waitKey(30) & 0xFF

        if key == ord("q"):
            # Salva e esci
            if unsaved_changes:
                save_current()
            break

        elif key == ord("n"):
            # Prossima immagine
            if unsaved_changes:
                save_current()
            if current_index < len(image_files) - 1:
                current_index += 1
                load_current()
                unsaved_changes = False

        elif key == ord("p"):
            # Immagine precedente
            if unsaved_changes:
                save_current()
            if current_index > 0:
                current_index -= 1
                load_current()
                unsaved_changes = False

        elif key == ord("u"):
            # Annulla ultima bbox
            if current_annotations:
                current_annotations.pop()
                unsaved_changes = True

        elif key == ord("s"):
            # Salva esplicitamente
            save_current()
            console.print(
                f"  [green]Salvato: {image_files[current_index].stem} "
                f"({len(current_annotations)} bbox)[/green]"
            )

        elif key == ord("d"):
            # Elimina tutte le bbox
            current_annotations.clear()
            unsaved_changes = True

        elif key == ord("c"):
            # Mostra classi
            console.print("\n[bold]Classi disponibili:[/bold]")
            for i, name in enumerate(class_names):
                marker = " <--" if i == current_class else ""
                console.print(f"  [{i}] {name}{marker}")
            console.print()

        elif ord("0") <= key <= ord("9"):
            # Selezione classe
            new_class = key - ord("0")
            if new_class < len(class_names):
                current_class = new_class
                cls_name = class_names[current_class]
                console.print(f"  [cyan]Classe selezionata: [{current_class}] {cls_name}[/cyan]")

    cv2.destroyAllWindows()

    # Statistiche finali
    annotated_final = sum(
        1
        for img in image_files
        if (labels_dir / f"{img.stem}.txt").exists()
    )
    console.print(
        f"\n[bold green]Sessione terminata.[/bold green]\n"
        f"  Immagini annotate: {annotated_final}/{len(image_files)}\n"
        f"  Ultimo indice: {current_index + 1}"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Tool annotazione manuale"
    )
    parser.add_argument(
        "--images",
        type=str,
        default=None,
        help="Directory con immagini da annotare",
    )
    parser.add_argument(
        "--labels",
        type=str,
        default=None,
        help="Directory dove salvare le annotazioni YOLO",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=None,
        help="Indice di partenza (override progress salvato)",
    )
    args = parser.parse_args()

    config = load_config()

    images_dir = Path(args.images) if args.images else None
    labels_dir = Path(args.labels) if args.labels else None

    # Override indice di partenza
    if args.start is not None and labels_dir:
        progress_file = (labels_dir or ROOT / "data" / "annotations") / ".annotation_progress.json"
        save_progress(progress_file, args.start, 0)

    annotate_images(
        images_dir=images_dir,
        labels_dir=labels_dir,
        config=config,
    )
