"""
CercaFungo — Pipeline completa: detector resume + download + classifier.

Esegue in sequenza:
1. Resume training detector YOLOv8n da ultimo checkpoint
2. Download immagini iNaturalist per tutte le specie mancanti
3. Prepara dataset classificatore (split train/val/test)
4. Training classificatore EfficientNet-B0
"""

import sys
import time
from pathlib import Path

# Aggiungi root al path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import yaml
from rich.console import Console
from rich.panel import Panel

console = Console()


def load_config():
    with open(ROOT / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def stage_1_resume_detector():
    """Riprende il training del detector YOLOv8n da ultimo checkpoint."""
    console.print(Panel(
        "[bold yellow]STAGE 1: Resume Training Detector YOLOv8n[/bold yellow]",
        title="Pipeline Step 1/4",
    ))

    from training.train_detector import train_detector

    config = load_config()

    # Punta al checkpoint della v2
    last_weights = ROOT / "runs" / "detect" / "models" / "cercafungo_v2_full" / "weights" / "last.pt"

    if not last_weights.exists():
        console.print(f"[red]Checkpoint non trovato: {last_weights}[/red]")
        console.print("[yellow]Provo training da zero...[/yellow]")
        last_weights = None

    dataset_yaml = ROOT / "data" / "full_dataset" / "dataset.yaml"

    if not dataset_yaml.exists():
        console.print(f"[red]Dataset non trovato: {dataset_yaml}[/red]")
        return False

    try:
        results_dir = train_detector(
            config=config,
            dataset_yaml=dataset_yaml,
            resume=True,
            resume_weights=last_weights,
        )
        console.print(f"\n[bold green]Detector training completato: {results_dir}[/bold green]\n")
        return True
    except Exception as e:
        console.print(f"[red]Errore training detector: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False


def stage_2_download_species():
    """Scarica immagini iNaturalist per le specie mancanti."""
    console.print(Panel(
        "[bold yellow]STAGE 2: Download immagini specie da iNaturalist[/bold yellow]",
        title="Pipeline Step 2/4",
    ))

    from dataset.download_inaturalist import download_all_species

    config = load_config()
    inaturalist_dir = ROOT / "data" / "raw" / "inaturalist"

    # Controlla quali specie hanno gia' immagini
    species_with_data = []
    species_missing = []

    for species in config["species"]:
        if species.get("taxon_id") is None:
            continue
        species_dir = inaturalist_dir / species["id"]
        img_count = 0
        if species_dir.exists():
            img_count = len([f for f in species_dir.iterdir()
                           if f.suffix.lower() in {".jpg", ".jpeg", ".png"}])

        if img_count >= 10:
            species_with_data.append((species["id"], img_count))
        else:
            species_missing.append(species["id"])

    console.print(f"  Specie con dati: {len(species_with_data)}")
    console.print(f"  Specie da scaricare: {len(species_missing)}")

    if not species_missing:
        console.print("[green]Tutte le specie hanno gia' immagini![/green]")
        return True

    # Filtra config per scaricare solo le specie mancanti
    config["species"] = [
        s for s in config["species"]
        if s["id"] in species_missing
    ]

    try:
        results = download_all_species(config=config, output_dir=inaturalist_dir)
        total = sum(d for d, f in results.values())
        console.print(f"\n[bold green]Download completato: {total} nuove foto[/bold green]\n")
        return True
    except Exception as e:
        console.print(f"[red]Errore download: {e}[/red]")
        import traceback
        traceback.print_exc()
        # Continua comunque — possiamo trainare con quello che abbiamo
        return True


def stage_3_prepare_classifier_dataset():
    """Prepara il dataset per il classificatore con split train/val/test."""
    console.print(Panel(
        "[bold yellow]STAGE 3: Preparazione dataset classificatore[/bold yellow]",
        title="Pipeline Step 3/4",
    ))

    import json
    import random
    import shutil

    config = load_config()
    inaturalist_dir = ROOT / "data" / "raw" / "inaturalist"
    output_dir = ROOT / "data" / "classifier_dataset"

    # Pulisci output precedente
    if output_dir.exists():
        shutil.rmtree(output_dir)

    seed = config["dataset"].get("seed", 42)
    random.seed(seed)

    species_list = config["species"]
    total_images = 0
    species_stats = {}

    for species in species_list:
        species_id = species["id"]
        species_dir = inaturalist_dir / species_id

        if not species_dir.exists():
            continue

        images = [f for f in species_dir.iterdir()
                 if f.suffix.lower() in {".jpg", ".jpeg", ".png"}]

        if len(images) < 3:
            console.print(f"  [yellow]{species_id}: solo {len(images)} immagini, skip[/yellow]")
            continue

        # Shuffle e split 70/20/10
        random.shuffle(images)
        n = len(images)
        train_end = int(n * 0.7)
        val_end = train_end + int(n * 0.2)

        splits = {
            "train": images[:train_end],
            "val": images[train_end:val_end],
            "test": images[val_end:],
        }

        for split_name, split_images in splits.items():
            dest_dir = output_dir / split_name / species_id
            dest_dir.mkdir(parents=True, exist_ok=True)
            for img in split_images:
                shutil.copy2(str(img), str(dest_dir / img.name))

        species_stats[species_id] = {
            "total": n,
            "train": len(splits["train"]),
            "val": len(splits["val"]),
            "test": len(splits["test"]),
        }
        total_images += n
        console.print(
            f"  [green]{species_id}[/green]: {n} immagini "
            f"(train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])})"
        )

    # Salva stats
    stats_path = output_dir / "dataset_stats.json"
    with open(stats_path, "w") as f:
        json.dump({
            "total_images": total_images,
            "num_species": len(species_stats),
            "species": species_stats,
        }, f, indent=2)

    # Salva class_names.txt
    active_species = [s["id"] for s in species_list if s["id"] in species_stats]
    with open(output_dir / "class_names.txt", "w") as f:
        for name in active_species:
            f.write(f"{name}\n")

    console.print(f"\n[bold green]Dataset classificatore pronto: {total_images} immagini, {len(species_stats)} specie[/bold green]")
    console.print(f"  Output: {output_dir}\n")
    return True


def stage_4_train_classifier():
    """Addestra il classificatore EfficientNet-B0."""
    console.print(Panel(
        "[bold yellow]STAGE 4: Training Classificatore EfficientNet-B0[/bold yellow]",
        title="Pipeline Step 4/4",
    ))

    from training.train_classifier import train_classifier

    config = load_config()
    data_dir = ROOT / "data" / "classifier_dataset"

    if not data_dir.exists():
        console.print(f"[red]Dataset classificatore non trovato: {data_dir}[/red]")
        return False

    # Conta specie effettive
    class_names_file = data_dir / "class_names.txt"
    if class_names_file.exists():
        with open(class_names_file) as f:
            active_classes = [line.strip() for line in f if line.strip()]
        config["classifier"]["num_classes"] = len(active_classes)
        # Aggiorna species list per includere solo quelle con dati
        config["species"] = [s for s in config["species"] if s["id"] in active_classes]
        console.print(f"  Classi attive: {len(active_classes)}")

    try:
        results_dir = train_classifier(config=config, data_dir=data_dir)
        console.print(f"\n[bold green]Classificatore training completato: {results_dir}[/bold green]\n")
        return True
    except Exception as e:
        console.print(f"[red]Errore training classificatore: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False


def main():
    start_time = time.time()

    console.print(Panel(
        "[bold green]CercaFungo — Pipeline ML Completa[/bold green]\n\n"
        "1. Resume detector YOLOv8n\n"
        "2. Download immagini specie da iNaturalist\n"
        "3. Preparazione dataset classificatore\n"
        "4. Training classificatore EfficientNet-B0",
        title="FULL PIPELINE",
    ))

    results = {}

    # Stage 1: Detector
    results["detector"] = stage_1_resume_detector()

    # Stage 2: Download
    results["download"] = stage_2_download_species()

    # Stage 3: Prepare dataset
    results["prepare"] = stage_3_prepare_classifier_dataset()

    # Stage 4: Classifier
    results["classifier"] = stage_4_train_classifier()

    # Riassunto
    elapsed = time.time() - start_time
    hours = int(elapsed // 3600)
    minutes = int((elapsed % 3600) // 60)

    console.print(Panel(
        f"[bold]Risultati Pipeline[/bold]\n\n"
        f"Detector:      {'[green]OK' if results['detector'] else '[red]FAIL'}[/]\n"
        f"Download:      {'[green]OK' if results['download'] else '[red]FAIL'}[/]\n"
        f"Dataset prep:  {'[green]OK' if results['prepare'] else '[red]FAIL'}[/]\n"
        f"Classificatore: {'[green]OK' if results['classifier'] else '[red]FAIL'}[/]\n\n"
        f"Tempo totale: {hours}h {minutes}m",
        title="PIPELINE COMPLETATA",
    ))


if __name__ == "__main__":
    main()
