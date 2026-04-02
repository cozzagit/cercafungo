"""
CercaFungo — Download foto di funghi da Flickr (Creative Commons).

Cerca foto con licenze CC libere, scarica in alta risoluzione e salva
metadati (autore, licenza, location). Usato per integrare il dataset
di training quando iNaturalist non basta.
"""

import json
import os
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

# Mappa licenze Flickr CC
FLICKR_LICENSES: Dict[str, str] = {
    "1": "CC-BY-NC-SA 2.0",
    "2": "CC-BY-NC 2.0",
    "3": "CC-BY-NC-ND 2.0",
    "4": "CC-BY 2.0",
    "5": "CC-BY-SA 2.0",
    "6": "CC-BY-ND 2.0",
    "9": "CC0 1.0 (Public Domain)",
    "10": "Public Domain Mark",
}


def load_config() -> Dict[str, Any]:
    """Carica la configurazione dal file YAML centrale."""
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        console.print(f"[red]Errore: config.yaml non trovato in {ROOT}[/red]")
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_flickr_api_key(config: Dict[str, Any]) -> Tuple[str, str]:
    """
    Recupera API key e secret da env vars o config.
    Priorita': env var > config.yaml
    """
    api_key = os.environ.get("FLICKR_API_KEY") or (
        config.get("flickr", {}).get("api_key")
    )
    api_secret = os.environ.get("FLICKR_API_SECRET") or (
        config.get("flickr", {}).get("api_secret")
    )

    if not api_key:
        console.print(
            "[red]Errore: FLICKR_API_KEY non configurata.[/red]\n"
            "[yellow]Imposta la variabile d'ambiente FLICKR_API_KEY oppure\n"
            "aggiungi flickr.api_key in config.yaml.\n"
            "Puoi ottenere una API key gratuita su: https://www.flickr.com/services/api/[/yellow]"
        )
        sys.exit(1)

    return api_key, api_secret or ""


def search_flickr_photos(
    api_key: str,
    query: str,
    license_ids: str = "1,2,3,4,5,6",
    per_page: int = 250,
    max_results: int = 500,
    rate_limit_delay: float = 1.0,
) -> List[Dict[str, Any]]:
    """
    Cerca foto su Flickr con licenze Creative Commons.

    Args:
        api_key: Flickr API key
        query: Termine di ricerca
        license_ids: ID licenze CC separate da virgola
        per_page: Risultati per pagina (max 500)
        max_results: Numero massimo di risultati
        rate_limit_delay: Pausa tra richieste

    Returns:
        Lista di foto con metadati.
    """
    base_url = "https://www.flickr.com/services/rest/"
    all_photos: List[Dict[str, Any]] = []
    page = 1

    while len(all_photos) < max_results:
        params = {
            "method": "flickr.photos.search",
            "api_key": api_key,
            "text": query,
            "license": license_ids,
            "media": "photos",
            "content_type": 1,  # Solo foto
            "sort": "relevance",
            "per_page": min(per_page, max_results - len(all_photos)),
            "page": page,
            "format": "json",
            "nojsoncallback": 1,
            # Campi extra per metadati
            "extras": "url_l,url_o,url_c,license,owner_name,geo,date_taken,tags",
        }

        try:
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            console.print(f"[red]Errore API Flickr (pagina {page}): {e}[/red]")
            time.sleep(rate_limit_delay * 3)
            continue
        except ValueError as e:
            console.print(f"[red]Errore parsing risposta Flickr: {e}[/red]")
            break

        if data.get("stat") != "ok":
            console.print(
                f"[red]Errore Flickr: {data.get('message', 'sconosciuto')}[/red]"
            )
            break

        photos = data.get("photos", {}).get("photo", [])
        total_available = int(data.get("photos", {}).get("total", 0))

        if not photos:
            break

        all_photos.extend(photos)
        page += 1

        # Log progresso
        if page == 2:
            console.print(
                f"  [dim]Query '{query}': {total_available} foto disponibili con licenza CC[/dim]"
            )

        # Rispetta rate limit
        time.sleep(rate_limit_delay)

        if len(photos) < per_page:
            break

    return all_photos[:max_results]


def get_best_photo_url(photo: Dict[str, Any]) -> Optional[str]:
    """
    Restituisce l'URL migliore disponibile per una foto.
    Preferenza: originale > large > medium 800.
    """
    # Prova diverse dimensioni dal piu' grande al piu' piccolo
    for size_key in ["url_o", "url_l", "url_c"]:
        url = photo.get(size_key)
        if url:
            return url
    return None


def download_photo(
    url: str,
    save_path: Path,
    timeout: int = 30,
) -> bool:
    """Scarica una singola foto da Flickr."""
    if save_path.exists():
        return True  # Gia' scaricata

    try:
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        console.print(f"  [red]Errore download {save_path.name}: {e}[/red]")
        if save_path.exists():
            save_path.unlink()
        return False


def extract_photo_metadata(photo: Dict[str, Any]) -> Dict[str, Any]:
    """Estrae metadati utili da una foto Flickr."""
    license_id = str(photo.get("license", ""))
    license_name = FLICKR_LICENSES.get(license_id, f"ID={license_id}")

    lat = photo.get("latitude")
    lon = photo.get("longitude")
    # Flickr restituisce 0 quando non c'e' geolocalizzazione
    if lat is not None and lon is not None:
        try:
            lat, lon = float(lat), float(lon)
            if lat == 0.0 and lon == 0.0:
                lat, lon = None, None
        except (ValueError, TypeError):
            lat, lon = None, None

    return {
        "flickr_id": photo.get("id"),
        "title": photo.get("title", ""),
        "owner": photo.get("ownername", photo.get("owner", "")),
        "license_id": license_id,
        "license_name": license_name,
        "latitude": lat,
        "longitude": lon,
        "date_taken": photo.get("datetaken", ""),
        "tags": photo.get("tags", ""),
        "flickr_url": f"https://www.flickr.com/photos/{photo.get('owner', '')}/{photo.get('id', '')}",
    }


def download_flickr_mushrooms(
    config: Optional[Dict[str, Any]] = None,
    output_dir: Optional[Path] = None,
) -> Dict[str, int]:
    """
    Scarica foto di funghi da Flickr con licenze Creative Commons.

    Returns:
        Dict con query -> numero foto scaricate.
    """
    if config is None:
        config = load_config()

    flickr_config = config.get("flickr", {})
    api_key, _ = get_flickr_api_key(config)

    search_terms = flickr_config.get("search_terms", ["mushroom forest"])
    license_ids = flickr_config.get("license_ids", "1,2,3,4,5,6")
    max_per_query = flickr_config.get("max_photos_per_query", 500)
    rate_limit = flickr_config.get("rate_limit_delay", 1.0)

    if output_dir is None:
        output_dir = ROOT / flickr_config.get("output_dir", "./data/raw/flickr")
    output_dir.mkdir(parents=True, exist_ok=True)

    console.print(
        Panel(
            f"[bold green]Download da Flickr (Creative Commons)[/bold green]\n"
            f"Query: {len(search_terms)} termini di ricerca\n"
            f"Max per query: {max_per_query}\n"
            f"Licenze: {license_ids}\n"
            f"Output: {output_dir}",
            title="CercaFungo - Flickr Downloader",
        )
    )

    results: Dict[str, int] = {}
    all_metadata: List[Dict[str, Any]] = []
    # Traccia ID gia' scaricati per evitare duplicati tra query diverse
    downloaded_ids: set = set()

    for query in search_terms:
        console.print(f"\n[bold]Ricerca: '{query}'[/bold]")

        photos = search_flickr_photos(
            api_key=api_key,
            query=query,
            license_ids=license_ids,
            max_results=max_per_query,
            rate_limit_delay=rate_limit,
        )

        if not photos:
            console.print(f"  [yellow]Nessuna foto trovata per '{query}'[/yellow]")
            results[query] = 0
            continue

        # Filtra duplicati
        new_photos = [p for p in photos if p.get("id") not in downloaded_ids]
        console.print(
            f"  [dim]Trovate: {len(photos)}, nuove: {len(new_photos)}[/dim]"
        )

        # Crea sottocartella per query
        query_dir = output_dir / query.replace(" ", "_").replace("/", "_")[:50]
        query_dir.mkdir(parents=True, exist_ok=True)

        downloaded = 0

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            MofNCompleteColumn(),
            TimeRemainingColumn(),
            console=console,
        ) as progress:
            task = progress.add_task(
                f"  Download '{query}'", total=len(new_photos)
            )

            for photo in new_photos:
                url = get_best_photo_url(photo)
                if not url:
                    progress.advance(task)
                    continue

                photo_id = photo.get("id", "unknown")
                # Determina estensione dall'URL
                ext = ".jpg"
                if url.lower().endswith(".png"):
                    ext = ".png"

                save_path = query_dir / f"flickr_{photo_id}{ext}"

                if download_photo(url, save_path):
                    downloaded += 1
                    downloaded_ids.add(photo_id)

                    meta = extract_photo_metadata(photo)
                    meta["filename"] = save_path.name
                    meta["query"] = query
                    meta["download_url"] = url
                    all_metadata.append(meta)

                progress.advance(task)
                # Piccola pausa tra download (Flickr CDN)
                time.sleep(rate_limit * 0.3)

        results[query] = downloaded
        console.print(
            f"  [green]Scaricate: {downloaded}[/green] foto per '{query}'"
        )

    # Salva metadati globali
    metadata_file = output_dir / "flickr_metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "total_photos": len(all_metadata),
                "queries": list(results.keys()),
                "photos": all_metadata,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    # Riassunto finale
    _print_summary(results, output_dir)
    return results


def _print_summary(results: Dict[str, int], output_dir: Path) -> None:
    """Stampa riassunto finale del download."""
    console.print("\n")

    table = Table(title="Riassunto Download Flickr")
    table.add_column("Query", style="cyan")
    table.add_column("Foto scaricate", style="green", justify="right")

    total = 0
    for query, count in results.items():
        table.add_row(query, str(count))
        total += count

    table.add_section()
    table.add_row("[bold]TOTALE[/bold]", f"[bold]{total}[/bold]")

    console.print(table)
    console.print(f"\n[bold green]Download completato: {total} foto in {output_dir}[/bold green]")
    console.print(
        "[dim]Ricorda: verifica manualmente la qualita' delle foto "
        "e rispetta le attribuzioni delle licenze CC.[/dim]"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Download foto funghi da Flickr CC"
    )
    parser.add_argument(
        "--query",
        type=str,
        nargs="+",
        default=None,
        help="Override termini di ricerca (es. --query 'porcini' 'boletus')",
    )
    parser.add_argument(
        "--max-photos",
        type=int,
        default=None,
        help="Override max foto per query",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Directory di output",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Flickr API key (oppure usa env var FLICKR_API_KEY)",
    )
    args = parser.parse_args()

    config = load_config()

    if args.api_key:
        config.setdefault("flickr", {})["api_key"] = args.api_key
    if args.query:
        config.setdefault("flickr", {})["search_terms"] = args.query
    if args.max_photos:
        config.setdefault("flickr", {})["max_photos_per_query"] = args.max_photos

    output = Path(args.output) if args.output else None
    download_flickr_mushrooms(config=config, output_dir=output)
