"""
CercaFungo — Utilita' di visualizzazione per grafici e metriche.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from matplotlib.figure import Figure


def setup_plot_style() -> None:
    """Configura lo stile dei grafici per il progetto."""
    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update(
        {
            "figure.figsize": (12, 8),
            "font.size": 12,
            "axes.titlesize": 14,
            "axes.labelsize": 12,
            "figure.dpi": 100,
            "savefig.dpi": 150,
            "savefig.bbox": "tight",
        }
    )


def plot_confusion_matrix(
    cm: np.ndarray,
    class_names: List[str],
    title: str = "Matrice di Confusione",
    save_path: Optional[Path] = None,
    normalize: bool = True,
) -> Figure:
    """Genera una heatmap della matrice di confusione."""
    setup_plot_style()

    if normalize:
        # Normalizza per riga (per classe reale)
        row_sums = cm.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1  # Evita divisione per zero
        cm_display = cm.astype(float) / row_sums
        fmt = ".2f"
        vmin, vmax = 0, 1
    else:
        cm_display = cm
        fmt = "d"
        vmin, vmax = None, None

    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(
        cm_display,
        annot=True,
        fmt=fmt,
        cmap="YlOrRd",
        xticklabels=class_names,
        yticklabels=class_names,
        ax=ax,
        vmin=vmin,
        vmax=vmax,
        linewidths=0.5,
    )
    ax.set_xlabel("Predetto")
    ax.set_ylabel("Reale")
    ax.set_title(title)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path)
    return fig


def plot_training_curves(
    train_losses: List[float],
    val_losses: List[float],
    train_metrics: Optional[Dict[str, List[float]]] = None,
    val_metrics: Optional[Dict[str, List[float]]] = None,
    title: str = "Training Curves",
    save_path: Optional[Path] = None,
) -> Figure:
    """Plotta le curve di loss e metriche durante il training."""
    setup_plot_style()

    num_plots = 1 + (1 if train_metrics else 0)
    fig, axes = plt.subplots(1, num_plots, figsize=(7 * num_plots, 5))
    if num_plots == 1:
        axes = [axes]

    epochs = range(1, len(train_losses) + 1)

    # Loss
    axes[0].plot(epochs, train_losses, "b-", label="Train Loss", linewidth=2)
    axes[0].plot(epochs, val_losses, "r-", label="Val Loss", linewidth=2)
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].set_title("Loss")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Metriche aggiuntive
    if train_metrics and len(axes) > 1:
        colors = plt.cm.Set2(np.linspace(0, 1, len(train_metrics)))
        for idx, (name, values) in enumerate(train_metrics.items()):
            axes[1].plot(
                range(1, len(values) + 1),
                values,
                color=colors[idx],
                linestyle="-",
                label=f"Train {name}",
                linewidth=2,
            )
            if val_metrics and name in val_metrics:
                axes[1].plot(
                    range(1, len(val_metrics[name]) + 1),
                    val_metrics[name],
                    color=colors[idx],
                    linestyle="--",
                    label=f"Val {name}",
                    linewidth=2,
                )
        axes[1].set_xlabel("Epoch")
        axes[1].set_ylabel("Valore")
        axes[1].set_title("Metriche")
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)

    fig.suptitle(title, fontsize=16, y=1.02)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path)
    return fig


def plot_class_distribution(
    class_counts: Dict[str, int],
    title: str = "Distribuzione Classi",
    save_path: Optional[Path] = None,
) -> Figure:
    """Grafico a barre della distribuzione delle classi nel dataset."""
    setup_plot_style()

    names = list(class_counts.keys())
    counts = list(class_counts.values())

    # Colora diversamente le classi tossiche
    colors = []
    for name in names:
        name_lower = name.lower()
        if "amanita_phalloides" in name_lower or "mortale" in name_lower:
            colors.append("#d32f2f")  # Rosso scuro per mortali
        elif "amanita_muscaria" in name_lower or "tossic" in name_lower:
            colors.append("#ff7043")  # Arancione per tossici
        elif "sconosciut" in name_lower:
            colors.append("#9e9e9e")  # Grigio per sconosciuti
        else:
            colors.append("#4caf50")  # Verde per commestibili

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(names, counts, color=colors, edgecolor="white", linewidth=0.8)

    # Etichette sopra le barre
    for bar, count in zip(bars, counts):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(counts) * 0.01,
            str(count),
            ha="center",
            va="bottom",
            fontweight="bold",
            fontsize=10,
        )

    ax.set_xlabel("Specie")
    ax.set_ylabel("Numero Immagini")
    ax.set_title(title)
    plt.xticks(rotation=35, ha="right")
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path)
    return fig


def plot_detection_examples(
    images: List[np.ndarray],
    predictions: List[List[Tuple[float, float, float, float, float, str]]],
    ground_truths: Optional[List[List[Tuple[float, float, float, float, str]]]] = None,
    title: str = "Esempi di Detection",
    save_path: Optional[Path] = None,
    max_images: int = 9,
) -> Figure:
    """
    Mostra griglia di immagini con bbox predette e ground truth.
    predictions: lista di (x1, y1, x2, y2, confidence, class_name)
    ground_truths: lista di (x1, y1, x2, y2, class_name)
    """
    import cv2

    n = min(len(images), max_images)
    cols = min(3, n)
    rows = (n + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(6 * cols, 6 * rows))
    if rows == 1 and cols == 1:
        axes = np.array([[axes]])
    elif rows == 1:
        axes = axes[np.newaxis, :]
    elif cols == 1:
        axes = axes[:, np.newaxis]

    for idx in range(n):
        r, c = divmod(idx, cols)
        ax = axes[r][c]

        img = images[idx].copy()
        if img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Disegna ground truth in verde
        if ground_truths and idx < len(ground_truths):
            for x1, y1, x2, y2, cls_name in ground_truths[idx]:
                cv2.rectangle(
                    img,
                    (int(x1), int(y1)),
                    (int(x2), int(y2)),
                    (0, 255, 0),
                    2,
                )
                cv2.putText(
                    img,
                    f"GT: {cls_name}",
                    (int(x1), int(y1) - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    1,
                )

        # Disegna predizioni in blu
        if idx < len(predictions):
            for x1, y1, x2, y2, conf, cls_name in predictions[idx]:
                cv2.rectangle(
                    img,
                    (int(x1), int(y1)),
                    (int(x2), int(y2)),
                    (0, 100, 255),
                    2,
                )
                cv2.putText(
                    img,
                    f"{cls_name} {conf:.2f}",
                    (int(x1), int(y2) + 15),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 100, 255),
                    1,
                )

        ax.imshow(img)
        ax.set_title(f"Immagine {idx + 1}", fontsize=10)
        ax.axis("off")

    # Nascondi assi vuoti
    for idx in range(n, rows * cols):
        r, c = divmod(idx, cols)
        axes[r][c].axis("off")

    fig.suptitle(title, fontsize=16)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path)
    return fig


def plot_precision_recall_curve(
    precisions: Dict[str, List[float]],
    recalls: Dict[str, List[float]],
    title: str = "Curva Precision-Recall",
    save_path: Optional[Path] = None,
) -> Figure:
    """Plotta curve PR per ogni classe."""
    setup_plot_style()

    fig, ax = plt.subplots(figsize=(10, 7))
    colors = plt.cm.Set1(np.linspace(0, 1, len(precisions)))

    for idx, (cls_name, prec) in enumerate(precisions.items()):
        rec = recalls.get(cls_name, [])
        if prec and rec:
            ax.plot(rec, prec, color=colors[idx], linewidth=2, label=cls_name)

    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title(title)
    ax.legend(loc="lower left")
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.05])
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path)
    return fig
