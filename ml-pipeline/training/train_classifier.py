"""
CercaFungo — Training EfficientNet-B0 Classifier (Stage 2).

Classificatore di specie fungine. Prende il crop del fungo rilevato
dal detector (Stage 1) e predice la specie.

Classi: porcino, gallinaccio, ovolo_buono, chiodini,
        amanita_phalloides, amanita_muscaria, sconosciuto
"""

import copy
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TextColumn,
    TimeRemainingColumn,
)
from rich.table import Table
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

console = Console()
ROOT = Path(__file__).resolve().parent.parent


def load_config() -> Dict[str, Any]:
    config_path = ROOT / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


class MushroomSpeciesDataset(Dataset):
    """
    Dataset per classificazione specie fungine.
    Struttura attesa: directory per specie (nome = label)
        classifier_data/
        ├── boletus_edulis/
        │   ├── 001.jpg
        │   └── ...
        ├── cantharellus_cibarius/
        │   └── ...
        └── ...
    """

    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    def __init__(
        self,
        root_dir: Path,
        class_names: List[str],
        transform: Optional[Any] = None,
    ):
        self.root_dir = root_dir
        self.class_names = class_names
        self.class_to_idx = {name: idx for idx, name in enumerate(class_names)}
        self.transform = transform
        self.samples: List[Tuple[Path, int]] = []

        self._load_samples()

    def _load_samples(self) -> None:
        """Carica tutti i percorsi immagine con le rispettive label."""
        for class_name in self.class_names:
            class_dir = self.root_dir / class_name
            if not class_dir.exists():
                console.print(f"  [yellow]Directory mancante: {class_dir}[/yellow]")
                continue

            class_idx = self.class_to_idx[class_name]
            for img_path in sorted(class_dir.iterdir()):
                if img_path.suffix.lower() in self.IMAGE_EXTENSIONS:
                    self.samples.append((img_path, class_idx))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]

        # Carica immagine con PIL (per compatibilita' transforms)
        from PIL import Image
        try:
            image = Image.open(str(img_path)).convert("RGB")
        except Exception:
            # Immagine corrotta — restituisci placeholder nero
            image = Image.new("RGB", (224, 224), (0, 0, 0))

        if self.transform:
            image = self.transform(image)

        return image, label


def get_transforms(
    image_size: int = 224,
    is_training: bool = True,
) -> transforms.Compose:
    """Crea le trasformazioni per training e validazione."""
    if is_training:
        return transforms.Compose([
            transforms.RandomResizedCrop(image_size, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(20),
            transforms.ColorJitter(
                brightness=0.2,
                contrast=0.2,
                saturation=0.3,
                hue=0.05,
            ),
            transforms.RandomGrayscale(p=0.05),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
            transforms.RandomErasing(p=0.15, scale=(0.02, 0.15)),
        ])
    else:
        return transforms.Compose([
            transforms.Resize(int(image_size * 1.14)),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])


def build_model(
    num_classes: int,
    dropout: float = 0.3,
    pretrained: bool = True,
) -> nn.Module:
    """
    Costruisce EfficientNet-B0 con head personalizzata per la classificazione funghi.
    """
    weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.efficientnet_b0(weights=weights)

    # Sostituisci il classificatore finale
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=dropout, inplace=True),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(p=dropout * 0.5),
        nn.Linear(256, num_classes),
    )

    return model


def freeze_backbone(model: nn.Module) -> None:
    """Congela il backbone, allena solo il classificatore."""
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = False


def unfreeze_backbone(model: nn.Module) -> None:
    """Scongela tutto il modello per fine-tuning completo."""
    for param in model.parameters():
        param.requires_grad = True


def get_scheduler(
    optimizer: optim.Optimizer,
    scheduler_type: str,
    epochs: int,
    **kwargs: Any,
) -> Optional[Any]:
    """Crea lo scheduler per il learning rate."""
    if scheduler_type == "cosine":
        return optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=epochs, eta_min=1e-6
        )
    elif scheduler_type == "step":
        return optim.lr_scheduler.StepLR(
            optimizer,
            step_size=kwargs.get("step_size", 10),
            gamma=kwargs.get("gamma", 0.1),
        )
    elif scheduler_type == "plateau":
        return optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", factor=0.5, patience=5
        )
    return None


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device,
    epoch: int,
    total_epochs: int,
) -> Tuple[float, float]:
    """
    Esegue un'epoca di training.
    Returns: (loss_media, accuracy)
    """
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (inputs, labels) in enumerate(dataloader):
        inputs = inputs.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()

        # Gradient clipping per stabilita'
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    epoch_loss = running_loss / max(total, 1)
    epoch_acc = correct / max(total, 1)
    return epoch_loss, epoch_acc


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    """
    Valida il modello.
    Returns: (loss_media, accuracy)
    """
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for inputs, labels in dataloader:
            inputs = inputs.to(device)
            labels = labels.to(device)

            outputs = model(inputs)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    epoch_loss = running_loss / max(total, 1)
    epoch_acc = correct / max(total, 1)
    return epoch_loss, epoch_acc


def train_classifier(
    config: Optional[Dict[str, Any]] = None,
    data_dir: Optional[Path] = None,
) -> Path:
    """
    Addestra il classificatore EfficientNet-B0 per le specie fungine.

    La directory dati deve contenere sottocartelle per split:
        data_dir/
        ├── train/
        │   ├── boletus_edulis/
        │   ├── cantharellus_cibarius/
        │   └── ...
        ├── val/
        │   └── ...
        └── test/
            └── ...
    """
    if config is None:
        config = load_config()

    cls_config = config["classifier"]
    paths_config = config["paths"]
    species_list = config["species"]

    # Nomi classi dal config
    class_names = [s["id"] for s in species_list]
    num_classes = len(class_names)

    # Directory dati
    if data_dir is None:
        data_dir = ROOT / paths_config["raw_images"] / "inaturalist"

    # Output
    output_dir = ROOT / paths_config["models_output"] / "classifier"
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = output_dir / f"classifier_{timestamp}"
    run_dir.mkdir(parents=True, exist_ok=True)

    # Device
    console.print("\n[bold]Configurazione hardware...[/bold]")
    device_str = cls_config.get("device", "auto")
    if device_str == "auto":
        if torch.cuda.is_available():
            device = torch.device("cuda:0")
            console.print(f"  [green]GPU: {torch.cuda.get_device_name(0)}[/green]")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            device = torch.device("mps")
            console.print("  [green]Apple MPS[/green]")
        else:
            device = torch.device("cpu")
            console.print("  [yellow]CPU (lento!)[/yellow]")
    else:
        device = torch.device(device_str)

    # Info
    console.print(
        Panel(
            f"[bold green]Training Classificatore Specie[/bold green]\n\n"
            f"Modello: {cls_config['model']}\n"
            f"Classi ({num_classes}): {', '.join(class_names)}\n"
            f"Image size: {cls_config['image_size']}px\n"
            f"Epochs: {cls_config['epochs']}\n"
            f"Batch size: {cls_config['batch_size']}\n"
            f"Learning rate: {cls_config['learning_rate']}\n"
            f"Backbone freeze per i primi {cls_config['freeze_backbone_epochs']} epoch\n"
            f"Label smoothing: {cls_config['label_smoothing']}\n"
            f"Device: {device}\n"
            f"Data: {data_dir}\n"
            f"Output: {run_dir}",
            title="CercaFungo - Stage 2 Species Classification",
        )
    )

    # Trasformazioni
    image_size = cls_config["image_size"]
    train_transform = get_transforms(image_size, is_training=True)
    val_transform = get_transforms(image_size, is_training=False)

    # Dataset
    console.print("\n[bold]Caricamento dataset...[/bold]")

    # Verifica struttura directory
    # Se i dati sono in formato flat (specie/immagini), li usiamo per train
    # e creiamo val split al volo
    train_dir = data_dir / "train" if (data_dir / "train").exists() else data_dir
    val_dir = data_dir / "val" if (data_dir / "val").exists() else data_dir

    train_dataset = MushroomSpeciesDataset(train_dir, class_names, train_transform)
    val_dataset = MushroomSpeciesDataset(val_dir, class_names, val_transform)

    # Se non c'e' split separato, splitta dal train
    if train_dir == val_dir and len(train_dataset) > 0:
        console.print("  [dim]No val split trovato, creo split 80/20 dal train[/dim]")
        total = len(train_dataset)
        val_size = int(total * 0.2)
        train_size = total - val_size
        train_dataset, val_dataset = torch.utils.data.random_split(
            train_dataset,
            [train_size, val_size],
            generator=torch.Generator().manual_seed(42),
        )

    if len(train_dataset) == 0:
        console.print(
            "[red]Nessun dato di training trovato![/red]\n"
            f"[dim]Verifica che {data_dir} contenga sottocartelle per specie "
            f"con immagini.[/dim]"
        )
        sys.exit(1)

    console.print(f"  Train: {len(train_dataset)} immagini")
    console.print(f"  Val: {len(val_dataset)} immagini")

    # DataLoader
    num_workers = cls_config.get("num_workers", 4)
    train_loader = DataLoader(
        train_dataset,
        batch_size=cls_config["batch_size"],
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=cls_config["batch_size"],
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    # Modello
    console.print("\n[bold]Costruzione modello...[/bold]")
    model = build_model(
        num_classes=num_classes,
        dropout=cls_config.get("dropout", 0.3),
        pretrained=True,
    )
    model = model.to(device)

    # Conta parametri
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    console.print(
        f"  Parametri totali: {total_params:,}\n"
        f"  Parametri trainabili: {trainable_params:,}"
    )

    # Loss con label smoothing
    criterion = nn.CrossEntropyLoss(
        label_smoothing=cls_config.get("label_smoothing", 0.1)
    )

    # Optimizer
    optimizer = optim.AdamW(
        model.parameters(),
        lr=cls_config["learning_rate"],
        weight_decay=cls_config.get("weight_decay", 0.01),
    )

    # Scheduler
    scheduler = get_scheduler(
        optimizer,
        cls_config.get("scheduler", "cosine"),
        cls_config["epochs"],
        step_size=cls_config.get("step_size", 10),
        gamma=cls_config.get("gamma", 0.1),
    )

    # Freeze backbone per i primi N epoch
    freeze_epochs = cls_config.get("freeze_backbone_epochs", 5)
    if freeze_epochs > 0:
        freeze_backbone(model)
        console.print(
            f"  [cyan]Backbone congelato per i primi {freeze_epochs} epoch[/cyan]"
        )

    # Training loop
    console.print(f"\n[bold]Avvio training ({cls_config['epochs']} epochs)...[/bold]\n")

    best_val_acc = 0.0
    best_model_weights = None
    patience = cls_config.get("patience", 10)
    patience_counter = 0
    history: Dict[str, List[float]] = {
        "train_loss": [],
        "val_loss": [],
        "train_acc": [],
        "val_acc": [],
    }

    for epoch in range(1, cls_config["epochs"] + 1):
        # Scongela backbone dopo N epoch
        if epoch == freeze_epochs + 1:
            unfreeze_backbone(model)
            console.print(f"\n  [cyan]Epoch {epoch}: backbone scongelato, fine-tuning completo[/cyan]\n")
            # Riduci LR per il backbone
            for param_group in optimizer.param_groups:
                param_group["lr"] = cls_config["learning_rate"] * 0.1

        epoch_start = time.time()

        # Train
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device, epoch, cls_config["epochs"]
        )

        # Validate
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        # Scheduler step
        if scheduler:
            if isinstance(scheduler, optim.lr_scheduler.ReduceLROnPlateau):
                scheduler.step(val_loss)
            else:
                scheduler.step()

        epoch_time = time.time() - epoch_start
        current_lr = optimizer.param_groups[0]["lr"]

        # Log
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        # Formattazione con colori
        val_acc_color = "green" if val_acc > best_val_acc else "yellow"
        console.print(
            f"  Epoch {epoch:3d}/{cls_config['epochs']} | "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} | "
            f"[{val_acc_color}]Val Acc: {val_acc:.4f}[/{val_acc_color}] | "
            f"LR: {current_lr:.6f} | "
            f"Time: {epoch_time:.1f}s"
        )

        # Best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_weights = copy.deepcopy(model.state_dict())
            patience_counter = 0

            # Salva best
            best_path = run_dir / "best_model.pt"
            torch.save(
                {
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "val_acc": val_acc,
                    "val_loss": val_loss,
                    "class_names": class_names,
                    "num_classes": num_classes,
                    "image_size": image_size,
                },
                best_path,
            )
            console.print(f"    [green]Nuovo best! Val Acc: {val_acc:.4f} -> salvato {best_path.name}[/green]")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                console.print(
                    f"\n  [yellow]Early stopping: nessun miglioramento per {patience} epoch[/yellow]"
                )
                break

    # Salva last model
    last_path = run_dir / "last_model.pt"
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "class_names": class_names,
            "num_classes": num_classes,
            "image_size": image_size,
            "history": history,
        },
        last_path,
    )

    # Salva history
    import json
    with open(run_dir / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    # Salva class names
    with open(run_dir / "class_names.txt", "w") as f:
        for name in class_names:
            f.write(f"{name}\n")

    # Risultati finali
    console.print(
        Panel(
            f"[bold green]Training completato![/bold green]\n\n"
            f"Best Val Accuracy: {best_val_acc:.4f}\n"
            f"Epochs completate: {epoch}\n"
            f"Best model: {run_dir / 'best_model.pt'}\n"
            f"Last model: {run_dir / 'last_model.pt'}\n"
            f"History: {run_dir / 'training_history.json'}",
            title="Training Complete",
        )
    )

    return run_dir


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CercaFungo — Training classificatore specie fungine"
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Directory con dati di classificazione (sottocartelle per specie)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=None,
        help="Override numero epoch",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Override batch size",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Device: auto, cpu, cuda, mps",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=None,
        help="Override learning rate",
    )
    args = parser.parse_args()

    config = load_config()

    if args.epochs:
        config["classifier"]["epochs"] = args.epochs
    if args.batch_size:
        config["classifier"]["batch_size"] = args.batch_size
    if args.device:
        config["classifier"]["device"] = args.device
    if args.lr:
        config["classifier"]["learning_rate"] = args.lr

    data_dir = Path(args.data_dir) if args.data_dir else None
    train_classifier(config=config, data_dir=data_dir)
