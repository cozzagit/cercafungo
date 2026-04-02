"""
CercaFungo — Download dataset da Roboflow Universe.

Scarica dataset pubblici di mushroom detection in formato YOLOv8.
Gestisce rate limits, resume di download interrotti, e logging.
"""

import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

console = Console()

# Root del progetto ML pipeline
ROOT = Path(__file__).resolve().parent.parent


def load_config() -> Dict[str, Any]:
    """Carica la configurazione dal file YAML centrale."""
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        console.print(f"[red]Errore: config.yaml non trovato in {ROOT}[/red]")
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def download_roboflow_datasets(
    config: Optional[Dict[str, Any]] = None,
    output_dir: Optional[Path] = None,
    api_key: Optional[str] = None,
) -> List[Path]:
    """
    Scarica dataset da Roboflow Universe.

    Cerca di usare il pacchetto roboflow per scaricare dataset pubblici.
    Se la API key non e' fornita, tenta il download senza autenticazione.

    Returns:
        Lista dei percorsi alle cartelle dei dataset scaricati.
    """
    try:
        from roboflow import Roboflow
    except ImportError:
        console.print(
            "[red]Errore: pacchetto 'roboflow' non installato.[/red]\n"
            "Installa con: pip install roboflow"
        )
        sys.exit(1)

    if config is None:
        config = load_config()

    rf_config = config["roboflow"]
    paths_config = config["paths"]

    # Directory di output
    if output_dir is None:
        output_dir = ROOT / paths_config["raw_images"] / "roboflow"
    output_dir.mkdir(parents=True, exist_ok=True)

    # API key: priorita' env var > config > None
    api_key = api_key or os.environ.get("ROBOFLOW_API_KEY") or rf_config.get("api_key")

    downloaded_paths: List[Path] = []
    projects = rf_config.get("projects", [])

    if not projects:
        console.print("[yellow]Nessun progetto Roboflow configurato in config.yaml[/yellow]")
        return downloaded_paths

    console.print(
        Panel(
            f"[bold green]Download Dataset Roboflow[/bold green]\n"
            f"Progetti da scaricare: {len(projects)}\n"
            f"Output: {output_dir}",
            title="CercaFungo - Roboflow Downloader",
        )
    )

    for proj_config in projects:
        workspace = proj_config["workspace"]
        project_name = proj_config["project"]
        version = proj_config.get("version", 1)
        fmt = proj_config.get("format", "yolov8")

        dataset_dir = output_dir / f"{workspace}_{project_name}_v{version}"

        # Controlla se gia' scaricato (resume)
        if dataset_dir.exists() and any(dataset_dir.iterdir()):
            console.print(
                f"[yellow]Dataset {workspace}/{project_name} v{version} "
                f"gia' presente in {dataset_dir}, skip.[/yellow]"
            )
            downloaded_paths.append(dataset_dir)
            continue

        console.print(
            f"\n[bold]Scaricamento: {workspace}/{project_name} v{version}[/bold]"
        )

        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                task = progress.add_task(
                    f"Connessione a Roboflow ({workspace}/{project_name})...",
                    total=None,
                )

                if api_key:
                    rf = Roboflow(api_key=api_key)
                    project = rf.workspace(workspace).project(project_name)
                    ds = project.version(version)
                else:
                    # Per dataset pubblici, prova senza API key
                    # Nota: alcuni dataset richiedono comunque autenticazione
                    rf = Roboflow(api_key="placeholder")
                    try:
                        project = rf.workspace(workspace).project(project_name)
                        ds = project.version(version)
                    except Exception:
                        console.print(
                            f"[yellow]Dataset {workspace}/{project_name} richiede API key. "
                            "Imposta ROBOFLOW_API_KEY env var.[/yellow]"
                        )
                        continue

                progress.update(task, description="Download in corso...")

                # Scarica nella directory temporanea, poi sposta
                temp_dir = output_dir / f"_temp_{workspace}_{project_name}"
                temp_dir.mkdir(parents=True, exist_ok=True)

                dataset = ds.download(
                    model_format=fmt,
                    location=str(temp_dir),
                    overwrite=True,
                )

                progress.update(task, description="Organizzazione file...")

                # Sposta alla posizione finale
                if temp_dir.exists():
                    if dataset_dir.exists():
                        shutil.rmtree(dataset_dir)
                    shutil.move(str(temp_dir), str(dataset_dir))

            downloaded_paths.append(dataset_dir)
            console.print(
                f"[green]Scaricato: {dataset_dir}[/green]"
            )

            # Conta immagini scaricate
            _print_dataset_stats(dataset_dir)

            # Rate limit tra download
            time.sleep(2)

        except Exception as e:
            console.print(
                f"[red]Errore durante il download di {workspace}/{project_name}: {e}[/red]"
            )
            # Pulizia cartella temporanea
            temp_dir = output_dir / f"_temp_{workspace}_{project_name}"
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            continue

    # Riassunto finale
    _print_summary(downloaded_paths)
    return downloaded_paths


def _print_dataset_stats(dataset_dir: Path) -> None:
    """Stampa statistiche di un dataset scaricato."""
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    label_extensions = {".txt"}

    image_count = 0
    label_count = 0

    for file in dataset_dir.rglob("*"):
        if file.suffix.lower() in image_extensions:
            image_count += 1
        elif file.suffix.lower() in label_extensions and file.name != "classes.txt":
            label_count += 1

    table = Table(title=f"Stats: {dataset_dir.name}")
    table.add_column("Metrica", style="cyan")
    table.add_column("Valore", style="green")
    table.add_row("Immagini", str(image_count))
    table.add_row("Label files", str(label_count))

    # Cerca split
    for split in ["train", "valid", "test"]:
        split_dir = dataset_dir / split / "images"
        if split_dir.exists():
            count = sum(
                1 for f in split_dir.iterdir() if f.suffix.lower() in image_extensions
            )
            table.add_row(f"  {split}", str(count))

    console.print(table)


def _print_summary(downloaded_paths: List[Path]) -> None:
    """Stampa riassunto finale di tutti i download."""
    console.print("\n")
    if not downloaded_paths:
        console.print("[yellow]Nessun dataset scaricato.[/yellow]")
        return

    table = Table(title="Riassunto Download Roboflow")
    table.add_column("#", style="dim")
    table.add_column("Dataset", style="cyan")
    table.add_column("Percorso", style="green")

    for idx, path in enumerate(downloaded_paths, 1):
        table.add_row(str(idx), path.name, str(path))

    console.print(table)
    console.print(f"\n[bold green]Totale dataset scaricati: {len(downloaded_paths)}[/bold green]")


def search_roboflow_mushroom_datasets() -> None:
    """
    Utility per cercare dataset di funghi su Roboflow Universe.
    Stampa i risultati trovati per aiutare a scegliere quelli migliori.
    """
    try:
        from roboflow import Roboflow
    except ImportError:
        console.print("[red]Pacchetto roboflow non installato[/red]")
        return

    console.print(
        Panel(
            "[bold]Ricerca dataset funghi su Roboflow Universe[/bold]\n"
            "Questo e' solo un helper — i dataset vanno selezionati manualmente\n"
            "e aggiunti a config.yaml nella sezione roboflow.projects",
            title="Roboflow Universe Search",
        )
    )

    # Suggerimenti di dataset pubblici noti per mushroom detection
    known_datasets = [
        {
            "name": "Mushroom Detection (generico)",
            "url": "https://universe.roboflow.com/mushroom-detection",
            "note": "Dataset generico, buono per bootstrap",
        },
        {
            "name": "Fungi Detection",
            "url": "https://universe.roboflow.com/fungi-detection",
            "note": "Piu' varieta' di funghi",
        },
        {
            "name": "Wild Mushroom",
            "url": "https://universe.roboflow.com/wild-mushroom",
            "note": "Funghi in ambiente naturale",
        },
    ]

    table = Table(title="Dataset Consigliati")
    table.add_column("Nome", style="cyan")
    table.add_column("URL", style="blue")
    table.add_column("Note", style="yellow")

    for ds in known_datasets:
        table.add_row(ds["name"], ds["url"], ds["note"])

    console.print(table)
    console.print(
        "\n[dim]Visita https://universe.roboflow.com e cerca 'mushroom detection' "
        "per trovare altri dataset.[/dim]"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Download dataset Roboflow"
    )
    parser.add_argument(
        "--search",
        action="store_true",
        help="Mostra dataset consigliati su Roboflow Universe",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Roboflow API key (oppure usa env var ROBOFLOW_API_KEY)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Directory di output per i dataset",
    )
    args = parser.parse_args()

    if args.search:
        search_roboflow_mushroom_datasets()
    else:
        output = Path(args.output) if args.output else None
        download_roboflow_datasets(api_key=args.api_key, output_dir=output)
