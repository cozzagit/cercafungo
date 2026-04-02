"""
CercaFungo — Orchestratore pipeline ML completa.

Esegue gli stadi della pipeline in sequenza, con controlli prerequisiti,
logging dettagliato e report finale dei tempi.

Uso:
    python scripts/run_pipeline.py --stage all
    python scripts/run_pipeline.py --stage download
    python scripts/run_pipeline.py --stage prepare
    python scripts/run_pipeline.py --stage train
    python scripts/run_pipeline.py --stage evaluate
    python scripts/run_pipeline.py --stage export
"""

import importlib
import subprocess
import sys
import time
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()
ROOT = Path(__file__).resolve().parent.parent

# Ordine degli stadi e loro prerequisiti
STAGE_ORDER: List[str] = ["download", "prepare", "train", "evaluate", "export"]

STAGE_PREREQUISITES: Dict[str, List[str]] = {
    "download": [],
    "prepare": [],  # Non richiede download (puo' usare dati manuali)
    "train": ["prepare"],
    "evaluate": ["train"],
    "export": ["train"],
}


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        console.print(f"[red]Errore: config.yaml non trovato in {ROOT}[/red]")
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def check_prerequisites(stage: str, config: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Verifica che i prerequisiti per uno stadio siano soddisfatti.

    Returns:
        (ok, messaggio) — se ok e' False, il messaggio spiega il problema.
    """
    paths = config["paths"]

    if stage == "prepare":
        # Serve almeno una sorgente dati
        has_roboflow = (ROOT / paths["raw_images"] / "roboflow").exists()
        has_inaturalist = (ROOT / paths["raw_images"] / "inaturalist").exists()
        has_flickr = (ROOT / paths.get("flickr", {}).get("output_dir", "data/raw/flickr")).exists() if isinstance(paths.get("flickr"), dict) else False
        has_synthetic = (ROOT / paths["synthetic_images"]).exists()
        has_manual = (ROOT / paths.get("manual_photos", "data/raw/manual")).exists()

        if not any([has_roboflow, has_inaturalist, has_flickr, has_synthetic, has_manual]):
            return (
                False,
                "Nessun dato trovato. Esegui prima lo stadio 'download' "
                "oppure aggiungi foto manuali in data/raw/manual/.",
            )

    elif stage == "train":
        # Serve il dataset processato
        dataset_yaml = ROOT / paths["processed_dataset"] / "dataset.yaml"
        if not dataset_yaml.exists():
            return (
                False,
                f"Dataset non trovato: {dataset_yaml}\n"
                "Esegui prima lo stadio 'prepare'.",
            )

    elif stage == "evaluate":
        # Serve almeno un modello addestrato
        det_dir = ROOT / paths["models_output"] / "detector"
        cls_dir = ROOT / paths["models_output"] / "classifier"
        has_detector = det_dir.exists() and any(det_dir.rglob("best.pt"))
        has_classifier = cls_dir.exists() and any(cls_dir.rglob("best_model.pt"))

        if not has_detector and not has_classifier:
            return (
                False,
                "Nessun modello addestrato trovato.\n"
                "Esegui prima lo stadio 'train'.",
            )

    elif stage == "export":
        # Come evaluate, serve almeno un modello
        det_dir = ROOT / paths["models_output"] / "detector"
        cls_dir = ROOT / paths["models_output"] / "classifier"
        has_detector = det_dir.exists() and any(det_dir.rglob("best.pt"))
        has_classifier = cls_dir.exists() and any(cls_dir.rglob("best_model.pt"))

        if not has_detector and not has_classifier:
            return (
                False,
                "Nessun modello addestrato trovato.\n"
                "Esegui prima lo stadio 'train'.",
            )

    return (True, "OK")


def run_stage_download(config: Dict[str, Any]) -> bool:
    """Esegue lo stadio di download dati."""
    console.print("\n[bold]1/3 Download iNaturalist...[/bold]")
    try:
        from dataset.download_inaturalist import download_all_species
        download_all_species(config=config)
    except Exception as e:
        console.print(f"[red]Errore iNaturalist: {e}[/red]")

    console.print("\n[bold]2/3 Download Roboflow...[/bold]")
    try:
        from dataset.download_roboflow import download_roboflow_datasets
        download_roboflow_datasets(config=config)
    except Exception as e:
        console.print(f"[red]Errore Roboflow: {e}[/red]")

    console.print("\n[bold]3/3 Download Flickr...[/bold]")
    try:
        from dataset.download_flickr import download_flickr_mushrooms
        download_flickr_mushrooms(config=config)
    except Exception as e:
        console.print(f"[yellow]Flickr: {e} (non critico)[/yellow]")

    # Download sfondi (non critico, necessario solo per dati sintetici)
    console.print("\n[bold]Bonus: Download sfondi sottobosco...[/bold]")
    try:
        from dataset.download_backgrounds import download_all_backgrounds
        download_all_backgrounds(config=config)
    except Exception as e:
        console.print(f"[yellow]Sfondi: {e} (non critico)[/yellow]")

    return True


def run_stage_prepare(config: Dict[str, Any]) -> bool:
    """Esegue lo stadio di preparazione dataset."""
    # Generazione sintetica (opzionale)
    bg_dir = ROOT / config["paths"]["backgrounds"]
    if bg_dir.exists() and any(bg_dir.iterdir()):
        console.print("\n[bold]1/2 Generazione dati sintetici...[/bold]")
        try:
            from dataset.synthetic_generator import generate_synthetic_dataset
            generate_synthetic_dataset(config=config)
        except Exception as e:
            console.print(f"[yellow]Generazione sintetica: {e} (non critico)[/yellow]")
    else:
        console.print(
            "\n[dim]Skip generazione sintetica: nessun sfondo in "
            f"{bg_dir}[/dim]"
        )

    # Preparazione dataset unificato
    console.print("\n[bold]2/2 Preparazione dataset unificato...[/bold]")
    try:
        from dataset.prepare_dataset import prepare_dataset
        prepare_dataset(config=config)
    except Exception as e:
        console.print(f"[red]Errore preparazione dataset: {e}[/red]")
        return False

    return True


def run_stage_train(config: Dict[str, Any]) -> bool:
    """Esegue lo stadio di training."""
    # Detector
    console.print("\n[bold]1/2 Training Detector (YOLOv8n)...[/bold]")
    try:
        from training.train_detector import train_detector
        train_detector(config=config)
    except Exception as e:
        console.print(f"[red]Errore training detector: {e}[/red]")
        return False

    # Classificatore
    console.print("\n[bold]2/2 Training Classificatore (EfficientNet-B0)...[/bold]")
    try:
        from training.train_classifier import train_classifier
        train_classifier(config=config)
    except Exception as e:
        console.print(f"[red]Errore training classificatore: {e}[/red]")
        return False

    return True


def run_stage_evaluate(config: Dict[str, Any]) -> bool:
    """Esegue lo stadio di valutazione."""
    try:
        from training.evaluate import evaluate_all

        # Cerca modelli piu' recenti
        paths = config["paths"]
        det_dir = ROOT / paths["models_output"] / "detector"
        cls_dir = ROOT / paths["models_output"] / "classifier"

        det_weights = None
        if det_dir.exists():
            for d in sorted(det_dir.iterdir(), reverse=True):
                best = d / "weights" / "best.pt"
                if best.exists():
                    det_weights = best
                    break

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
    except Exception as e:
        console.print(f"[red]Errore valutazione: {e}[/red]")
        return False

    return True


def run_stage_export(config: Dict[str, Any]) -> bool:
    """Esegue lo stadio di export per mobile."""
    try:
        from training.export_mobile import export_all
        export_all(config=config)
    except Exception as e:
        console.print(f"[red]Errore export: {e}[/red]")
        return False

    return True


# Mappa stadi -> funzione
STAGE_RUNNERS = {
    "download": run_stage_download,
    "prepare": run_stage_prepare,
    "train": run_stage_train,
    "evaluate": run_stage_evaluate,
    "export": run_stage_export,
}


def run_pipeline(
    stages: List[str],
    config: Optional[Dict[str, Any]] = None,
    skip_checks: bool = False,
) -> Dict[str, Dict[str, Any]]:
    """
    Esegue gli stadi specificati della pipeline.

    Args:
        stages: Lista di stadi da eseguire (in ordine)
        config: Configurazione
        skip_checks: Se True, salta i controlli prerequisiti

    Returns:
        Dict con stadio -> {success: bool, elapsed: float, message: str}
    """
    if config is None:
        config = load_config()

    total_start = time.time()
    results: Dict[str, Dict[str, Any]] = {}

    # Header
    console.print(
        Panel(
            f"[bold green]CercaFungo ML Pipeline[/bold green]\n\n"
            f"Stadi da eseguire: {', '.join(stages)}\n"
            f"Root: {ROOT}\n"
            f"Specie configurate: {len(config.get('species', []))}\n"
            f"Skip prerequisiti: {'Si' if skip_checks else 'No'}",
            title="Pipeline Orchestrator",
        )
    )

    for idx, stage in enumerate(stages):
        stage_num = idx + 1
        total_stages = len(stages)

        console.print(
            f"\n{'=' * 70}\n"
            f"  STADIO {stage_num}/{total_stages}: [bold]{stage.upper()}[/bold]\n"
            f"{'=' * 70}"
        )

        # Controllo prerequisiti
        if not skip_checks:
            ok, message = check_prerequisites(stage, config)
            if not ok:
                console.print(f"\n[red]Prerequisiti non soddisfatti:[/red]\n{message}")
                results[stage] = {
                    "success": False,
                    "elapsed": 0.0,
                    "message": f"Prerequisiti: {message}",
                }
                console.print(
                    "[yellow]Pipeline interrotta. Risolvi i prerequisiti e riprova.[/yellow]"
                )
                break
            console.print("  [green]Prerequisiti OK[/green]")

        # Esegui stadio
        stage_start = time.time()
        runner = STAGE_RUNNERS.get(stage)

        if runner is None:
            console.print(f"[red]Stadio sconosciuto: {stage}[/red]")
            results[stage] = {
                "success": False,
                "elapsed": 0.0,
                "message": f"Stadio '{stage}' non trovato",
            }
            continue

        try:
            success = runner(config)
        except Exception as e:
            console.print(f"[red]Errore fatale nello stadio '{stage}': {e}[/red]")
            success = False

        elapsed = time.time() - stage_start
        elapsed_str = str(timedelta(seconds=int(elapsed)))

        results[stage] = {
            "success": success,
            "elapsed": elapsed,
            "message": "OK" if success else "Errore",
        }

        status = "[green]COMPLETATO[/green]" if success else "[red]FALLITO[/red]"
        console.print(
            f"\n  Stadio '{stage}': {status} in {elapsed_str}"
        )

        if not success:
            console.print(
                "[yellow]Pipeline interrotta per errore. "
                "Correggi e riprova.[/yellow]"
            )
            break

    # Report finale
    total_elapsed = time.time() - total_start
    _print_final_report(results, total_elapsed)

    return results


def _print_final_report(
    results: Dict[str, Dict[str, Any]],
    total_elapsed: float,
) -> None:
    """Stampa il report finale della pipeline."""
    console.print("\n")

    table = Table(title="Report Pipeline CercaFungo")
    table.add_column("Stadio", style="cyan")
    table.add_column("Stato", justify="center")
    table.add_column("Tempo", style="yellow", justify="right")
    table.add_column("Note", style="dim")

    for stage, info in results.items():
        status = "[green]OK[/green]" if info["success"] else "[red]FAIL[/red]"
        elapsed = str(timedelta(seconds=int(info["elapsed"])))
        table.add_row(stage, status, elapsed, info.get("message", ""))

    table.add_section()
    table.add_row(
        "[bold]TOTALE[/bold]",
        "",
        f"[bold]{str(timedelta(seconds=int(total_elapsed)))}[/bold]",
        "",
    )

    console.print(table)

    # Conta successi/fallimenti
    successes = sum(1 for r in results.values() if r["success"])
    failures = sum(1 for r in results.values() if not r["success"])

    if failures == 0:
        console.print(
            f"\n[bold green]Pipeline completata con successo! "
            f"({successes} stadi in {str(timedelta(seconds=int(total_elapsed)))})[/bold green]"
        )
    else:
        console.print(
            f"\n[bold red]Pipeline terminata con {failures} errore/i.[/bold red]"
        )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Pipeline ML completa"
    )
    parser.add_argument(
        "--stage",
        type=str,
        default="all",
        choices=["all", *STAGE_ORDER],
        help="Stadio da eseguire (default: all)",
    )
    parser.add_argument(
        "--skip-checks",
        action="store_true",
        help="Salta i controlli prerequisiti",
    )
    parser.add_argument(
        "--from-stage",
        type=str,
        default=None,
        choices=STAGE_ORDER,
        help="Esegui da questo stadio in poi (es. --from-stage train)",
    )
    parser.add_argument(
        "--to-stage",
        type=str,
        default=None,
        choices=STAGE_ORDER,
        help="Esegui fino a questo stadio incluso (es. --to-stage prepare)",
    )
    args = parser.parse_args()

    config = load_config()

    # Determina stadi da eseguire
    if args.stage == "all":
        stages = STAGE_ORDER.copy()
    else:
        stages = [args.stage]

    # Filtra per --from-stage / --to-stage
    if args.from_stage:
        start_idx = STAGE_ORDER.index(args.from_stage)
        stages = [s for s in stages if STAGE_ORDER.index(s) >= start_idx]

    if args.to_stage:
        end_idx = STAGE_ORDER.index(args.to_stage)
        stages = [s for s in stages if STAGE_ORDER.index(s) <= end_idx]

    if not stages:
        console.print("[red]Nessuno stadio selezionato.[/red]")
        sys.exit(1)

    run_pipeline(
        stages=stages,
        config=config,
        skip_checks=args.skip_checks,
    )
