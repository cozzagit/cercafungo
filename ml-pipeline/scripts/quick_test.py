"""
CercaFungo — Test rapido modello esportato.

Carica un modello TFLite (o ONNX), esegue inferenza su immagini di test,
mostra risultati con bounding box, stampa FPS e dimensione modello.
Utile per verificare velocemente che l'export sia andato a buon fine.

Uso:
    python scripts/quick_test.py
    python scripts/quick_test.py --model exports/detector.onnx --images data/raw/manual/
    python scripts/quick_test.py --model exports/classifier.tflite --images data/test/
"""

import sys
import time
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


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_file_size_mb(path: Path) -> float:
    """Dimensione file in MB."""
    if path.exists():
        if path.is_dir():
            return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / (
                1024 * 1024
            )
        return path.stat().st_size / (1024 * 1024)
    return 0.0


def find_test_images(
    images_path: Optional[Path],
    config: Dict[str, Any],
    max_images: int = 8,
) -> List[Path]:
    """
    Trova immagini per il test. Cerca in ordine:
    1. Path specificato dall'utente
    2. data/processed/test/images/
    3. data/raw/manual/
    4. data/raw/inaturalist/ (prime N immagini)
    """
    candidates: List[Path] = []

    if images_path and images_path.exists():
        if images_path.is_file():
            return [images_path]
        for f in sorted(images_path.rglob("*")):
            if f.suffix.lower() in IMAGE_EXTENSIONS:
                candidates.append(f)
                if len(candidates) >= max_images:
                    break
        if candidates:
            return candidates

    # Cerca in ordine di preferenza
    search_dirs = [
        ROOT / config["paths"]["processed_dataset"] / "test" / "images",
        ROOT / config["paths"]["processed_dataset"] / "val" / "images",
        ROOT / config["paths"].get("manual_photos", "data/raw/manual"),
        ROOT / config["paths"]["raw_images"] / "inaturalist",
    ]

    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for f in sorted(search_dir.rglob("*")):
            if f.suffix.lower() in IMAGE_EXTENSIONS:
                candidates.append(f)
                if len(candidates) >= max_images:
                    return candidates

    return candidates


# ================================================================
# ONNX INFERENCE
# ================================================================

def load_onnx_model(model_path: Path) -> Any:
    """Carica modello ONNX con onnxruntime."""
    try:
        import onnxruntime as ort
    except ImportError:
        console.print(
            "[red]onnxruntime non installato. pip install onnxruntime[/red]"
        )
        sys.exit(1)

    session = ort.InferenceSession(str(model_path))
    return session


def run_onnx_inference(
    session: Any,
    image: np.ndarray,
    input_size: int,
) -> Tuple[np.ndarray, float]:
    """
    Esegue inferenza ONNX su una singola immagine.

    Returns:
        (output_array, inference_time_ms)
    """
    # Preprocessing: resize e normalizza
    resized = cv2.resize(image, (input_size, input_size))
    blob = resized.astype(np.float32) / 255.0
    blob = blob.transpose(2, 0, 1)  # HWC -> CHW
    blob = np.expand_dims(blob, axis=0)  # Aggiungi batch dim

    input_name = session.get_inputs()[0].name

    start = time.perf_counter()
    outputs = session.run(None, {input_name: blob})
    elapsed_ms = (time.perf_counter() - start) * 1000

    return outputs[0], elapsed_ms


# ================================================================
# TFLITE INFERENCE
# ================================================================

def load_tflite_model(model_path: Path) -> Any:
    """Carica modello TFLite."""
    try:
        import tensorflow as tf
    except ImportError:
        console.print(
            "[red]tensorflow non installato. pip install tensorflow[/red]"
        )
        sys.exit(1)

    interpreter = tf.lite.Interpreter(model_path=str(model_path))
    interpreter.allocate_tensors()
    return interpreter


def run_tflite_inference(
    interpreter: Any,
    image: np.ndarray,
    input_size: int,
) -> Tuple[np.ndarray, float]:
    """
    Esegue inferenza TFLite su una singola immagine.

    Returns:
        (output_array, inference_time_ms)
    """
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    input_shape = input_details[0]["shape"]
    input_dtype = input_details[0]["dtype"]

    # Preprocessing
    resized = cv2.resize(image, (input_size, input_size))

    if input_dtype == np.uint8:
        # Modello quantizzato INT8
        blob = resized.astype(np.uint8)
    else:
        blob = resized.astype(np.float32) / 255.0

    # TFLite aspetta NHWC (non CHW come PyTorch)
    if len(input_shape) == 4 and input_shape[3] == 3:
        blob = np.expand_dims(blob, axis=0)
    elif len(input_shape) == 4 and input_shape[1] == 3:
        # CHW format
        blob = blob.transpose(2, 0, 1)
        blob = np.expand_dims(blob, axis=0)
    else:
        blob = np.expand_dims(blob, axis=0)

    interpreter.set_tensor(input_details[0]["index"], blob)

    start = time.perf_counter()
    interpreter.invoke()
    elapsed_ms = (time.perf_counter() - start) * 1000

    output = interpreter.get_tensor(output_details[0]["index"])
    return output, elapsed_ms


# ================================================================
# VISUALIZATION
# ================================================================

def visualize_detection_results(
    images: List[np.ndarray],
    results: List[Dict[str, Any]],
    save_path: Optional[Path] = None,
) -> None:
    """Mostra i risultati della detection con matplotlib."""
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        console.print("[yellow]matplotlib non installato, skip visualizzazione[/yellow]")
        return

    n = len(images)
    cols = min(4, n)
    rows = max(1, (n + cols - 1) // cols)

    fig, axes = plt.subplots(rows, cols, figsize=(5 * cols, 5 * rows))

    # Normalizza axes a 2D array
    if rows == 1 and cols == 1:
        axes = np.array([[axes]])
    elif rows == 1:
        axes = axes[np.newaxis, :]
    elif cols == 1:
        axes = axes[:, np.newaxis]

    for idx in range(n):
        r, c = divmod(idx, cols)
        ax = axes[r][c]

        img_rgb = cv2.cvtColor(images[idx], cv2.COLOR_BGR2RGB)
        ax.imshow(img_rgb)

        info = results[idx]
        title_parts = [f"{info.get('inference_ms', 0):.1f}ms"]
        if "top_class" in info:
            title_parts.append(f"{info['top_class']} ({info.get('confidence', 0):.2f})")
        if "num_detections" in info:
            title_parts.append(f"{info['num_detections']} det.")

        ax.set_title(" | ".join(title_parts), fontsize=9)
        ax.axis("off")

    # Nascondi assi vuoti
    for idx in range(n, rows * cols):
        r, c = divmod(idx, cols)
        axes[r][c].axis("off")

    fig.suptitle("CercaFungo — Quick Test", fontsize=14)
    plt.tight_layout()

    if save_path:
        fig.savefig(str(save_path), dpi=150)
        console.print(f"[green]Visualizzazione salvata: {save_path}[/green]")
    else:
        plt.show()


# ================================================================
# MAIN
# ================================================================

def find_model(
    model_path: Optional[Path],
    config: Dict[str, Any],
) -> Optional[Path]:
    """Cerca automaticamente un modello esportato."""
    if model_path and model_path.exists():
        return model_path

    exports_dir = ROOT / config["paths"]["exports_output"]

    # Cerca in ordine di preferenza
    candidates = [
        exports_dir / "detector.onnx",
        exports_dir / "classifier.onnx",
        exports_dir / "detector.tflite",
        exports_dir / "classifier.tflite",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def quick_test(
    model_path: Optional[Path] = None,
    images_path: Optional[Path] = None,
    config: Optional[Dict[str, Any]] = None,
    max_images: int = 8,
    save_path: Optional[Path] = None,
) -> None:
    """
    Esegue un test rapido sul modello esportato.

    Args:
        model_path: Path al modello (.onnx o .tflite)
        images_path: Directory o file con immagini di test
        config: Configurazione
        max_images: Numero massimo di immagini da testare
        save_path: Se specificato, salva la visualizzazione
    """
    if config is None:
        config = load_config()

    # Trova modello
    model_path = find_model(model_path, config)
    if model_path is None:
        console.print(
            "[red]Nessun modello trovato.[/red]\n"
            "[yellow]Esegui prima il training e l'export, oppure specifica --model[/yellow]"
        )
        sys.exit(1)

    # Determina tipo modello
    model_format = model_path.suffix.lower()
    is_detector = "detector" in model_path.stem.lower()
    model_size = get_file_size_mb(model_path)

    # Determina input size
    if is_detector:
        input_size = config.get("detector", {}).get("image_size", 640)
    else:
        input_size = config.get("classifier", {}).get("image_size", 224)

    console.print(
        Panel(
            f"[bold green]Quick Test Modello[/bold green]\n\n"
            f"Modello: {model_path}\n"
            f"Formato: {model_format}\n"
            f"Tipo: {'Detector' if is_detector else 'Classificatore'}\n"
            f"Dimensione: {model_size:.1f} MB\n"
            f"Input size: {input_size}x{input_size}",
            title="CercaFungo - Quick Test",
        )
    )

    # Trova immagini
    test_images = find_test_images(images_path, config, max_images)
    if not test_images:
        console.print(
            "[red]Nessuna immagine di test trovata.[/red]\n"
            "[yellow]Specifica --images o aggiungi foto in data/raw/manual/[/yellow]"
        )
        sys.exit(1)

    console.print(f"\n  Immagini di test: {len(test_images)}")

    # Carica modello
    console.print("\n[bold]Caricamento modello...[/bold]")

    if model_format == ".onnx":
        model = load_onnx_model(model_path)
        run_fn = lambda img: run_onnx_inference(model, img, input_size)
    elif model_format == ".tflite":
        model = load_tflite_model(model_path)
        run_fn = lambda img: run_tflite_inference(model, img, input_size)
    else:
        console.print(f"[red]Formato non supportato: {model_format}[/red]")
        sys.exit(1)

    console.print("  [green]Modello caricato[/green]")

    # Warmup (prima inferenza piu' lenta)
    console.print("\n[bold]Warmup...[/bold]")
    dummy = np.random.randint(0, 255, (input_size, input_size, 3), dtype=np.uint8)
    run_fn(dummy)
    console.print("  [green]Warmup completato[/green]")

    # Inferenza
    console.print("\n[bold]Inferenza...[/bold]")

    loaded_images: List[np.ndarray] = []
    all_results: List[Dict[str, Any]] = []
    all_times: List[float] = []

    # Carica nomi classi per il classificatore
    class_names: List[str] = []
    if not is_detector:
        species = config.get("species", [])
        class_names = [s["id"] for s in species]
        # Cerca anche metadata JSON
        meta_path = model_path.parent / "classifier_metadata.json"
        if meta_path.exists():
            import json
            meta = json.loads(meta_path.read_text())
            class_names = meta.get("class_names", class_names)

    for img_path in test_images:
        image = cv2.imread(str(img_path))
        if image is None:
            continue

        output, elapsed_ms = run_fn(image)
        all_times.append(elapsed_ms)
        loaded_images.append(image)

        result: Dict[str, Any] = {
            "image": img_path.name,
            "inference_ms": elapsed_ms,
            "output_shape": output.shape if hasattr(output, "shape") else "?",
        }

        if is_detector:
            # Per YOLOv8: output e' [1, N, 5+C] o simile
            # Conta detection con confidence > 0.25
            if hasattr(output, "shape") and len(output.shape) >= 2:
                # Formato dipende dall'export, gestiamo i casi comuni
                try:
                    if output.shape[-1] >= 5:
                        confs = output[..., 4] if output.shape[-1] == 5 else output[..., 4:].max(axis=-1)
                        num_det = int((confs > 0.25).sum())
                    else:
                        num_det = 0
                except Exception:
                    num_det = 0
                result["num_detections"] = num_det
        else:
            # Classificatore: top prediction
            if hasattr(output, "shape"):
                flat = output.flatten()
                # Applica softmax se necessario (valori non in [0,1])
                if flat.max() > 1.0 or flat.min() < 0.0:
                    exp_vals = np.exp(flat - flat.max())
                    flat = exp_vals / exp_vals.sum()
                top_idx = int(flat.argmax())
                top_conf = float(flat[top_idx])
                top_name = class_names[top_idx] if top_idx < len(class_names) else f"cls_{top_idx}"
                result["top_class"] = top_name
                result["confidence"] = top_conf
                result["top_5"] = sorted(
                    [(class_names[i] if i < len(class_names) else f"cls_{i}", float(flat[i]))
                     for i in range(len(flat))],
                    key=lambda x: x[1],
                    reverse=True,
                )[:5]

        all_results.append(result)

        console.print(
            f"  {img_path.name}: {elapsed_ms:.1f}ms"
            + (f" -> {result.get('top_class', '')} ({result.get('confidence', 0):.2f})" if "top_class" in result else "")
            + (f" -> {result.get('num_detections', 0)} detections" if "num_detections" in result else "")
        )

    # Statistiche prestazioni
    if all_times:
        console.print("\n")

        perf_table = Table(title="Prestazioni Inferenza")
        perf_table.add_column("Metrica", style="cyan")
        perf_table.add_column("Valore", style="green", justify="right")

        avg_ms = np.mean(all_times)
        perf_table.add_row("Modello", str(model_path.name))
        perf_table.add_row("Formato", model_format.upper())
        perf_table.add_row("Dimensione", f"{model_size:.1f} MB")
        perf_table.add_row("Input size", f"{input_size}x{input_size}")
        perf_table.add_row("Immagini testate", str(len(all_times)))
        perf_table.add_row("Tempo medio", f"{avg_ms:.1f} ms")
        perf_table.add_row("Tempo min", f"{min(all_times):.1f} ms")
        perf_table.add_row("Tempo max", f"{max(all_times):.1f} ms")
        perf_table.add_row("FPS (stimato)", f"{1000.0 / avg_ms:.1f}")

        console.print(perf_table)

    # Visualizzazione
    if loaded_images:
        visualize_detection_results(
            loaded_images[:max_images],
            all_results[:max_images],
            save_path=save_path,
        )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Quick test modello esportato"
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Path al modello (.onnx o .tflite)",
    )
    parser.add_argument(
        "--images",
        type=str,
        default=None,
        help="Directory o file con immagini di test",
    )
    parser.add_argument(
        "--max-images",
        type=int,
        default=8,
        help="Numero massimo di immagini da testare (default: 8)",
    )
    parser.add_argument(
        "--save",
        type=str,
        default=None,
        help="Salva visualizzazione in questo file (es. test_results.png)",
    )
    parser.add_argument(
        "--no-display",
        action="store_true",
        help="Non mostrare la visualizzazione (salva solo se --save specificato)",
    )
    args = parser.parse_args()

    config = load_config()

    model_path = Path(args.model) if args.model else None
    images_path = Path(args.images) if args.images else None
    save_path = Path(args.save) if args.save else None

    quick_test(
        model_path=model_path,
        images_path=images_path,
        config=config,
        max_images=args.max_images,
        save_path=save_path,
    )
