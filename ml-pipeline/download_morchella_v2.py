"""
download_morchella_v2.py
========================
Downloads morchella photos from iNaturalist with multiple strategies:
- Multiple pages per taxon
- 'large' image size for better training quality
- includes 'needs_id' observations
- Italy/Europe searches + global
- Skips already-downloaded files
- Target: 150+ photos per species
"""

import os
import time
import requests
from pathlib import Path

# ─── CONFIG ──────────────────────────────────────────────────────────────────
BASE_URL = "https://api.inaturalist.org/v1/observations"
HEADERS = {"User-Agent": "CercaFungo-ML-Pipeline/1.0"}
SLEEP = 1.1
MIN_SIZE_BYTES = 5 * 1024  # 5 KB
TARGET_PER_SPECIES = 150
PER_PAGE = 50  # iNaturalist max reliable page size
OUTPUT_ROOT = Path("C:/work/Cozza/cercafungo/ml-pipeline/data/raw/morchella")

# ─── SPECIES DEFINITIONS ─────────────────────────────────────────────────────
# Each species has a list of search strategies (dicts of API params).
# They will be tried in order until TARGET_PER_SPECIES is reached.
SPECIES = [
    {
        "name": "morchella_esculenta",
        "taxon_id": 48267,
        "label": "Morchella esculenta (classic honeycomb morel)",
    },
    {
        "name": "morchella_conica",
        "taxon_id": 48268,
        "label": "Morchella conica/elata (black/conical morel)",
    },
    {
        "name": "morchella_semilibera",
        "taxon_id": 48529,
        "label": "Morchella semilibera (half-free morel)",
    },
    # morchella_americana: 10k+ observations, best catch-all for North American morels
    {
        "name": "morchella_americana",
        "taxon_id": 462132,
        "label": "Morchella americana (yellow morel, NA)",
    },
    # morchella_rufobrunnea: common in California/Mediterranean climate
    {
        "name": "morchella_rufobrunnea",
        "taxon_id": 206090,
        "label": "Morchella rufobrunnea (urban morel)",
    },
    # morchella_importuna: Asian/European burn morel
    {
        "name": "morchella_importuna",
        "taxon_id": 487375,
        "label": "Morchella importuna (disturbed ground morel)",
    },
]

# place_id values: 6883=Italy, 97392=Europe (iNaturalist place)
SEARCH_STRATEGIES = [
    # Strategy 1: research-grade, global
    {"quality_grade": "research", "place_id": None},
    # Strategy 2: research-grade, Italy
    {"quality_grade": "research", "place_id": 6883},
    # Strategy 3: needs_id, global (more results)
    {"quality_grade": "needs_id", "place_id": None},
    # Strategy 4: needs_id, Italy
    {"quality_grade": "needs_id", "place_id": 6883},
    # Strategy 5: any quality, global (broadest)
    {"quality_grade": None, "place_id": None},
]

# ─── HELPERS ─────────────────────────────────────────────────────────────────

session = requests.Session()
session.headers.update(HEADERS)


def get_existing_ids(folder: Path) -> set[str]:
    """Return set of 'obs_id_photo_id' strings already on disk."""
    existing = set()
    for f in folder.glob("*.jpg"):
        parts = f.stem.split("_")
        # filename: {species}_{obs_id}_{photo_id}  — last two segments are ids
        if len(parts) >= 3:
            key = f"{parts[-2]}_{parts[-1]}"
            existing.add(key)
    return existing


def build_params(taxon_id: int, strategy: dict, page: int) -> dict:
    params = {
        "taxon_id": taxon_id,
        "photos": "true",
        "per_page": PER_PAGE,
        "page": page,
        "order": "desc",
        "order_by": "votes",
    }
    if strategy.get("quality_grade"):
        params["quality_grade"] = strategy["quality_grade"]
    if strategy.get("place_id"):
        params["place_id"] = strategy["place_id"]
    return params


def extract_photo_url(photo: dict) -> str | None:
    """Get 'large' image URL from a photo dict."""
    url = photo.get("url") or photo.get("image_url")
    if not url:
        return None
    # Replace 'square' or 'medium' or 'small' with 'large'
    for size in ("square", "medium", "small", "thumb"):
        url = url.replace(f"/{size}.", "/large.")
    return url


def download_image(url: str, dest: Path) -> bool:
    """Download image to dest. Returns True on success."""
    try:
        resp = session.get(url, timeout=20)
        if resp.status_code != 200:
            return False
        if len(resp.content) < MIN_SIZE_BYTES:
            print(f"      [skip] too small ({len(resp.content)} bytes): {url}")
            return False
        dest.write_bytes(resp.content)
        return True
    except Exception as exc:
        print(f"      [error] download failed: {exc}")
        return False


def fetch_observations(taxon_id: int, strategy: dict, page: int) -> list[dict]:
    """Call iNaturalist API and return list of observation dicts."""
    params = build_params(taxon_id, strategy, page)
    try:
        resp = session.get(BASE_URL, params=params, timeout=15)
        time.sleep(SLEEP)
        if resp.status_code != 200:
            print(f"    [API error] status {resp.status_code}")
            return []
        data = resp.json()
        return data.get("results", [])
    except Exception as exc:
        print(f"    [API error] {exc}")
        time.sleep(2)
        return []


# ─── MAIN DOWNLOAD LOOP ───────────────────────────────────────────────────────

def download_species(species: dict) -> int:
    name = species["name"]
    taxon_id = species["taxon_id"]
    label = species["label"]

    folder = OUTPUT_ROOT / name
    folder.mkdir(parents=True, exist_ok=True)

    existing = get_existing_ids(folder)
    downloaded = len(existing)
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"  Already on disk: {downloaded} | Target: {TARGET_PER_SPECIES}")
    print(f"{'='*60}")

    if downloaded >= TARGET_PER_SPECIES:
        print(f"  Already at target, skipping.")
        return downloaded

    new_count = 0

    for strategy in SEARCH_STRATEGIES:
        if downloaded >= TARGET_PER_SPECIES:
            break

        strat_label = (
            f"quality={strategy.get('quality_grade') or 'any'}, "
            f"place={strategy.get('place_id') or 'global'}"
        )
        print(f"\n  Strategy: {strat_label}")

        for page in range(1, 10):  # up to 9 pages per strategy = 450 obs max
            if downloaded >= TARGET_PER_SPECIES:
                break

            results = fetch_observations(taxon_id, strategy, page)
            if not results:
                print(f"    Page {page}: no results, moving to next strategy.")
                break

            print(f"    Page {page}: {len(results)} observations")

            for obs in results:
                if downloaded >= TARGET_PER_SPECIES:
                    break

                obs_id = str(obs.get("id", ""))
                photos = obs.get("photos", [])

                for photo in photos:
                    if downloaded >= TARGET_PER_SPECIES:
                        break

                    photo_id = str(photo.get("id", ""))
                    key = f"{obs_id}_{photo_id}"

                    if key in existing:
                        continue  # already downloaded

                    url = extract_photo_url(photo)
                    if not url:
                        continue

                    filename = f"{name}_{obs_id}_{photo_id}.jpg"
                    dest = folder / filename

                    if dest.exists():
                        existing.add(key)
                        downloaded += 1
                        continue

                    success = download_image(url, dest)
                    time.sleep(SLEEP)

                    if success:
                        existing.add(key)
                        downloaded += 1
                        new_count += 1
                        print(f"      [{downloaded:>3}] saved: {filename}")
                    else:
                        print(f"      [fail] {url}")

    print(f"\n  Done. Total on disk: {downloaded} (new this run: {new_count})")
    return downloaded


# ─── ENTRY POINT ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("CercaFungo — Morchella Photo Downloader v2")
    print(f"Output root: {OUTPUT_ROOT}")
    print(f"Target per species: {TARGET_PER_SPECIES}")

    totals = {}
    for sp in SPECIES:
        count = download_species(sp)
        totals[sp["name"]] = count

    print("\n" + "=" * 60)
    print("FINAL STATS")
    print("=" * 60)
    grand_total = 0
    for name, count in totals.items():
        status = "OK" if count >= TARGET_PER_SPECIES else f"SHORT (need {TARGET_PER_SPECIES - count} more)"
        print(f"  {name:<30} {count:>4} photos   {status}")
        grand_total += count
    print(f"  {'TOTAL':<30} {grand_total:>4} photos")
    print("=" * 60)
