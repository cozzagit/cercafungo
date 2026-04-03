"""
CercaFungo — Pipeline rimanente: download + classifier dataset + classifier training.
Esegue stage 2-4 (il detector è già stato trainato a epoch 20).
"""

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from rich.console import Console
console = Console()

# Import the stages from the full pipeline
from scripts.run_full_pipeline import (
    stage_2_download_species,
    stage_3_prepare_classifier_dataset,
    stage_4_train_classifier,
)

def main():
    start_time = time.time()

    console.print("\n[bold green]CercaFungo — Pipeline Stage 2-4[/bold green]")
    console.print("[dim]Detector già trainato (epoch 20, best mAP50=99.4%)[/dim]\n")

    results = {}

    # Stage 2: Download
    results["download"] = stage_2_download_species()

    # Stage 3: Prepare dataset
    results["prepare"] = stage_3_prepare_classifier_dataset()

    # Stage 4: Classifier
    results["classifier"] = stage_4_train_classifier()

    elapsed = time.time() - start_time
    hours = int(elapsed // 3600)
    minutes = int((elapsed % 3600) // 60)

    console.print(f"\n[bold green]Pipeline completata in {hours}h {minutes}m[/bold green]")
    for stage, ok in results.items():
        status = "[green]OK" if ok else "[red]FAIL"
        console.print(f"  {stage}: {status}[/]")

if __name__ == "__main__":
    main()
