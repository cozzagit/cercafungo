"""
CercaFungo — Augmentation personalizzate per scene boschive.

Pipeline di augmentation ottimizzate per il riconoscimento funghi
in ambiente naturale (sottobosco, luce variabile, ombre).
"""

from typing import Optional

import albumentations as A
import cv2
import numpy as np


def get_forest_detection_augmentation(image_size: int = 640) -> A.Compose:
    """
    Augmentation pipeline per il detector (Stage 1).
    Simula condizioni reali di sottobosco: luce screziata, ombre,
    fogliame, umidità, diversi orari del giorno.
    """
    return A.Compose(
        [
            # Geometriche
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.1),  # Raro ma possibile con foto dall'alto
            A.RandomRotate90(p=0.2),
            A.ShiftScaleRotate(
                shift_limit=0.1,
                scale_limit=0.2,
                rotate_limit=15,
                border_mode=cv2.BORDER_REFLECT_101,
                p=0.5,
            ),
            A.Perspective(scale=(0.02, 0.06), p=0.3),

            # Crop e resize — simula diverse distanze di osservazione
            A.RandomResizedCrop(
                size=(image_size, image_size),
                scale=(0.6, 1.0),
                ratio=(0.8, 1.2),
                p=0.4,
            ),

            # Colore — simula luce del bosco (screziata, golden hour, nuvole)
            A.OneOf(
                [
                    A.RandomBrightnessContrast(
                        brightness_limit=0.3, contrast_limit=0.3, p=1.0
                    ),
                    A.HueSaturationValue(
                        hue_shift_limit=15,
                        sat_shift_limit=30,
                        val_shift_limit=30,
                        p=1.0,
                    ),
                    A.ColorJitter(
                        brightness=0.2,
                        contrast=0.2,
                        saturation=0.3,
                        hue=0.05,
                        p=1.0,
                    ),
                ],
                p=0.8,
            ),

            # Simula condizioni atmosferiche
            A.OneOf(
                [
                    A.RandomFog(
                        fog_coef_lower=0.1,
                        fog_coef_upper=0.3,
                        alpha_coef=0.1,
                        p=1.0,
                    ),
                    A.RandomRain(
                        slant_lower=-10,
                        slant_upper=10,
                        drop_length=15,
                        drop_width=1,
                        drop_color=(180, 180, 180),
                        blur_value=3,
                        brightness_coefficient=0.8,
                        p=1.0,
                    ),
                    A.RandomShadow(
                        shadow_roi=(0, 0, 1, 1),
                        num_shadows_limit=(1, 3),
                        shadow_dimension=5,
                        p=1.0,
                    ),
                ],
                p=0.4,
            ),

            # Degradazione immagine — simula foto telefono in movimento
            A.OneOf(
                [
                    A.GaussianBlur(blur_limit=(3, 7), p=1.0),
                    A.MotionBlur(blur_limit=(3, 7), p=1.0),
                    A.GaussNoise(var_limit=(10, 40), p=1.0),
                ],
                p=0.3,
            ),

            # Normalizzazione CLAHE — migliora dettagli in ombra
            A.CLAHE(clip_limit=2.0, tile_grid_size=(8, 8), p=0.2),

            # Resize finale
            A.Resize(image_size, image_size),
        ],
        bbox_params=A.BboxParams(
            format="yolo",
            label_fields=["class_labels"],
            min_visibility=0.3,  # Scarta bbox troppo tagliate
        ),
    )


def get_forest_classification_augmentation(
    image_size: int = 224, is_training: bool = True
) -> A.Compose:
    """
    Augmentation pipeline per il classificatore (Stage 2).
    Più aggressivo sui colori perché la specie dipende molto
    dal colore del cappello/gambo.
    """
    if is_training:
        return A.Compose(
            [
                A.RandomResizedCrop(
                    size=(image_size, image_size),
                    scale=(0.7, 1.0),
                    ratio=(0.9, 1.1),
                ),
                A.HorizontalFlip(p=0.5),
                A.ShiftScaleRotate(
                    shift_limit=0.05,
                    scale_limit=0.1,
                    rotate_limit=20,
                    border_mode=cv2.BORDER_REFLECT_101,
                    p=0.5,
                ),
                # Colore — più conservativo per non alterare troppo
                # le caratteristiche cromatiche della specie
                A.RandomBrightnessContrast(
                    brightness_limit=0.2, contrast_limit=0.2, p=0.5
                ),
                A.HueSaturationValue(
                    hue_shift_limit=8,  # Poco hue shift, il colore e' diagnostico
                    sat_shift_limit=20,
                    val_shift_limit=20,
                    p=0.4,
                ),
                # Condizioni luce bosco
                A.RandomShadow(
                    shadow_roi=(0, 0, 1, 1),
                    num_shadows_limit=(1, 2),
                    shadow_dimension=5,
                    p=0.3,
                ),
                A.RandomFog(
                    fog_coef_lower=0.05,
                    fog_coef_upper=0.15,
                    alpha_coef=0.08,
                    p=0.15,
                ),
                # Qualita' foto
                A.OneOf(
                    [
                        A.GaussianBlur(blur_limit=(3, 5), p=1.0),
                        A.GaussNoise(var_limit=(5, 25), p=1.0),
                    ],
                    p=0.2,
                ),
                A.CLAHE(clip_limit=2.0, p=0.15),
                # Cutout — forza il modello a guardare piu' parti del fungo
                A.CoarseDropout(
                    max_holes=4,
                    max_height=int(image_size * 0.1),
                    max_width=int(image_size * 0.1),
                    fill_value=0,
                    p=0.2,
                ),
                A.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )
    else:
        # Validazione/Test — solo resize e normalizzazione
        return A.Compose(
            [
                A.Resize(image_size, image_size),
                A.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )


def apply_synthetic_shadow(
    image: np.ndarray,
    intensity: float = 0.4,
    num_shadows: int = 2,
) -> np.ndarray:
    """
    Applica ombre realistiche di alberi/foglie sull'immagine.
    Usato nella generazione sintetica per simulare luce del sottobosco.
    """
    h, w = image.shape[:2]
    result = image.copy().astype(np.float32)

    for _ in range(num_shadows):
        # Genera una forma organica per l'ombra (simula rami/foglie)
        mask = np.zeros((h, w), dtype=np.float32)

        # Punti casuali per un poligono irregolare
        num_points = np.random.randint(4, 8)
        points = []
        cx, cy = np.random.randint(0, w), np.random.randint(0, h)
        for _ in range(num_points):
            px = cx + np.random.randint(-w // 3, w // 3)
            py = cy + np.random.randint(-h // 3, h // 3)
            points.append([px, py])
        points = np.array(points, dtype=np.int32)

        cv2.fillPoly(mask, [points], 1.0)

        # Sfuma i bordi per renderla naturale
        blur_size = max(31, min(h, w) // 4) | 1  # Deve essere dispari
        mask = cv2.GaussianBlur(mask, (blur_size, blur_size), 0)

        # Applica l'ombra (scurisce)
        shadow_factor = 1.0 - (mask[..., np.newaxis] * intensity)
        result = result * shadow_factor

    return np.clip(result, 0, 255).astype(np.uint8)


def apply_dappled_light(
    image: np.ndarray,
    intensity: float = 0.3,
    num_spots: int = 5,
) -> np.ndarray:
    """
    Simula luce screziata che filtra attraverso le foglie (effetto chiazze di sole).
    Tipico del sottobosco in giornate soleggiate.
    """
    h, w = image.shape[:2]
    result = image.copy().astype(np.float32)

    light_mask = np.zeros((h, w), dtype=np.float32)

    for _ in range(num_spots):
        cx = np.random.randint(0, w)
        cy = np.random.randint(0, h)
        # Raggio variabile delle chiazze di luce
        radius = np.random.randint(min(h, w) // 15, min(h, w) // 5)

        y, x = np.ogrid[:h, :w]
        dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        spot = np.clip(1.0 - dist / radius, 0, 1)
        light_mask = np.maximum(light_mask, spot)

    # Sfuma
    blur_size = max(21, min(h, w) // 8) | 1
    light_mask = cv2.GaussianBlur(light_mask, (blur_size, blur_size), 0)

    # Schiarisce dove c'e' luce
    light_factor = 1.0 + (light_mask[..., np.newaxis] * intensity)
    result = result * light_factor

    return np.clip(result, 0, 255).astype(np.uint8)


def match_color_histogram(
    source: np.ndarray,
    target: np.ndarray,
    strength: float = 0.7,
) -> np.ndarray:
    """
    Adatta i colori del source (fungo ritagliato) al target (sfondo bosco).
    Fondamentale per rendere credibili le immagini sintetiche.
    Usa histogram matching per canale con blending controllato.
    """
    source_lab = cv2.cvtColor(source, cv2.COLOR_BGR2LAB).astype(np.float32)
    target_lab = cv2.cvtColor(target, cv2.COLOR_BGR2LAB).astype(np.float32)

    result = source_lab.copy()

    for ch in range(3):
        src_mean, src_std = source_lab[:, :, ch].mean(), source_lab[:, :, ch].std()
        tgt_mean, tgt_std = target_lab[:, :, ch].mean(), target_lab[:, :, ch].std()

        if src_std < 1e-6:
            continue

        # Normalizza e ri-scala al target
        matched = (source_lab[:, :, ch] - src_mean) * (tgt_std / src_std) + tgt_mean

        # Blending tra originale e matched
        result[:, :, ch] = (
            source_lab[:, :, ch] * (1 - strength) + matched * strength
        )

    result = np.clip(result, 0, 255).astype(np.uint8)
    return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)
