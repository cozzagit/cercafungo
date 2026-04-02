"""
CercaFungo — Export modelli per dispositivi mobili.

Esporta detector e classificatore in formati ottimizzati:
- TFLite (INT8 quantizzato per Android)
- CoreML (per iOS)
- ONNX (universale)
"""

import json
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
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


def get_file_size_mb(path: Path) -> float:
    """Restituisce la dimensione del file in MB."""
    if path.exists():
        return path.stat().st_size / (1024 * 1024)
    return 0.0


def export_detector(
    weights_path: Path,
    export_config: Dict[str, Any],
    detector_config: Dict[str, Any],
    output_dir: Path,
) -> Dict[str, Path]:
    """
    Esporta il detector YOLOv8 in formati mobile.

    Returns:
        Dict con formato -> path del modello esportato.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        console.print("[red]Pacchetto ultralytics non installato[/red]")
        return {}

    console.print(
        Panel(
            f"[bold green]Export Detector[/bold green]\n\n"
            f"Weights: {weights_path}\n"
            f"Image size: {detector_config['image_size']}px\n"
            f"TFLite quantization: {export_config['tflite']['quantization']}\n"
            f"Output: {output_dir}",
            title="CercaFungo - Detector Export",
        )
    )

    model = YOLO(str(weights_path))
    exported: Dict[str, Path] = {}
    imgsz = detector_config["image_size"]

    # --- ONNX ---
    console.print("\n[bold]1. Export ONNX...[/bold]")
    try:
        onnx_path = model.export(
            format="onnx",
            imgsz=imgsz,
            simplify=export_config["onnx"].get("simplify", True),
            opset=export_config["onnx"].get("opset", 17),
            dynamic=False,
        )
        onnx_path = Path(onnx_path)
        dest = output_dir / "detector.onnx"
        shutil.copy2(str(onnx_path), str(dest))
        exported["onnx"] = dest
        console.print(f"  [green]ONNX esportato: {dest} ({get_file_size_mb(dest):.1f} MB)[/green]")
    except Exception as e:
        console.print(f"  [red]Errore export ONNX: {e}[/red]")

    # --- TFLite ---
    console.print("\n[bold]2. Export TFLite...[/bold]")
    try:
        tflite_quantization = export_config["tflite"].get("quantization", "int8")

        # Ultralytics supporta export diretto a tflite
        tflite_path = model.export(
            format="tflite",
            imgsz=imgsz,
            int8=tflite_quantization == "int8",
            half=tflite_quantization == "float16",
        )
        tflite_path = Path(tflite_path)

        # Trova il file .tflite nella directory esportata
        if tflite_path.is_dir():
            tflite_files = list(tflite_path.glob("*.tflite"))
            if tflite_files:
                tflite_path = tflite_files[0]

        dest = output_dir / "detector.tflite"
        shutil.copy2(str(tflite_path), str(dest))
        exported["tflite"] = dest
        console.print(
            f"  [green]TFLite esportato ({tflite_quantization}): "
            f"{dest} ({get_file_size_mb(dest):.1f} MB)[/green]"
        )
    except Exception as e:
        console.print(f"  [red]Errore export TFLite: {e}[/red]")
        console.print("  [dim]TFLite richiede tensorflow installato (pip install tensorflow)[/dim]")

    # --- CoreML ---
    console.print("\n[bold]3. Export CoreML...[/bold]")
    try:
        coreml_path = model.export(
            format="coreml",
            imgsz=imgsz,
            nms=True,  # Include NMS nel modello CoreML
        )
        coreml_path = Path(coreml_path)
        dest = output_dir / "detector.mlpackage"
        if coreml_path.is_dir():
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(str(coreml_path), str(dest))
        else:
            shutil.copy2(str(coreml_path), str(dest))
        exported["coreml"] = dest
        size = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file()) / (1024 * 1024) if dest.is_dir() else get_file_size_mb(dest)
        console.print(f"  [green]CoreML esportato: {dest} ({size:.1f} MB)[/green]")
    except Exception as e:
        console.print(f"  [red]Errore export CoreML: {e}[/red]")
        console.print("  [dim]CoreML richiede coremltools installato (pip install coremltools)[/dim]")

    return exported


def export_classifier(
    weights_path: Path,
    export_config: Dict[str, Any],
    classifier_config: Dict[str, Any],
    output_dir: Path,
) -> Dict[str, Path]:
    """
    Esporta il classificatore EfficientNet in formati mobile.
    """
    console.print(
        Panel(
            f"[bold green]Export Classificatore[/bold green]\n\n"
            f"Weights: {weights_path}\n"
            f"Image size: {classifier_config['image_size']}px\n"
            f"Output: {output_dir}",
            title="CercaFungo - Classifier Export",
        )
    )

    # Carica modello PyTorch
    checkpoint = torch.load(str(weights_path), map_location="cpu", weights_only=False)
    class_names = checkpoint.get("class_names", [])
    num_classes = checkpoint.get("num_classes", len(class_names))
    image_size = checkpoint.get("image_size", classifier_config["image_size"])

    from training.train_classifier import build_model
    model = build_model(num_classes=num_classes, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    exported: Dict[str, Path] = {}
    dummy_input = torch.randn(1, 3, image_size, image_size)

    # --- ONNX ---
    console.print("\n[bold]1. Export ONNX...[/bold]")
    try:
        onnx_path = output_dir / "classifier.onnx"
        torch.onnx.export(
            model,
            dummy_input,
            str(onnx_path),
            opset_version=export_config["onnx"].get("opset", 17),
            input_names=["input"],
            output_names=["output"],
            dynamic_axes=None,  # Input statico per mobile
        )

        # Semplifica ONNX se possibile
        if export_config["onnx"].get("simplify", True):
            try:
                import onnx
                from onnxsim import simplify as onnx_simplify

                onnx_model = onnx.load(str(onnx_path))
                simplified, ok = onnx_simplify(onnx_model)
                if ok:
                    onnx.save(simplified, str(onnx_path))
                    console.print("  [dim]ONNX semplificato con successo[/dim]")
            except ImportError:
                console.print("  [dim]onnxsim non installato, skip semplificazione[/dim]")

        exported["onnx"] = onnx_path
        console.print(
            f"  [green]ONNX esportato: {onnx_path} ({get_file_size_mb(onnx_path):.1f} MB)[/green]"
        )
    except Exception as e:
        console.print(f"  [red]Errore export ONNX: {e}[/red]")

    # --- TFLite ---
    console.print("\n[bold]2. Export TFLite...[/bold]")
    try:
        tflite_path = _export_classifier_tflite(
            model=model,
            dummy_input=dummy_input,
            output_path=output_dir / "classifier.tflite",
            quantization=export_config["tflite"].get("quantization", "int8"),
            image_size=image_size,
            representative_dataset_size=export_config["tflite"].get(
                "representative_dataset_size", 200
            ),
        )
        if tflite_path:
            exported["tflite"] = tflite_path
    except Exception as e:
        console.print(f"  [red]Errore export TFLite: {e}[/red]")

    # --- CoreML ---
    console.print("\n[bold]3. Export CoreML...[/bold]")
    try:
        coreml_path = _export_classifier_coreml(
            model=model,
            dummy_input=dummy_input,
            output_path=output_dir / "classifier.mlpackage",
            class_names=class_names,
            image_size=image_size,
            export_config=export_config,
        )
        if coreml_path:
            exported["coreml"] = coreml_path
    except Exception as e:
        console.print(f"  [red]Errore export CoreML: {e}[/red]")

    # Salva metadati del classificatore (per l'app mobile)
    metadata = {
        "class_names": class_names,
        "num_classes": num_classes,
        "image_size": image_size,
        "input_mean": [0.485, 0.456, 0.406],
        "input_std": [0.229, 0.224, 0.225],
        "model_type": "efficientnet_b0",
    }
    meta_path = output_dir / "classifier_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    console.print(f"\n  [green]Metadata salvati: {meta_path}[/green]")

    return exported


def _export_classifier_tflite(
    model: torch.nn.Module,
    dummy_input: torch.Tensor,
    output_path: Path,
    quantization: str = "int8",
    image_size: int = 224,
    representative_dataset_size: int = 200,
) -> Optional[Path]:
    """
    Esporta il classificatore in TFLite via ONNX -> TF -> TFLite.
    """
    try:
        import onnx
        import onnxruntime as ort

        # Prima esporta in ONNX temporaneo
        temp_onnx = output_path.parent / "_temp_classifier.onnx"
        torch.onnx.export(
            model,
            dummy_input,
            str(temp_onnx),
            opset_version=13,
            input_names=["input"],
            output_names=["output"],
        )

        # Converti ONNX -> TFLite usando onnx2tf o tf direttamente
        try:
            import tensorflow as tf

            # Metodo: ONNX -> SavedModel -> TFLite
            # Usa onnx-tf per la conversione
            try:
                from onnx_tf.backend import prepare

                onnx_model = onnx.load(str(temp_onnx))
                tf_rep = prepare(onnx_model)
                saved_model_dir = output_path.parent / "_temp_saved_model"
                tf_rep.export_graph(str(saved_model_dir))

                # Converti SavedModel -> TFLite
                converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_model_dir))

                if quantization == "int8":
                    converter.optimizations = [tf.lite.Optimize.DEFAULT]

                    # Dataset rappresentativo per calibrazione INT8
                    def representative_dataset():
                        for _ in range(representative_dataset_size):
                            data = np.random.randn(1, image_size, image_size, 3).astype(np.float32)
                            yield [data]

                    converter.representative_dataset = representative_dataset
                    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
                    converter.inference_input_type = tf.uint8
                    converter.inference_output_type = tf.uint8

                elif quantization == "float16":
                    converter.optimizations = [tf.lite.Optimize.DEFAULT]
                    converter.target_spec.supported_types = [tf.float16]

                elif quantization == "dynamic":
                    converter.optimizations = [tf.lite.Optimize.DEFAULT]

                tflite_model = converter.convert()

                with open(str(output_path), "wb") as f:
                    f.write(tflite_model)

                # Pulizia
                if temp_onnx.exists():
                    temp_onnx.unlink()
                if saved_model_dir.exists():
                    shutil.rmtree(saved_model_dir)

                console.print(
                    f"  [green]TFLite esportato ({quantization}): "
                    f"{output_path} ({get_file_size_mb(output_path):.1f} MB)[/green]"
                )
                return output_path

            except ImportError:
                console.print(
                    "  [yellow]onnx-tf non installato. "
                    "Installa con: pip install onnx-tf[/yellow]"
                )
                # Fallback: salva solo ONNX per conversione manuale
                if temp_onnx.exists():
                    temp_onnx.unlink()
                return None

        except ImportError:
            console.print(
                "  [yellow]TensorFlow non installato. "
                "Per TFLite: pip install tensorflow[/yellow]"
            )
            if temp_onnx.exists():
                temp_onnx.unlink()
            return None

    except Exception as e:
        console.print(f"  [red]Errore conversione TFLite: {e}[/red]")
        return None


def _export_classifier_coreml(
    model: torch.nn.Module,
    dummy_input: torch.Tensor,
    output_path: Path,
    class_names: List[str],
    image_size: int = 224,
    export_config: Optional[Dict[str, Any]] = None,
) -> Optional[Path]:
    """Esporta il classificatore in CoreML."""
    try:
        import coremltools as ct

        # Trace il modello
        traced_model = torch.jit.trace(model, dummy_input)

        # Converti in CoreML
        mlmodel = ct.convert(
            traced_model,
            inputs=[
                ct.ImageType(
                    name="input",
                    shape=(1, 3, image_size, image_size),
                    scale=1.0 / (255.0 * 0.226),  # Approssimazione della normalizzazione
                    bias=[
                        -0.485 / 0.229,
                        -0.456 / 0.224,
                        -0.406 / 0.225,
                    ],
                    color_layout=ct.colorlayout.RGB,
                )
            ],
            classifier_config=ct.ClassifierConfig(class_names),
            minimum_deployment_target=(
                ct.target.iOS15
                if export_config
                and export_config.get("coreml", {}).get("minimum_deployment_target") == "iOS15"
                else ct.target.iOS14
            ),
            compute_units=(
                ct.ComputeUnit.ALL
                if export_config
                and export_config.get("coreml", {}).get("compute_units") == "ALL"
                else ct.ComputeUnit.ALL
            ),
        )

        # Metadati
        mlmodel.author = "CercaFungo"
        mlmodel.short_description = "Classificatore specie fungine"
        mlmodel.version = "1.0"

        # Salva
        mlmodel.save(str(output_path))

        size = sum(f.stat().st_size for f in output_path.rglob("*") if f.is_file()) / (1024 * 1024) if output_path.is_dir() else get_file_size_mb(output_path)
        console.print(f"  [green]CoreML esportato: {output_path} ({size:.1f} MB)[/green]")
        return output_path

    except ImportError:
        console.print(
            "  [yellow]coremltools non installato. "
            "Installa con: pip install coremltools[/yellow]"
        )
        return None
    except Exception as e:
        console.print(f"  [red]Errore export CoreML: {e}[/red]")
        return None


def test_exported_models(
    export_dir: Path,
    image_size_detector: int = 640,
    image_size_classifier: int = 224,
) -> None:
    """
    Verifica che i modelli esportati funzionino con test inference.
    """
    console.print(
        Panel(
            "[bold green]Test Inference Modelli Esportati[/bold green]",
            title="CercaFungo - Verification",
        )
    )

    results_table = Table(title="Test Inference")
    results_table.add_column("Modello", style="cyan")
    results_table.add_column("Formato", style="blue")
    results_table.add_column("Size (MB)", style="yellow", justify="right")
    results_table.add_column("Inference (ms)", style="green", justify="right")
    results_table.add_column("Status", style="bold")

    # Test ONNX (piu' universale)
    for model_name, imgsz in [
        ("detector", image_size_detector),
        ("classifier", image_size_classifier),
    ]:
        onnx_path = export_dir / f"{model_name}.onnx"
        if onnx_path.exists():
            try:
                import onnxruntime as ort

                session = ort.InferenceSession(str(onnx_path))
                input_name = session.get_inputs()[0].name
                input_shape = session.get_inputs()[0].shape

                # Crea input dummy
                if len(input_shape) == 4:
                    dummy = np.random.randn(*[s if isinstance(s, int) else 1 for s in input_shape]).astype(np.float32)
                else:
                    dummy = np.random.randn(1, 3, imgsz, imgsz).astype(np.float32)

                # Warmup
                session.run(None, {input_name: dummy})

                # Benchmark (10 iterazioni)
                times = []
                for _ in range(10):
                    start = time.perf_counter()
                    session.run(None, {input_name: dummy})
                    times.append((time.perf_counter() - start) * 1000)

                avg_time = np.mean(times)
                size = get_file_size_mb(onnx_path)

                results_table.add_row(
                    model_name, "ONNX", f"{size:.1f}", f"{avg_time:.1f}", "[green]OK[/green]"
                )
            except Exception as e:
                results_table.add_row(
                    model_name, "ONNX", "?", "?", f"[red]FAIL: {e}[/red]"
                )

        # TFLite
        tflite_path = export_dir / f"{model_name}.tflite"
        if tflite_path.exists():
            try:
                import tensorflow as tf

                interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
                interpreter.allocate_tensors()

                input_details = interpreter.get_input_details()
                output_details = interpreter.get_output_details()

                input_shape = input_details[0]["shape"]
                input_dtype = input_details[0]["dtype"]
                dummy = np.random.randn(*input_shape).astype(input_dtype)

                # Warmup
                interpreter.set_tensor(input_details[0]["index"], dummy)
                interpreter.invoke()

                # Benchmark
                times = []
                for _ in range(10):
                    start = time.perf_counter()
                    interpreter.set_tensor(input_details[0]["index"], dummy)
                    interpreter.invoke()
                    times.append((time.perf_counter() - start) * 1000)

                avg_time = np.mean(times)
                size = get_file_size_mb(tflite_path)

                results_table.add_row(
                    model_name, "TFLite", f"{size:.1f}", f"{avg_time:.1f}", "[green]OK[/green]"
                )
            except ImportError:
                results_table.add_row(
                    model_name, "TFLite", f"{get_file_size_mb(tflite_path):.1f}", "-", "[yellow]TF non installato[/yellow]"
                )
            except Exception as e:
                results_table.add_row(
                    model_name, "TFLite", "?", "?", f"[red]FAIL: {e}[/red]"
                )

        # CoreML
        coreml_path = export_dir / f"{model_name}.mlpackage"
        if coreml_path.exists():
            size = sum(f.stat().st_size for f in coreml_path.rglob("*") if f.is_file()) / (1024 * 1024) if coreml_path.is_dir() else get_file_size_mb(coreml_path)
            results_table.add_row(
                model_name, "CoreML", f"{size:.1f}", "-", "[dim]Solo macOS[/dim]"
            )

    console.print(results_table)


def copy_to_app(
    export_dir: Path,
    app_assets_dir: Path,
) -> None:
    """Copia i modelli esportati nella cartella assets dell'app."""
    console.print(f"\n[bold]Copia modelli in app: {app_assets_dir}[/bold]")
    app_assets_dir.mkdir(parents=True, exist_ok=True)

    files_to_copy = [
        "detector.onnx",
        "detector.tflite",
        "classifier.onnx",
        "classifier.tflite",
        "classifier_metadata.json",
    ]

    for filename in files_to_copy:
        src = export_dir / filename
        if src.exists():
            dest = app_assets_dir / filename
            shutil.copy2(str(src), str(dest))
            console.print(f"  [green]Copiato: {filename} ({get_file_size_mb(dest):.1f} MB)[/green]")
        else:
            console.print(f"  [dim]Non trovato: {filename}[/dim]")

    # CoreML (directory)
    for model_name in ["detector", "classifier"]:
        src = export_dir / f"{model_name}.mlpackage"
        if src.exists() and src.is_dir():
            dest = app_assets_dir / f"{model_name}.mlpackage"
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(str(src), str(dest))
            console.print(f"  [green]Copiato: {model_name}.mlpackage[/green]")

    console.print(f"\n[bold green]Modelli copiati in {app_assets_dir}[/bold green]")


def export_all(config: Optional[Dict[str, Any]] = None) -> None:
    """Esporta tutti i modelli disponibili."""
    if config is None:
        config = load_config()

    paths_config = config["paths"]
    export_config = config["export"]
    export_dir = ROOT / paths_config["exports_output"]
    export_dir.mkdir(parents=True, exist_ok=True)

    # Cerca ultimo detector
    det_dir = ROOT / paths_config["models_output"] / "detector"
    det_weights = None
    if det_dir.exists():
        for d in sorted(det_dir.iterdir(), reverse=True):
            best = d / "weights" / "best.pt"
            if best.exists():
                det_weights = best
                break

    # Cerca ultimo classificatore
    cls_dir = ROOT / paths_config["models_output"] / "classifier"
    cls_weights = None
    if cls_dir.exists():
        for d in sorted(cls_dir.iterdir(), reverse=True):
            best = d / "best_model.pt"
            if best.exists():
                cls_weights = best
                break

    # Export detector
    if det_weights:
        export_detector(
            weights_path=det_weights,
            export_config=export_config,
            detector_config=config["detector"],
            output_dir=export_dir,
        )
    else:
        console.print("[yellow]Detector weights non trovati. Esegui prima il training.[/yellow]")

    # Export classificatore
    if cls_weights:
        export_classifier(
            weights_path=cls_weights,
            export_config=export_config,
            classifier_config=config["classifier"],
            output_dir=export_dir,
        )
    else:
        console.print("[yellow]Classifier weights non trovati. Esegui prima il training.[/yellow]")

    # Test inference
    if export_config.get("test_inference", True):
        test_exported_models(
            export_dir,
            image_size_detector=config["detector"]["image_size"],
            image_size_classifier=config["classifier"]["image_size"],
        )

    # Copia in app
    if export_config.get("copy_to_app", True):
        app_dir = ROOT / paths_config["app_assets"]
        copy_to_app(export_dir, app_dir)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Export modelli per mobile"
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
        "--output-dir",
        type=str,
        default=None,
        help="Directory di output per i modelli esportati",
    )
    parser.add_argument(
        "--skip-test",
        action="store_true",
        help="Salta il test di inferenza",
    )
    parser.add_argument(
        "--skip-copy",
        action="store_true",
        help="Non copiare nella cartella assets dell'app",
    )
    parser.add_argument(
        "--formats",
        type=str,
        nargs="+",
        default=["onnx", "tflite", "coreml"],
        help="Formati da esportare (default: onnx tflite coreml)",
    )
    args = parser.parse_args()

    config = load_config()

    if args.skip_test:
        config["export"]["test_inference"] = False
    if args.skip_copy:
        config["export"]["copy_to_app"] = False

    if args.detector_weights or args.classifier_weights:
        export_dir = Path(args.output_dir) if args.output_dir else ROOT / config["paths"]["exports_output"]
        export_dir.mkdir(parents=True, exist_ok=True)

        if args.detector_weights:
            export_detector(
                weights_path=Path(args.detector_weights),
                export_config=config["export"],
                detector_config=config["detector"],
                output_dir=export_dir,
            )

        if args.classifier_weights:
            export_classifier(
                weights_path=Path(args.classifier_weights),
                export_config=config["export"],
                classifier_config=config["classifier"],
                output_dir=export_dir,
            )

        if config["export"].get("test_inference", True):
            test_exported_models(export_dir)

        if config["export"].get("copy_to_app", True):
            app_dir = ROOT / config["paths"]["app_assets"]
            copy_to_app(export_dir, app_dir)
    else:
        export_all(config=config)
