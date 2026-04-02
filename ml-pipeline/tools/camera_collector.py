"""
CercaFungo — Tool per raccogliere foto di training con webcam/fotocamera.

Apre il feed della fotocamera, premi 'c' per catturare un frame.
Le foto vengono salvate con timestamp automatico e metadati GPS
se disponibili (utile quando si usa il telefono come webcam).

Controlli:
    c  ->  Cattura frame corrente
    z  ->  Zoom toggle (2x crop centrale)
    f  ->  Flip orizzontale
    g  ->  Griglia guida on/off
    i  ->  Mostra info/statistiche
    q  ->  Esci

Le foto catturate vanno nella cartella data/raw/manual/
e poi si annotano con annotate_manual.py.
"""

import json
import sys
import time
from datetime import datetime
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


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_session_dir(base_dir: Path, prefix: str = "cercafungo") -> Path:
    """Crea una directory per la sessione di raccolta corrente."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_dir = base_dir / f"{prefix}_{timestamp}"
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def draw_grid(
    image: np.ndarray,
    rows: int = 3,
    cols: int = 3,
    color: Tuple[int, int, int] = (100, 100, 100),
) -> np.ndarray:
    """Disegna una griglia sulla preview (regola dei terzi)."""
    display = image.copy()
    h, w = display.shape[:2]

    for i in range(1, cols):
        x = int(w * i / cols)
        cv2.line(display, (x, 0), (x, h), color, 1)

    for i in range(1, rows):
        y = int(h * i / rows)
        cv2.line(display, (0, y), (w, y), color, 1)

    return display


def draw_hud(
    image: np.ndarray,
    capture_count: int,
    zoom_active: bool,
    grid_active: bool,
    session_dir: Path,
) -> np.ndarray:
    """Disegna le informazioni sullo schermo."""
    display = image.copy()
    h, w = display.shape[:2]

    # Barra in basso
    bar_h = 50
    cv2.rectangle(display, (0, h - bar_h), (w, h), (30, 30, 30), -1)

    # Testo info
    status_parts = [
        f"Foto: {capture_count}",
        f"Zoom: {'ON' if zoom_active else 'off'}",
        f"Griglia: {'ON' if grid_active else 'off'}",
    ]
    status_text = " | ".join(status_parts)
    cv2.putText(
        display,
        status_text,
        (10, h - 15),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (200, 255, 200),
        1,
    )

    # Comandi
    cmd_text = "[c] cattura  [z] zoom  [g] griglia  [f] flip  [q] esci"
    cv2.putText(
        display,
        cmd_text,
        (w - 500, h - 15),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (180, 180, 180),
        1,
    )

    return display


def apply_zoom(image: np.ndarray, factor: float = 2.0) -> np.ndarray:
    """Applica zoom sulla parte centrale dell'immagine."""
    h, w = image.shape[:2]
    crop_h = int(h / factor)
    crop_w = int(w / factor)
    y1 = (h - crop_h) // 2
    x1 = (w - crop_w) // 2

    cropped = image[y1 : y1 + crop_h, x1 : x1 + crop_w]
    return cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)


def save_capture(
    frame: np.ndarray,
    session_dir: Path,
    capture_index: int,
    prefix: str = "cercafungo",
    jpeg_quality: int = 95,
) -> Path:
    """
    Salva un frame catturato con nome automatico.

    Returns:
        Path al file salvato.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    filename = f"{prefix}_{timestamp}_{capture_index:04d}.jpg"
    filepath = session_dir / filename

    cv2.imwrite(str(filepath), frame, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
    return filepath


def try_get_gps_from_exif(filepath: Path) -> Optional[Dict[str, float]]:
    """
    Tenta di leggere coordinate GPS dai metadati EXIF.
    Utile quando la foto proviene da un telefono con GPS.
    """
    try:
        from PIL import Image
        from PIL.ExifTags import GPSTAGS, TAGS

        img = Image.open(str(filepath))
        exif_data = img._getexif()

        if exif_data is None:
            return None

        gps_info = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            if tag_name == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag_name = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag_name] = gps_value

        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            def dms_to_decimal(dms: tuple, ref: str) -> float:
                degrees = float(dms[0])
                minutes = float(dms[1])
                seconds = float(dms[2])
                decimal = degrees + minutes / 60 + seconds / 3600
                if ref in ["S", "W"]:
                    decimal = -decimal
                return decimal

            lat = dms_to_decimal(
                gps_info["GPSLatitude"],
                gps_info.get("GPSLatitudeRef", "N"),
            )
            lon = dms_to_decimal(
                gps_info["GPSLongitude"],
                gps_info.get("GPSLongitudeRef", "E"),
            )
            return {"latitude": lat, "longitude": lon}

    except (ImportError, AttributeError, KeyError, Exception):
        pass

    return None


def run_camera_collector(
    output_dir: Optional[Path] = None,
    camera_id: int = 0,
    config: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Avvia la sessione di raccolta foto con la fotocamera.

    Args:
        output_dir: Directory dove salvare le foto
        camera_id: ID della fotocamera (0=default)
        config: Configurazione
    """
    if config is None:
        config = load_config()

    cam_config = config.get("camera", {})
    prefix = cam_config.get("auto_prefix", "cercafungo")
    jpeg_quality = cam_config.get("jpeg_quality", 95)
    save_gps = cam_config.get("save_gps", True)
    resolution = cam_config.get("default_resolution", [1280, 720])

    if output_dir is None:
        output_dir = ROOT / config["paths"].get("manual_photos", "./data/raw/manual")

    session_dir = get_session_dir(output_dir, prefix)

    console.print(
        Panel(
            f"[bold green]Camera Collector[/bold green]\n\n"
            f"Camera: {camera_id}\n"
            f"Risoluzione: {resolution[0]}x{resolution[1]}\n"
            f"Qualita' JPEG: {jpeg_quality}\n"
            f"GPS: {'attivo' if save_gps else 'disattivo'}\n"
            f"Sessione: {session_dir}\n\n"
            f"[bold]Controlli:[/bold]\n"
            f"  c = cattura foto\n"
            f"  z = zoom 2x\n"
            f"  g = griglia guida\n"
            f"  f = flip orizzontale\n"
            f"  i = info sessione\n"
            f"  q = esci",
            title="CercaFungo - Camera Collector",
        )
    )

    # Apri fotocamera
    cap = cv2.VideoCapture(camera_id)
    if not cap.isOpened():
        console.print(
            f"[red]Impossibile aprire la fotocamera (id={camera_id})[/red]\n"
            "[yellow]Verifica che la fotocamera sia collegata e non in uso da altre app.\n"
            "Prova camera_id diversi: --camera 0, --camera 1, etc.[/yellow]"
        )
        sys.exit(1)

    # Imposta risoluzione
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, resolution[0])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, resolution[1])

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    console.print(
        f"  [dim]Risoluzione effettiva: {actual_w}x{actual_h}[/dim]"
    )

    # Stato
    capture_count = 0
    zoom_active = False
    grid_active = False
    flip_active = False
    captures_metadata: List[Dict[str, Any]] = []

    window_name = "CercaFungo - Camera"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    console.print("[bold]Camera attiva. Premi 'c' per catturare, 'q' per uscire.[/bold]\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            console.print("[red]Errore lettura frame dalla fotocamera[/red]")
            break

        # Trasformazioni preview
        display = frame.copy()

        if flip_active:
            display = cv2.flip(display, 1)

        if zoom_active:
            display = apply_zoom(display, 2.0)

        if grid_active:
            display = draw_grid(display)

        # HUD
        display = draw_hud(
            display, capture_count, zoom_active, grid_active, session_dir
        )

        cv2.imshow(window_name, display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break

        elif key == ord("c"):
            # Cattura il frame ORIGINALE (non la preview con zoom/grid)
            capture_frame = frame.copy()
            if flip_active:
                capture_frame = cv2.flip(capture_frame, 1)

            filepath = save_capture(
                capture_frame, session_dir, capture_count, prefix, jpeg_quality
            )
            capture_count += 1

            # Feedback visivo: flash bianco rapido
            flash = np.ones_like(display) * 255
            cv2.imshow(window_name, flash.astype(np.uint8))
            cv2.waitKey(100)

            # Metadati
            meta: Dict[str, Any] = {
                "filename": filepath.name,
                "timestamp": datetime.now().isoformat(),
                "resolution": [capture_frame.shape[1], capture_frame.shape[0]],
                "session": session_dir.name,
            }

            # GPS (se disponibile)
            if save_gps:
                gps = try_get_gps_from_exif(filepath)
                if gps:
                    meta["gps"] = gps

            captures_metadata.append(meta)

            console.print(
                f"  [green]Cattura #{capture_count}: {filepath.name}[/green]"
            )

        elif key == ord("z"):
            zoom_active = not zoom_active

        elif key == ord("g"):
            grid_active = not grid_active

        elif key == ord("f"):
            flip_active = not flip_active

        elif key == ord("i"):
            # Info sessione
            console.print(
                f"\n  [bold]Sessione: {session_dir.name}[/bold]\n"
                f"  Foto catturate: {capture_count}\n"
                f"  Directory: {session_dir}\n"
            )

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

    # Salva metadati sessione
    if captures_metadata:
        meta_path = session_dir / "session_metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "session": session_dir.name,
                    "total_captures": capture_count,
                    "camera_id": camera_id,
                    "resolution": [actual_w, actual_h],
                    "captures": captures_metadata,
                },
                f,
                indent=2,
                ensure_ascii=False,
            )

    # Riassunto finale
    console.print(
        Panel(
            f"[bold green]Sessione terminata[/bold green]\n\n"
            f"Foto catturate: {capture_count}\n"
            f"Directory: {session_dir}\n\n"
            f"[dim]Prossimo passo: annota le foto con\n"
            f"  python -m tools.annotate_manual --images {session_dir}[/dim]",
            title="CercaFungo - Sessione Completata",
        )
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Raccolta foto di training con fotocamera"
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=0,
        help="ID della fotocamera (default: 0)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Directory di output per le foto",
    )
    parser.add_argument(
        "--resolution",
        type=int,
        nargs=2,
        default=None,
        metavar=("WIDTH", "HEIGHT"),
        help="Risoluzione fotocamera (es. --resolution 1920 1080)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=None,
        help="Qualita' JPEG (1-100, default: 95)",
    )
    args = parser.parse_args()

    config = load_config()

    if args.resolution:
        config.setdefault("camera", {})["default_resolution"] = args.resolution
    if args.quality:
        config.setdefault("camera", {})["jpeg_quality"] = args.quality

    output = Path(args.output) if args.output else None
    run_camera_collector(
        output_dir=output,
        camera_id=args.camera,
        config=config,
    )
