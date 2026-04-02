"""
CercaFungo — Download foto da iNaturalist API.

Scarica foto di osservazioni verificate (research grade) per le specie target,
filtrate per area geografica (Alpi/Prealpi italiane).
I dati sono usati per il classificatore (Stage 2).
"""

import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeRemainingColumn,
)
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parent.parent

# Header per le richieste — iNaturalist richiede un User-Agent descrittivo
HEADERS = {
    "User-Agent": "CercaFungo-ML-Pipeline/1.0 (mushroom detection research; contact: cercafungo@example.com)",
    "Accept": "application/json",
}


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        console.print(f"[red]Errore: config.yaml non trovato in {ROOT}[/red]")
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def fetch_observations(
    taxon_id: int,
    bbox: Dict[str, float],
    quality_grade: str = "research",
    per_page: int = 200,
    max_results: int = 1000,
    rate_limit_delay: float = 1.1,
    base_url: str = "https://api.inaturalist.org/v1",
) -> List[Dict[str, Any]]:
    """
    Scarica osservazioni da iNaturalist API v1 per un determinato taxon.

    Parametri:
        taxon_id: ID tassonomico su iNaturalist
        bbox: Bounding box {sw_lat, sw_lng, ne_lat, ne_lng}
        quality_grade: "research" per osservazioni verificate
        per_page: Risultati per pagina (max 200)
        max_results: Numero massimo di osservazioni da scaricare
        rate_limit_delay: Pausa tra richieste in secondi

    Returns:
        Lista di osservazioni (dict) con foto e metadati.
    """
    observations: List[Dict[str, Any]] = []
    page = 1
    total_available = None

    while len(observations) < max_results:
        params = {
            "taxon_id": taxon_id,
            "quality_grade": quality_grade,
            "photos": "true",  # Solo osservazioni con foto
            "geo": "true",  # Solo con geolocalizzazione
            "per_page": min(per_page, max_results - len(observations)),
            "page": page,
            "order": "desc",
            "order_by": "votes",  # Le piu' votate prima (qualita' migliore)
            # Bounding box per Alpi italiane
            "swlat": bbox["sw_lat"],
            "swlng": bbox["sw_lng"],
            "nelat": bbox["ne_lat"],
            "nelng": bbox["ne_lng"],
        }

        try:
            response = requests.get(
                f"{base_url}/observations",
                params=params,
                headers=HEADERS,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            console.print(f"[red]Errore API iNaturalist (pagina {page}): {e}[/red]")
            # Riprova dopo una pausa piu' lunga
            time.sleep(rate_limit_delay * 3)
            continue

        results = data.get("results", [])
        total_available = data.get("total_results", 0)

        if not results:
            break

        observations.extend(results)
        page += 1

        # Rispetta il rate limit
        time.sleep(rate_limit_delay)

        # Se abbiamo preso tutto, esci
        if len(results) < per_page:
            break

    if total_available is not None:
        console.print(
            f"  [dim]Osservazioni disponibili: {total_available}, scaricate: {len(observations)}[/dim]"
        )

    return observations[:max_results]


def download_photo(
    url: str,
    save_path: Path,
    size: str = "large",
    timeout: int = 30,
) -> bool:
    """
    Scarica una singola foto da iNaturalist.

    iNaturalist usa URL come: https://inaturalist-open-data.s3.amazonaws.com/photos/XXXX/medium.jpg
    Sostituiamo 'medium' con 'large' o 'original' per migliore risoluzione.
    """
    # Sostituisci la dimensione nell'URL
    for old_size in ["square", "small", "medium", "thumb"]:
        url = url.replace(f"/{old_size}.", f"/{size}.")

    if save_path.exists():
        return True  # Gia' scaricata

    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, stream=True)
        response.raise_for_status()

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        console.print(f"  [red]Errore download {url}: {e}[/red]")
        # Rimuovi file parziale
        if save_path.exists():
            save_path.unlink()
        return False


def extract_observation_metadata(observation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estrae metadati utili da un'osservazione iNaturalist.
    """
    location = observation.get("location", "")
    lat, lng = None, None
    if location:
        parts = location.split(",")
        if len(parts) == 2:
            try:
                lat, lng = float(parts[0].strip()), float(parts[1].strip())
            except ValueError:
                pass

    # Geolocalizzazione piu' precisa se disponibile
    geojson = observation.get("geojson")
    if geojson and geojson.get("coordinates"):
        lng, lat = geojson["coordinates"]  # GeoJSON e' [lng, lat]

    return {
        "observation_id": observation.get("id"),
        "species_guess": observation.get("species_guess", ""),
        "taxon_name": (
            observation.get("taxon", {}).get("name", "")
            if observation.get("taxon")
            else ""
        ),
        "quality_grade": observation.get("quality_grade", ""),
        "latitude": lat,
        "longitude": lng,
        "observed_on": observation.get("observed_on_string", ""),
        "place_guess": observation.get("place_guess", ""),
        "num_identification_agreements": observation.get(
            "num_identification_agreements", 0
        ),
        "num_identification_disagreements": observation.get(
            "num_identification_disagreements", 0
        ),
        "photos_count": len(observation.get("photos", [])),
        "url": f"https://www.inaturalist.org/observations/{observation.get('id', '')}",
    }


def download_species_photos(
    species_config: Dict[str, Any],
    inaturalist_config: Dict[str, Any],
    output_base: Path,
    rate_limit_delay: float = 1.1,
) -> Tuple[int, int]:
    """
    Scarica tutte le foto per una singola specie.

    Returns:
        Tupla (foto_scaricate, foto_fallite)
    """
    species_id = species_config["id"]
    taxon_id = species_config.get("taxon_id")

    if taxon_id is None:
        console.print(f"  [yellow]Specie {species_id}: nessun taxon_id, skip[/yellow]")
        return 0, 0

    species_dir = output_base / species_id
    species_dir.mkdir(parents=True, exist_ok=True)
    metadata_file = species_dir / "metadata.json"

    # Scarica osservazioni
    console.print(f"\n  [bold]Fetch osservazioni per {species_config['italian']}[/bold]")
    console.print(f"  [dim]taxon_id: {taxon_id}, bbox: Alpi italiane[/dim]")

    observations = fetch_observations(
        taxon_id=taxon_id,
        bbox=inaturalist_config["bounding_box"],
        quality_grade=inaturalist_config.get("quality_grade", "research"),
        per_page=inaturalist_config.get("per_page", 200),
        max_results=inaturalist_config.get("max_photos_per_species", 1000),
        rate_limit_delay=rate_limit_delay,
        base_url=inaturalist_config.get("base_url", "https://api.inaturalist.org/v1"),
    )

    if not observations:
        console.print(f"  [yellow]Nessuna osservazione trovata per {species_id}[/yellow]")

        # Se bbox troppo restrittivo, prova senza filtro geografico per avere almeno qualche foto
        console.print("  [dim]Riprovo senza filtro geografico...[/dim]")
        observations = fetch_observations(
            taxon_id=taxon_id,
            bbox={"sw_lat": 35.0, "sw_lng": 6.0, "ne_lat": 48.0, "ne_lng": 19.0},  # Tutta Italia
            quality_grade=inaturalist_config.get("quality_grade", "research"),
            per_page=inaturalist_config.get("per_page", 200),
            max_results=min(500, inaturalist_config.get("max_photos_per_species", 500)),
            rate_limit_delay=rate_limit_delay,
        )

    if not observations:
        console.print(f"  [red]Nessuna osservazione per {species_id} nemmeno in tutta Italia[/red]")
        return 0, 0

    # Scarica foto con progress bar
    downloaded = 0
    failed = 0
    all_metadata: List[Dict[str, Any]] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeRemainingColumn(),
        console=console,
    ) as progress:
        # Conta totale foto disponibili
        total_photos = sum(len(obs.get("photos", [])) for obs in observations)
        task = progress.add_task(
            f"  Download {species_config['italian']}",
            total=total_photos,
        )

        for obs in observations:
            obs_meta = extract_observation_metadata(obs)
            photos = obs.get("photos", [])

            for photo_idx, photo in enumerate(photos):
                photo_url = photo.get("url", "")
                if not photo_url:
                    progress.advance(task)
                    continue

                # Nome file: obsID_photoIdx.jpg
                filename = f"{obs['id']}_{photo_idx}.jpg"
                save_path = species_dir / filename

                success = download_photo(
                    url=photo_url,
                    save_path=save_path,
                    size="large",
                )

                if success:
                    downloaded += 1
                    photo_meta = {
                        **obs_meta,
                        "photo_id": photo.get("id"),
                        "photo_index": photo_idx,
                        "filename": filename,
                        "attribution": photo.get("attribution", ""),
                        "license_code": photo.get("license_code", ""),
                    }
                    all_metadata.append(photo_meta)
                else:
                    failed += 1

                progress.advance(task)

                # Rate limit tra download foto
                time.sleep(rate_limit_delay * 0.3)  # Piu' veloce per le foto (sono su S3)

    # Salva metadati
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "species": species_config,
                "total_observations": len(observations),
                "downloaded_photos": downloaded,
                "failed_photos": failed,
                "photos": all_metadata,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    return downloaded, failed


def download_all_species(
    config: Optional[Dict[str, Any]] = None,
    output_dir: Optional[Path] = None,
) -> Dict[str, Tuple[int, int]]:
    """
    Scarica foto per tutte le specie configurate in config.yaml.

    Returns:
        Dict con species_id -> (scaricate, fallite)
    """
    if config is None:
        config = load_config()

    inaturalist_config = config["inaturalist"]
    species_list = config["species"]
    rate_limit = inaturalist_config.get("rate_limit_delay", 1.1)

    if output_dir is None:
        output_dir = ROOT / config["paths"]["raw_images"] / "inaturalist"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Header informativo
    console.print(
        Panel(
            f"[bold green]Download da iNaturalist[/bold green]\n"
            f"Specie da scaricare: {len([s for s in species_list if s.get('taxon_id')])}\n"
            f"Area: Alpi italiane (lat {inaturalist_config['bounding_box']['sw_lat']}-"
            f"{inaturalist_config['bounding_box']['ne_lat']}, "
            f"lng {inaturalist_config['bounding_box']['sw_lng']}-"
            f"{inaturalist_config['bounding_box']['ne_lng']})\n"
            f"Qualita': {inaturalist_config.get('quality_grade', 'research')}\n"
            f"Max foto/specie: {inaturalist_config.get('max_photos_per_species', 1000)}\n"
            f"Output: {output_dir}",
            title="CercaFungo - iNaturalist Downloader",
        )
    )

    results: Dict[str, Tuple[int, int]] = {}

    for species in species_list:
        if species.get("taxon_id") is None:
            # Classe "sconosciuto" — non ha osservazioni su iNaturalist
            continue

        species_id = species["id"]
        italian_name = species["italian"]
        is_toxic = species.get("toxic", False)

        # Evidenzia specie tossiche
        label = f"[red bold]TOSSICO[/red bold] " if is_toxic else ""
        console.print(
            f"\n{'=' * 60}\n"
            f"  {label}[bold]{italian_name}[/bold] ({species['latin']})\n"
            f"  taxon_id: {species['taxon_id']}\n"
            f"{'=' * 60}"
        )

        downloaded, failed = download_species_photos(
            species_config=species,
            inaturalist_config=inaturalist_config,
            output_base=output_dir,
            rate_limit_delay=rate_limit,
        )
        results[species_id] = (downloaded, failed)

        console.print(
            f"  [green]Scaricate: {downloaded}[/green]  "
            f"[red]Fallite: {failed}[/red]"
        )

    # Riassunto finale
    _print_final_summary(results, species_list)
    return results


def _print_final_summary(
    results: Dict[str, Tuple[int, int]],
    species_list: List[Dict[str, Any]],
) -> None:
    """Stampa riassunto finale del download."""
    console.print("\n")

    table = Table(title="Riassunto Download iNaturalist")
    table.add_column("Specie", style="cyan")
    table.add_column("Nome Italiano", style="bold")
    table.add_column("Scaricate", style="green", justify="right")
    table.add_column("Fallite", style="red", justify="right")
    table.add_column("Tossico", style="red", justify="center")

    total_downloaded = 0
    total_failed = 0

    # Mappa species_list per ID
    species_map = {s["id"]: s for s in species_list}

    for species_id, (downloaded, failed) in results.items():
        species = species_map.get(species_id, {})
        toxic = "MORTALE" if species.get("deadly") else ("SI" if species.get("toxic") else "no")
        table.add_row(
            species_id,
            species.get("italian", "?"),
            str(downloaded),
            str(failed),
            toxic,
        )
        total_downloaded += downloaded
        total_failed += failed

    table.add_section()
    table.add_row(
        "[bold]TOTALE[/bold]",
        "",
        f"[bold]{total_downloaded}[/bold]",
        f"[bold]{total_failed}[/bold]",
        "",
    )

    console.print(table)
    console.print(
        f"\n[bold green]Download completato: {total_downloaded} foto scaricate[/bold green]"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Download foto da iNaturalist"
    )
    parser.add_argument(
        "--species",
        type=str,
        default=None,
        help="Scarica solo una specie specifica (es. boletus_edulis)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Directory di output",
    )
    parser.add_argument(
        "--max-photos",
        type=int,
        default=None,
        help="Override max foto per specie",
    )
    args = parser.parse_args()

    config = load_config()

    if args.max_photos:
        config["inaturalist"]["max_photos_per_species"] = args.max_photos

    if args.species:
        # Filtra solo la specie richiesta
        config["species"] = [
            s for s in config["species"] if s["id"] == args.species
        ]
        if not config["species"]:
            console.print(f"[red]Specie '{args.species}' non trovata in config.yaml[/red]")
            sys.exit(1)

    output = Path(args.output) if args.output else None
    download_all_species(config=config, output_dir=output)
