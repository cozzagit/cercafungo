"""
CercaFungo — Classifier training v2 (Windows/CPU-safe).

Standalone script that avoids DataLoader multiprocessing issues on Windows.
Uses simple sequential data loading for reliability.
"""

import copy
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from torchvision import models, transforms

ROOT = Path(__file__).resolve().parent.parent

# ── Config ─────────────────────────────────────────────────────

DATA_DIR = ROOT / "data" / "classifier_dataset"
OUTPUT_DIR = ROOT / "models" / "classifier"
IMAGE_SIZE = 224
EPOCHS = 30
BATCH_SIZE = 16
LR = 0.0003
FREEZE_EPOCHS = 5
PATIENCE = 10
LABEL_SMOOTHING = 0.1
DROPOUT = 0.3


# ── Dataset ────────────────────────────────────────────────────

def load_image_paths(split_dir: Path, class_names: List[str]) -> List[Tuple[Path, int]]:
    samples = []
    for idx, name in enumerate(class_names):
        class_dir = split_dir / name
        if not class_dir.exists():
            continue
        for f in sorted(class_dir.iterdir()):
            if f.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                samples.append((f, idx))
    return samples


def load_batch(
    samples: List[Tuple[Path, int]],
    start: int,
    batch_size: int,
    transform,
) -> Tuple[torch.Tensor, torch.Tensor]:
    images = []
    labels = []
    end = min(start + batch_size, len(samples))
    for i in range(start, end):
        path, label = samples[i]
        try:
            img = Image.open(str(path)).convert("RGB")
            img_t = transform(img)
            images.append(img_t)
            labels.append(label)
        except Exception:
            continue
    if not images:
        return torch.zeros(1, 3, IMAGE_SIZE, IMAGE_SIZE), torch.zeros(1, dtype=torch.long)
    return torch.stack(images), torch.tensor(labels, dtype=torch.long)


# ── Transforms ─────────────────────────────────────────────────

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize(int(IMAGE_SIZE * 1.14)),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


# ── Model ──────────────────────────────────────────────────────

def build_model(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=DROPOUT, inplace=True),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(p=DROPOUT * 0.5),
        nn.Linear(256, num_classes),
    )
    return model


# ── Training ───────────────────────────────────────────────────

def train_epoch(model, samples, criterion, optimizer, device, transform):
    model.train()
    import random
    random.shuffle(samples)

    running_loss = 0.0
    correct = 0
    total = 0

    for start in range(0, len(samples), BATCH_SIZE):
        inputs, labels = load_batch(samples, start, BATCH_SIZE, transform)
        inputs, labels = inputs.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return running_loss / max(total, 1), correct / max(total, 1)


def validate(model, samples, criterion, device, transform):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for start in range(0, len(samples), BATCH_SIZE):
            inputs, labels = load_batch(samples, start, BATCH_SIZE, transform)
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    return running_loss / max(total, 1), correct / max(total, 1)


def main():
    print("=" * 60)
    print("CercaFungo — Classifier Training v2")
    print("=" * 60)

    # Load class names
    class_names_file = DATA_DIR / "class_names.txt"
    with open(class_names_file) as f:
        class_names = [l.strip() for l in f if l.strip()]

    num_classes = len(class_names)
    print(f"Classes: {num_classes}")

    # Load samples
    train_samples = load_image_paths(DATA_DIR / "train", class_names)
    val_samples = load_image_paths(DATA_DIR / "val", class_names)
    print(f"Train: {len(train_samples)} images")
    print(f"Val: {len(val_samples)} images")

    if not train_samples:
        print("ERROR: No training data!")
        sys.exit(1)

    # Device
    device = torch.device("cpu")
    print(f"Device: {device}")

    # Model
    model = build_model(num_classes).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Parameters: {total_params:,}")

    # Loss + optimizer
    criterion = nn.CrossEntropyLoss(label_smoothing=LABEL_SMOOTHING)
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    # Output
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = OUTPUT_DIR / f"classifier_{timestamp}"
    run_dir.mkdir(parents=True, exist_ok=True)

    # Freeze backbone
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = False
    print(f"Backbone frozen for first {FREEZE_EPOCHS} epochs")

    # Training loop
    print(f"\nStarting training ({EPOCHS} epochs)...\n")
    best_val_acc = 0.0
    best_weights = None
    patience_counter = 0
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    for epoch in range(1, EPOCHS + 1):
        # Unfreeze after N epochs
        if epoch == FREEZE_EPOCHS + 1:
            for param in model.parameters():
                param.requires_grad = True
            for pg in optimizer.param_groups:
                pg["lr"] = LR * 0.1
            print(f"  [Epoch {epoch}] Backbone unfrozen, LR reduced")

        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_samples, criterion, optimizer, device, train_transform)
        val_loss, val_acc = validate(model, val_samples, criterion, device, val_transform)
        scheduler.step()

        elapsed = time.time() - t0
        lr = optimizer.param_groups[0]["lr"]

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        marker = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_weights = copy.deepcopy(model.state_dict())
            patience_counter = 0
            marker = " << NEW BEST"

            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_acc": val_acc,
                "class_names": class_names,
                "num_classes": num_classes,
                "image_size": IMAGE_SIZE,
            }, run_dir / "best_model.pt")
        else:
            patience_counter += 1

        print(
            f"  Epoch {epoch:2d}/{EPOCHS} | "
            f"Train: {train_loss:.4f} / {train_acc:.3f} | "
            f"Val: {val_loss:.4f} / {val_acc:.3f} | "
            f"LR: {lr:.6f} | {elapsed:.0f}s{marker}"
        )
        sys.stdout.flush()

        if patience_counter >= PATIENCE:
            print(f"\n  Early stopping at epoch {epoch}")
            break

    # Save final
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "class_names": class_names,
        "num_classes": num_classes,
        "image_size": IMAGE_SIZE,
        "history": history,
    }, run_dir / "last_model.pt")

    with open(run_dir / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    with open(run_dir / "class_names.txt", "w") as f:
        for name in class_names:
            f.write(name + "\n")

    print(f"\n{'=' * 60}")
    print(f"Training complete!")
    print(f"Best Val Accuracy: {best_val_acc:.4f}")
    print(f"Output: {run_dir}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
