"""
CercaFungo — Generatore di dati sintetici per training detector.

Compone immagini di funghi ritagliati su sfondi di sottobosco,
generando automaticamente le annotazioni YOLO.

Approccio:
1. Carica sfondi di foresta/sottobosco
2. Carica funghi ritagliati (con maschera alfa o segmentati)
3. Posiziona 1-4 funghi per sfondo a scale diverse
4. Applica augmentation realistiche (ombre, luce, blur)
5. Salva immagine + label YOLO
"""

import glob
import random
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import yaml
from PIL import Image, ImageDraw, ImageFilter
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TextColumn,
    TimeRemainingColumn,
)
from rich.table import Table

console = Console()
ROOT = Path(__file__).resolve().parent.parent


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_background_images(backgrounds_dir: Path, max_count: int = 500) -> List[np.ndarray]:
    """
    Carica immagini di sfondo (sottobosco/foresta).
    Le immagini vanno scaricate manualmente o con script separato
    e messe nella cartella data/backgrounds/.
    """
    extensions = ["*.jpg", "*.jpeg", "*.png", "*.bmp", "*.webp"]
    files: List[Path] = []
    for ext in extensions:
        files.extend(backgrounds_dir.glob(ext))

    if not files:
        console.print(
            f"[red]Nessun sfondo trovato in {backgrounds_dir}[/red]\n"
            "[yellow]Scarica immagini di sottobosco/foresta e mettile in data/backgrounds/[/yellow]\n"
            "[dim]Consiglio: cerca 'forest floor', 'sottobosco', 'leaf litter' su Unsplash/Pexels[/dim]"
        )
        return []

    # Limita il numero e mescola
    random.shuffle(files)
    files = files[:max_count]

    backgrounds: List[np.ndarray] = []
    for f in files:
        img = cv2.imread(str(f))
        if img is not None and img.shape[0] >= 320 and img.shape[1] >= 320:
            backgrounds.append(img)

    console.print(f"  [green]Caricati {len(backgrounds)} sfondi[/green]")
    return backgrounds


def load_mushroom_cutouts(cutouts_dir: Path) -> List[Tuple[np.ndarray, np.ndarray]]:
    """
    Carica funghi ritagliati con maschera alfa.
    Supporta immagini PNG con trasparenza o coppie immagine+maschera.

    Returns:
        Lista di (immagine_bgr, maschera_alpha) dove maschera e' 0-255 single channel.
    """
    cutouts: List[Tuple[np.ndarray, np.ndarray]] = []

    # Cerca PNG con canale alfa
    png_files = list(cutouts_dir.glob("**/*.png"))
    for f in png_files:
        img = cv2.imread(str(f), cv2.IMREAD_UNCHANGED)
        if img is None:
            continue

        if img.shape[2] == 4:
            # Ha canale alfa
            bgr = img[:, :, :3]
            alpha = img[:, :, 3]
            if alpha.sum() > 0:  # Scarta immagini completamente trasparenti
                cutouts.append((bgr, alpha))
        else:
            # Senza alfa — crea maschera con color keying (sfondo bianco/nero)
            mask = _create_mask_from_image(img)
            if mask is not None:
                cutouts.append((img, mask))

    # Cerca anche JPG con maschera separata (nome_mask.png)
    jpg_files = list(cutouts_dir.glob("**/*.jpg")) + list(cutouts_dir.glob("**/*.jpeg"))
    for f in jpg_files:
        mask_path = f.with_name(f.stem + "_mask.png")
        if mask_path.exists():
            img = cv2.imread(str(f))
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
            if img is not None and mask is not None:
                cutouts.append((img, mask))
        else:
            # Prova a creare maschera automatica
            img = cv2.imread(str(f))
            if img is not None:
                mask = _create_mask_from_image(img)
                if mask is not None:
                    cutouts.append((img, mask))

    console.print(f"  [green]Caricati {len(cutouts)} ritagli di funghi[/green]")
    return cutouts


def _create_mask_from_image(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Crea una maschera approssimativa usando GrabCut.
    Utile quando non si ha il canale alfa.
    Assume che il fungo sia al centro dell'immagine.
    """
    h, w = image.shape[:2]

    # Margine per il rettangolo iniziale di GrabCut
    margin_x = max(10, w // 8)
    margin_y = max(10, h // 8)
    rect = (margin_x, margin_y, w - margin_x * 2, h - margin_y * 2)

    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(
            image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT
        )
    except cv2.error:
        return None

    # 0 e 2 sono background, 1 e 3 sono foreground
    output_mask = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)

    # Se la maschera e' troppo piccola, probabilmente GrabCut ha fallito
    if output_mask.sum() < (h * w * 255 * 0.05):  # Meno del 5% dell'immagine
        return None

    # Sfuma leggermente i bordi per un compositing migliore
    output_mask = cv2.GaussianBlur(output_mask, (5, 5), 0)

    return output_mask


def composite_mushroom(
    background: np.ndarray,
    mushroom_bgr: np.ndarray,
    mushroom_alpha: np.ndarray,
    position: Tuple[int, int],
    scale: float,
    apply_color_match: bool = True,
    apply_shadow: bool = True,
) -> Tuple[np.ndarray, Tuple[float, float, float, float]]:
    """
    Compone un fungo sullo sfondo nella posizione e scala specificata.

    Returns:
        (immagine_composita, bbox_yolo) dove bbox_yolo e' (cx, cy, w, h) normalizzato.
    """
    bg_h, bg_w = background.shape[:2]
    result = background.copy()

    # Ridimensiona il fungo
    mh, mw = mushroom_bgr.shape[:2]
    new_w = max(1, int(mw * scale))
    new_h = max(1, int(mh * scale))
    resized_bgr = cv2.resize(mushroom_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    resized_alpha = cv2.resize(mushroom_alpha, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Color matching: adatta i colori del fungo allo sfondo circostante
    if apply_color_match:
        x, y = position
        # Campiona regione dello sfondo intorno alla posizione
        sample_x1 = max(0, x - new_w // 2)
        sample_y1 = max(0, y - new_h // 2)
        sample_x2 = min(bg_w, x + new_w + new_w // 2)
        sample_y2 = min(bg_h, y + new_h + new_h // 2)
        bg_sample = background[sample_y1:sample_y2, sample_x1:sample_x2]

        if bg_sample.size > 0:
            from utils.augmentations import match_color_histogram
            resized_bgr = match_color_histogram(resized_bgr, bg_sample, strength=0.3)

    # Posizione finale (evita overflow)
    x, y = position
    x = max(0, min(x, bg_w - new_w))
    y = max(0, min(y, bg_h - new_h))

    # Ombra a terra sotto il fungo
    if apply_shadow:
        shadow_offset_y = int(new_h * 0.05)
        shadow_alpha = cv2.GaussianBlur(
            resized_alpha, (21, 21), 0
        ).astype(np.float32) / 255.0 * 0.3

        sy1 = y + shadow_offset_y
        sy2 = sy1 + new_h
        sx1 = x
        sx2 = x + new_w

        # Clamp
        sy1c, sy2c = max(0, sy1), min(bg_h, sy2)
        sx1c, sx2c = max(0, sx1), min(bg_w, sx2)

        if sy2c > sy1c and sx2c > sx1c:
            crop_y1 = sy1c - sy1
            crop_y2 = sy2c - sy1
            crop_x1 = sx1c - sx1
            crop_x2 = sx2c - sx1

            shadow_region = result[sy1c:sy2c, sx1c:sx2c].astype(np.float32)
            shadow_mask = shadow_alpha[crop_y1:crop_y2, crop_x1:crop_x2]
            shadow_region *= (1.0 - shadow_mask[..., np.newaxis])
            result[sy1c:sy2c, sx1c:sx2c] = shadow_region.astype(np.uint8)

    # Compositing alfa
    alpha_float = resized_alpha.astype(np.float32) / 255.0

    y1, y2 = y, y + new_h
    x1, x2 = x, x + new_w

    # Clamp
    y1c, y2c = max(0, y1), min(bg_h, y2)
    x1c, x2c = max(0, x1), min(bg_w, x2)

    if y2c <= y1c or x2c <= x1c:
        # Fungo completamente fuori dall'immagine
        return result, (0, 0, 0, 0)

    crop_y1 = y1c - y1
    crop_y2 = y2c - y1
    crop_x1 = x1c - x1
    crop_x2 = x2c - x1

    fg = resized_bgr[crop_y1:crop_y2, crop_x1:crop_x2].astype(np.float32)
    bg = result[y1c:y2c, x1c:x2c].astype(np.float32)
    alpha_crop = alpha_float[crop_y1:crop_y2, crop_x1:crop_x2][..., np.newaxis]

    blended = fg * alpha_crop + bg * (1.0 - alpha_crop)
    result[y1c:y2c, x1c:x2c] = blended.astype(np.uint8)

    # Calcola bbox YOLO (normalizzato 0-1)
    # Il bbox copre solo la parte visibile del fungo
    # Usa la maschera alfa per bbox piu' precisa
    alpha_visible = resized_alpha[crop_y1:crop_y2, crop_x1:crop_x2]
    rows_with_content = np.any(alpha_visible > 30, axis=1)
    cols_with_content = np.any(alpha_visible > 30, axis=0)

    if not rows_with_content.any() or not cols_with_content.any():
        return result, (0, 0, 0, 0)

    row_indices = np.where(rows_with_content)[0]
    col_indices = np.where(cols_with_content)[0]

    bbox_y1 = y1c + row_indices[0]
    bbox_y2 = y1c + row_indices[-1]
    bbox_x1 = x1c + col_indices[0]
    bbox_x2 = x1c + col_indices[-1]

    # Formato YOLO: cx, cy, w, h normalizzati
    cx = ((bbox_x1 + bbox_x2) / 2.0) / bg_w
    cy = ((bbox_y1 + bbox_y2) / 2.0) / bg_h
    bw = (bbox_x2 - bbox_x1) / bg_w
    bh = (bbox_y2 - bbox_y1) / bg_h

    return result, (cx, cy, bw, bh)


def apply_occlusion(
    image: np.ndarray,
    bbox: Tuple[float, float, float, float],
    img_h: int,
    img_w: int,
    max_occlusion: float = 0.4,
) -> np.ndarray:
    """
    Simula occlusione parziale (foglie, erba, rametti davanti al fungo).
    Disegna forme organiche semi-trasparenti sopra la bbox.
    """
    result = image.copy()
    cx, cy, bw, bh = bbox

    # Converti da YOLO a pixel
    x1 = int((cx - bw / 2) * img_w)
    y1 = int((cy - bh / 2) * img_h)
    x2 = int((cx + bw / 2) * img_w)
    y2 = int((cy + bh / 2) * img_h)

    bbox_w = x2 - x1
    bbox_h = y2 - y1

    if bbox_w < 10 or bbox_h < 10:
        return result

    # Quanta area occludere
    occlusion_ratio = random.uniform(0.1, max_occlusion)

    # Genera 2-5 "foglie" che coprono parzialmente
    num_leaves = random.randint(2, 5)
    pil_img = Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
    overlay = Image.new("RGBA", pil_img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for _ in range(num_leaves):
        # Colori tipici di foglie/erba (verdi, marroni, gialli)
        leaf_colors = [
            (34, 85, 34),    # Verde scuro
            (60, 120, 40),   # Verde medio
            (85, 107, 47),   # Oliva
            (139, 90, 43),   # Marrone
            (160, 140, 60),  # Giallo foglia
        ]
        color = random.choice(leaf_colors)
        alpha = random.randint(160, 230)

        # Posizione della "foglia" — preferibilmente sui bordi della bbox
        leaf_w = int(bbox_w * random.uniform(0.2, 0.5))
        leaf_h = int(bbox_h * random.uniform(0.15, 0.4))

        # Posiziona principalmente dai lati o dal basso
        side = random.choice(["left", "right", "bottom", "top"])
        if side == "left":
            lx = x1 - leaf_w // 2
            ly = random.randint(y1, y2 - leaf_h)
        elif side == "right":
            lx = x2 - leaf_w // 2
            ly = random.randint(y1, y2 - leaf_h)
        elif side == "bottom":
            lx = random.randint(x1, x2 - leaf_w)
            ly = y2 - leaf_h // 2
        else:
            lx = random.randint(x1, x2 - leaf_w)
            ly = y1 - leaf_h // 2

        # Disegna forma ellittica (foglia)
        draw.ellipse(
            [lx, ly, lx + leaf_w, ly + leaf_h],
            fill=(*color, alpha),
        )

    # Composita l'overlay
    pil_img = pil_img.convert("RGBA")
    pil_img = Image.alpha_composite(pil_img, overlay)
    result = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)

    return result


def generate_synthetic_dataset(
    config: Optional[Dict[str, Any]] = None,
    output_dir: Optional[Path] = None,
    backgrounds_dir: Optional[Path] = None,
    cutouts_dir: Optional[Path] = None,
) -> int:
    """
    Genera il dataset sintetico completo.

    Returns:
        Numero di immagini generate.
    """
    if config is None:
        config = load_config()

    synth_config = config["synthetic"]
    paths_config = config["paths"]

    # Directory
    if output_dir is None:
        output_dir = ROOT / paths_config["synthetic_images"]
    if backgrounds_dir is None:
        backgrounds_dir = ROOT / paths_config["backgrounds"]
    if cutouts_dir is None:
        # I ritagli vengono dalla cartella raw_images processata
        cutouts_dir = ROOT / paths_config["raw_images"] / "cutouts"

    output_images = output_dir / "images"
    output_labels = output_dir / "labels"
    output_images.mkdir(parents=True, exist_ok=True)
    output_labels.mkdir(parents=True, exist_ok=True)

    # Info
    num_target = synth_config["num_images"]
    console.print(
        Panel(
            f"[bold green]Generazione Dataset Sintetico[/bold green]\n"
            f"Target: {num_target} immagini\n"
            f"Funghi per immagine: {synth_config['mushrooms_per_image']['min']}-"
            f"{synth_config['mushrooms_per_image']['max']}\n"
            f"Sfondi: {backgrounds_dir}\n"
            f"Ritagli funghi: {cutouts_dir}\n"
            f"Output: {output_dir}",
            title="CercaFungo - Synthetic Generator",
        )
    )

    # Carica assets
    console.print("\n[bold]Caricamento assets...[/bold]")
    backgrounds = load_background_images(backgrounds_dir)
    cutouts = load_mushroom_cutouts(cutouts_dir)

    if not backgrounds:
        console.print("[red]Impossibile generare dati senza sfondi.[/red]")
        console.print(
            "[yellow]Crea la cartella data/backgrounds/ e aggiungi foto di sottobosco.\n"
            "Fonti consigliate: Unsplash, Pexels (licenza libera).\n"
            "Cerca: 'forest floor', 'leaf litter', 'sottobosco', 'mushroom habitat'[/yellow]"
        )
        return 0

    if not cutouts:
        console.print("[red]Impossibile generare dati senza ritagli di funghi.[/red]")
        console.print(
            "[yellow]Crea la cartella data/raw/cutouts/ con:\n"
            "  - PNG con canale alfa (sfondo trasparente)\n"
            "  - Oppure JPG + corrispettivo nome_mask.png\n"
            "Puoi ritagliare manualmente dai dataset scaricati.[/yellow]"
        )
        return 0

    # Parametri di generazione
    scale_range = (synth_config["scale_range"]["min"], synth_config["scale_range"]["max"])
    occlusion_prob = synth_config["occlusion_probability"]
    max_occlusion = synth_config["max_occlusion"]
    shadow_prob = synth_config["shadow_probability"]
    blur_prob = synth_config["blur_probability"]
    noise_prob = synth_config["noise_probability"]
    mushrooms_min = synth_config["mushrooms_per_image"]["min"]
    mushrooms_max = synth_config["mushrooms_per_image"]["max"]

    generated = 0

    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeRemainingColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Generazione immagini sintetiche", total=num_target)

        while generated < num_target:
            # Scegli sfondo random e ridimensiona a 640x640
            bg = random.choice(backgrounds).copy()
            target_size = 640
            bg = cv2.resize(bg, (target_size, target_size))
            bg_h, bg_w = bg.shape[:2]

            # Quanti funghi in questa immagine
            num_mushrooms = random.randint(mushrooms_min, mushrooms_max)
            labels: List[str] = []

            for _ in range(num_mushrooms):
                # Scegli fungo random
                mushroom_bgr, mushroom_alpha = random.choice(cutouts)

                # Scala random (simula distanza)
                scale = random.uniform(*scale_range)

                # Posizione random, preferibilmente nella meta' inferiore
                # (i funghi crescono dal terreno)
                pos_x = random.randint(0, max(1, bg_w - int(mushroom_bgr.shape[1] * scale)))
                # Bias verso la parte bassa dell'immagine
                y_min = bg_h // 4
                pos_y = random.randint(y_min, max(y_min + 1, bg_h - int(mushroom_bgr.shape[0] * scale)))

                # Composita
                bg, bbox = composite_mushroom(
                    background=bg,
                    mushroom_bgr=mushroom_bgr,
                    mushroom_alpha=mushroom_alpha,
                    position=(pos_x, pos_y),
                    scale=scale,
                    apply_color_match=True,
                    apply_shadow=random.random() < shadow_prob,
                )

                cx, cy, bw, bh = bbox
                if bw < 0.01 or bh < 0.01:
                    continue  # Bbox troppo piccola, scarta

                # Occlusione casuale
                if random.random() < occlusion_prob:
                    bg = apply_occlusion(bg, bbox, bg_h, bg_w, max_occlusion)

                # Label YOLO: class_id cx cy w h
                # Classe 0 = "fungo" (unica classe per detector)
                labels.append(f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

            if not labels:
                continue  # Nessun fungo valido, riprova

            # Post-processing dell'immagine intera
            if random.random() < blur_prob:
                ksize = random.choice([3, 5])
                bg = cv2.GaussianBlur(bg, (ksize, ksize), 0)

            if random.random() < noise_prob:
                noise = np.random.normal(0, random.uniform(5, 15), bg.shape).astype(np.float32)
                bg = np.clip(bg.astype(np.float32) + noise, 0, 255).astype(np.uint8)

            # Variazione luminosita' casuale (simula orario del giorno)
            if random.random() < 0.5:
                factor = random.uniform(0.7, 1.3)
                bg = np.clip(bg.astype(np.float32) * factor, 0, 255).astype(np.uint8)

            # Salva immagine e label
            img_name = f"synthetic_{generated:06d}.jpg"
            label_name = f"synthetic_{generated:06d}.txt"

            cv2.imwrite(str(output_images / img_name), bg, [cv2.IMWRITE_JPEG_QUALITY, 92])
            with open(output_labels / label_name, "w") as f:
                f.write("\n".join(labels) + "\n")

            generated += 1
            progress.advance(task)

    # Statistiche finali
    console.print(f"\n[bold green]Generazione completata![/bold green]")
    console.print(f"  Immagini generate: {generated}")
    console.print(f"  Directory: {output_dir}")

    # Crea classes.txt
    classes_file = output_dir / "classes.txt"
    with open(classes_file, "w") as f:
        f.write("fungo\n")

    return generated


def create_placeholder_backgrounds(
    output_dir: Path,
    num_backgrounds: int = 20,
    size: Tuple[int, int] = (800, 800),
) -> None:
    """
    Crea sfondi placeholder procedurali per testing.
    In produzione, usare foto reali di sottobosco.
    Genera texture simili a terreno boschivo con noise e colori naturali.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    console.print(
        f"[yellow]Generazione {num_backgrounds} sfondi placeholder "
        f"(sostituire con foto reali per risultati migliori)[/yellow]"
    )

    for i in range(num_backgrounds):
        h, w = size

        # Colore base terreno boschivo
        base_colors = [
            (35, 55, 30),   # Verde scuro muschio
            (50, 70, 45),   # Verde muschio chiaro
            (45, 50, 35),   # Verde-marrone
            (60, 55, 40),   # Marrone foglie
            (40, 40, 30),   # Marrone scuro terra
            (55, 65, 45),   # Verde oliva
        ]
        base = random.choice(base_colors)

        # Crea immagine base con gradiente
        img = np.zeros((h, w, 3), dtype=np.float32)
        for c in range(3):
            img[:, :, c] = base[c]

        # Aggiungi Perlin-like noise per texture terreno
        # Usiamo noise multi-scala per simulare terreno
        for octave in [4, 8, 16, 32, 64]:
            noise = np.random.randn(h // octave + 1, w // octave + 1)
            noise = cv2.resize(noise, (w, h), interpolation=cv2.INTER_CUBIC)
            amplitude = 30.0 / octave
            img += noise[:, :, np.newaxis] * amplitude

        # Chiazze di colore diverso (foglie, muschio, terra)
        for _ in range(random.randint(5, 15)):
            patch_color = random.choice(base_colors)
            cx, cy = random.randint(0, w), random.randint(0, h)
            radius = random.randint(30, 150)

            y_grid, x_grid = np.ogrid[:h, :w]
            dist = np.sqrt((x_grid - cx) ** 2 + (y_grid - cy) ** 2)
            mask = np.clip(1.0 - dist / radius, 0, 1)
            mask = cv2.GaussianBlur(mask.astype(np.float32), (31, 31), 0)

            for c in range(3):
                img[:, :, c] += mask * (patch_color[c] - base[c]) * 0.5

        img = np.clip(img, 0, 255).astype(np.uint8)

        # Salva
        cv2.imwrite(str(output_dir / f"bg_placeholder_{i:03d}.jpg"), img)

    console.print(f"  [green]Creati {num_backgrounds} sfondi in {output_dir}[/green]")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Generatore dati sintetici"
    )
    parser.add_argument(
        "--num-images",
        type=int,
        default=None,
        help="Override numero immagini da generare",
    )
    parser.add_argument(
        "--create-placeholders",
        action="store_true",
        help="Crea sfondi placeholder per testing",
    )
    parser.add_argument(
        "--backgrounds-dir",
        type=str,
        default=None,
        help="Directory con sfondi di sottobosco",
    )
    parser.add_argument(
        "--cutouts-dir",
        type=str,
        default=None,
        help="Directory con ritagli di funghi (PNG con alfa)",
    )
    args = parser.parse_args()

    config = load_config()

    if args.create_placeholders:
        bg_dir = ROOT / config["paths"]["backgrounds"]
        create_placeholder_backgrounds(bg_dir)
    else:
        if args.num_images:
            config["synthetic"]["num_images"] = args.num_images

        bg_dir = Path(args.backgrounds_dir) if args.backgrounds_dir else None
        cut_dir = Path(args.cutouts_dir) if args.cutouts_dir else None
        generate_synthetic_dataset(config=config, backgrounds_dir=bg_dir, cutouts_dir=cut_dir)
