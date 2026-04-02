"""
CercaFungo — Download sfondi di sottobosco per generazione sintetica.

Scarica immagini di "forest floor", "sottobosco", "leaf litter" ecc.
da Flickr (CC) e Unsplash (free tier). Questi sfondi vengono usati
da synthetic_generator.py per comporre funghi su scenari realistici.

Target: 500+ sfondi diversi (stagioni, illuminazione, tipi di bosco).
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


def load_config() -> Dict[str, Any]:
    """Carica la configurazione dal file YAML centrale."""
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        console.print(f"[red]Errore: config.yaml non trovato in {ROOT}[/red]")
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def download_file(
    url: str,
    save_path: Path,
    timeout: int = 30,
    headers: Optional[Dict[str, str]] = None,
) -> bool:
    """Scarica un file generico. Salta se gia' presente."""
    if save_path.exists():
        return True

    try:
        response = requests.get(
            url, timeout=timeout, stream=True, headers=headers or {}
        )
        response.raise_for_status()

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        console.print(f"  [red]Errore download: {e}[/red]")
        if save_path.exists():
            save_path.unlink()
        return False


# ================================================================
# FLICKR
# ================================================================

def search_flickr_backgrounds(
    api_key: str,
    query: str,
    max_results: int = 100,
    license_ids: str = "1,2,3,4,5,6",
    rate_limit_delay: float = 1.0,
) -> List[Dict[str, Any]]:
    """Cerca foto di sottobosco su Flickr con licenze CC."""
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
            "content_type": 1,
            "sort": "relevance",
            "per_page": min(250, max_results - len(all_photos)),
            "page": page,
            "format": "json",
            "nojsoncallback": 1,
            "extras": "url_l,url_o,url_c,license,owner_name,geo",
            # Filtro: solo foto orizzontali/quadrate (sfondi migliori)
            "orientation": "landscape,square",
        }

        try:
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            console.print(f"  [red]Errore Flickr: {e}[/red]")
            time.sleep(rate_limit_delay * 3)
            page += 1
            continue

        if data.get("stat") != "ok":
            break

        photos = data.get("photos", {}).get("photo", [])
        if not photos:
            break

        all_photos.extend(photos)
        page += 1
        time.sleep(rate_limit_delay)

        if len(photos) < 250:
            break

    return all_photos[:max_results]


def download_flickr_backgrounds(
    api_key: str,
    search_terms: List[str],
    output_dir: Path,
    max_per_query: int = 100,
    rate_limit_delay: float = 1.0,
) -> int:
    """
    Scarica sfondi di sottobosco da Flickr.

    Returns:
        Numero totale di sfondi scaricati.
    """
    total_downloaded = 0
    downloaded_ids: set = set()

    for query in search_terms:
        console.print(f"\n  [bold]Flickr: '{query}'[/bold]")

        photos = search_flickr_backgrounds(
            api_key=api_key,
            query=query,
            max_results=max_per_query,
            rate_limit_delay=rate_limit_delay,
        )

        new_photos = [p for p in photos if p.get("id") not in downloaded_ids]
        console.print(
            f"    [dim]Trovate: {len(photos)}, nuove: {len(new_photos)}[/dim]"
        )

        for photo in new_photos:
            # Prendi URL migliore
            url = None
            for size_key in ["url_o", "url_l", "url_c"]:
                url = photo.get(size_key)
                if url:
                    break
            if not url:
                continue

            photo_id = photo.get("id", "unknown")
            ext = ".jpg"
            if url.lower().endswith(".png"):
                ext = ".png"

            save_path = output_dir / f"flickr_bg_{photo_id}{ext}"

            if download_file(url, save_path):
                total_downloaded += 1
                downloaded_ids.add(photo_id)

            time.sleep(rate_limit_delay * 0.2)

    return total_downloaded


# ================================================================
# UNSPLASH
# ================================================================

def search_unsplash_backgrounds(
    access_key: str,
    query: str,
    max_results: int = 30,
) -> List[Dict[str, Any]]:
    """
    Cerca foto su Unsplash (free tier: 50 req/ora).
    Le foto Unsplash sono libere per uso commerciale e non.
    """
    base_url = "https://api.unsplash.com/search/photos"
    all_photos: List[Dict[str, Any]] = []
    page = 1
    per_page = min(30, max_results)  # Unsplash max 30 per pagina

    while len(all_photos) < max_results:
        headers = {
            "Authorization": f"Client-ID {access_key}",
            "Accept-Version": "v1",
        }
        params = {
            "query": query,
            "per_page": per_page,
            "page": page,
            "orientation": "landscape",
        }

        try:
            response = requests.get(
                base_url, params=params, headers=headers, timeout=30
            )
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            console.print(f"  [red]Errore Unsplash: {e}[/red]")
            break

        photos = data.get("results", [])
        if not photos:
            break

        all_photos.extend(photos)
        page += 1

        # Rate limit conservativo per free tier
        time.sleep(2.0)

        if len(photos) < per_page:
            break

    return all_photos[:max_results]


def download_unsplash_backgrounds(
    access_key: str,
    search_terms: List[str],
    output_dir: Path,
    max_per_query: int = 30,
) -> int:
    """
    Scarica sfondi da Unsplash.
    Unsplash richiede l'attribuzione ma non limita l'uso.

    Returns:
        Numero totale di sfondi scaricati.
    """
    total_downloaded = 0
    downloaded_ids: set = set()

    for query in search_terms:
        console.print(f"\n  [bold]Unsplash: '{query}'[/bold]")

        photos = search_unsplash_backgrounds(
            access_key=access_key,
            query=query,
            max_results=max_per_query,
        )

        new_photos = [p for p in photos if p.get("id") not in downloaded_ids]
        console.print(
            f"    [dim]Trovate: {len(photos)}, nuove: {len(new_photos)}[/dim]"
        )

        for photo in new_photos:
            # URL per download (Unsplash API richiede endpoint specifico)
            urls = photo.get("urls", {})
            # Usiamo "regular" (1080px) — buon compromesso qualita'/dimensione
            url = urls.get("regular") or urls.get("full") or urls.get("raw")
            if not url:
                continue

            photo_id = photo.get("id", "unknown")
            save_path = output_dir / f"unsplash_bg_{photo_id}.jpg"

            if download_file(url, save_path):
                total_downloaded += 1
                downloaded_ids.add(photo_id)

                # Unsplash richiede il trigger del download endpoint per le statistiche
                download_location = photo.get("links", {}).get("download_location")
                if download_location:
                    try:
                        requests.get(
                            download_location,
                            headers={"Authorization": f"Client-ID {access_key}"},
                            timeout=10,
                        )
                    except Exception:
                        pass  # Non critico, solo statistiche

            time.sleep(1.0)  # Rispetta rate limit Unsplash

    return total_downloaded


# ================================================================
# MAIN
# ================================================================

def download_all_backgrounds(
    config: Optional[Dict[str, Any]] = None,
    output_dir: Optional[Path] = None,
) -> int:
    """
    Scarica sfondi di sottobosco da tutte le fonti configurate.

    Returns:
        Numero totale di sfondi scaricati.
    """
    if config is None:
        config = load_config()

    bg_config = config.get("backgrounds", {})
    search_terms = bg_config.get("search_terms", [
        "forest floor",
        "sottobosco",
        "forest ground",
        "leaf litter",
    ])
    target_count = bg_config.get("target_count", 500)

    if output_dir is None:
        output_dir = ROOT / config["paths"]["backgrounds"]
    output_dir.mkdir(parents=True, exist_ok=True)

    # Conta sfondi gia' presenti
    existing = sum(
        1
        for f in output_dir.iterdir()
        if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )

    console.print(
        Panel(
            f"[bold green]Download Sfondi Sottobosco[/bold green]\n"
            f"Target: {target_count} sfondi diversi\n"
            f"Gia' presenti: {existing}\n"
            f"Query: {', '.join(search_terms)}\n"
            f"Output: {output_dir}",
            title="CercaFungo - Background Downloader",
        )
    )

    if existing >= target_count:
        console.print(
            f"[green]Gia' {existing} sfondi presenti (target: {target_count}). "
            f"Niente da scaricare.[/green]"
        )
        return 0

    total_downloaded = 0

    # --- Flickr ---
    flickr_enabled = bg_config.get("flickr", {}).get("enabled", True)
    flickr_api_key = os.environ.get("FLICKR_API_KEY") or config.get("flickr", {}).get(
        "api_key"
    )

    if flickr_enabled and flickr_api_key:
        console.print("\n[bold cyan]Fonte: Flickr (CC)[/bold cyan]")
        flickr_max = bg_config.get("flickr", {}).get("max_per_query", 100)
        flickr_rate = config.get("flickr", {}).get("rate_limit_delay", 1.0)

        count = download_flickr_backgrounds(
            api_key=flickr_api_key,
            search_terms=search_terms,
            output_dir=output_dir,
            max_per_query=flickr_max,
            rate_limit_delay=flickr_rate,
        )
        total_downloaded += count
        console.print(f"  [green]Flickr: {count} sfondi scaricati[/green]")
    elif flickr_enabled:
        console.print(
            "[yellow]Flickr: API key mancante (FLICKR_API_KEY), skip.[/yellow]"
        )

    # --- Unsplash ---
    unsplash_enabled = bg_config.get("unsplash", {}).get("enabled", True)
    unsplash_key = os.environ.get("UNSPLASH_ACCESS_KEY") or bg_config.get(
        "unsplash", {}
    ).get("access_key")

    if unsplash_enabled and unsplash_key:
        console.print("\n[bold cyan]Fonte: Unsplash[/bold cyan]")
        unsplash_max = bg_config.get("unsplash", {}).get("max_per_query", 30)

        count = download_unsplash_backgrounds(
            access_key=unsplash_key,
            search_terms=search_terms,
            output_dir=output_dir,
            max_per_query=unsplash_max,
        )
        total_downloaded += count
        console.print(f"  [green]Unsplash: {count} sfondi scaricati[/green]")
    elif unsplash_enabled:
        console.print(
            "[yellow]Unsplash: access key mancante (UNSPLASH_ACCESS_KEY), skip.[/yellow]"
        )

    # Riassunto
    final_count = existing + total_downloaded
    console.print(
        f"\n[bold green]Completato: {total_downloaded} nuovi sfondi scaricati[/bold green]"
    )
    console.print(
        f"Totale sfondi disponibili: {final_count} / {target_count} target"
    )

    if final_count < target_count:
        deficit = target_count - final_count
        console.print(
            f"\n[yellow]Mancano ancora {deficit} sfondi per raggiungere il target.\n"
            "Suggerimenti:\n"
            "  1. Scarica manualmente da Unsplash/Pexels/Pixabay\n"
            "  2. Scatta foto di sottobosco con il telefono\n"
            "  3. Usa --create-placeholders per generare sfondi procedurali\n"
            f"  Metti le immagini in: {output_dir}[/yellow]"
        )

    return total_downloaded


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Download sfondi sottobosco per dati sintetici"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Directory di output",
    )
    parser.add_argument(
        "--query",
        type=str,
        nargs="+",
        default=None,
        help="Override termini di ricerca",
    )
    parser.add_argument(
        "--target",
        type=int,
        default=None,
        help="Override target numero sfondi",
    )
    parser.add_argument(
        "--flickr-only",
        action="store_true",
        help="Scarica solo da Flickr",
    )
    parser.add_argument(
        "--unsplash-only",
        action="store_true",
        help="Scarica solo da Unsplash",
    )
    args = parser.parse_args()

    config = load_config()

    if args.query:
        config.setdefault("backgrounds", {})["search_terms"] = args.query
    if args.target:
        config.setdefault("backgrounds", {})["target_count"] = args.target
    if args.flickr_only:
        config.setdefault("backgrounds", {}).setdefault("unsplash", {})["enabled"] = False
    if args.unsplash_only:
        config.setdefault("backgrounds", {}).setdefault("flickr", {})["enabled"] = False

    output = Path(args.output) if args.output else None
    download_all_backgrounds(config=config, output_dir=output)
