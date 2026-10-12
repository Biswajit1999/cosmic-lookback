"""Reproducible diagnostics for the tracked public survey display images.

These routines operate on rendered RGB outreach/display products, not calibrated
science mosaics.  Their outputs quantify pixel-structure recoverability only.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
from skimage import color, filters, io, metrics, transform, util


def load_luminance(path: str | Path, max_side: int = 512) -> np.ndarray:
    """Load an RGB display image as unit-range luminance and cap its dimensions."""
    image = util.img_as_float(io.imread(path))
    if image.ndim == 3:
        image = color.rgb2gray(image[..., :3])
    scale = min(1.0, max_side / max(image.shape))
    if scale < 1:
        shape = tuple(max(2, round(value * scale)) for value in image.shape)
        image = transform.resize(image, shape, anti_aliasing=True)
    return np.asarray(image, dtype=float)


def source_diagnostics(path: str | Path) -> dict[str, float | int | str]:
    """Summarize display-product provenance and non-photometric image content."""
    path = Path(path)
    image = load_luminance(path)
    gradient = filters.sobel(image)
    return {
        "file": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "analysis_height_px": int(image.shape[0]),
        "analysis_width_px": int(image.shape[1]),
        "luminance_p01": float(np.quantile(image, 0.01)),
        "luminance_p99": float(np.quantile(image, 0.99)),
        "shannon_entropy_bits": float(measure_entropy(image)),
        "sobel_rms": float(np.sqrt(np.mean(gradient**2))),
        "near_black_fraction": float(np.mean(image <= 0.01)),
        "near_white_fraction": float(np.mean(image >= 0.99)),
    }


def measure_entropy(image: np.ndarray, bins: int = 256) -> float:
    """Return base-2 histogram entropy for a unit-range image."""
    counts, _ = np.histogram(np.clip(image, 0, 1), bins=bins, range=(0, 1))
    probability = counts[counts > 0] / counts.sum()
    return float(-np.sum(probability * np.log2(probability)))


def gradient_correlation(reference: np.ndarray, candidate: np.ndarray) -> float:
    """Correlate gradient maps, returning zero if either map has no variance."""
    reference = np.asarray(reference).ravel()
    candidate = np.asarray(candidate).ravel()
    if np.std(reference) == 0 or np.std(candidate) == 0:
        return 0.0
    return float(np.corrcoef(reference, candidate)[0, 1])


def resolution_sweep(image: np.ndarray, factors=(2, 4, 8, 16)) -> list[dict]:
    """Downsample then restore an image and measure structural information loss."""
    reference_gradient = filters.sobel(image).ravel()
    rows = []
    for factor in factors:
        reduced_shape = tuple(max(2, value // factor) for value in image.shape)
        reduced = transform.resize(image, reduced_shape, anti_aliasing=True)
        restored = transform.resize(reduced, image.shape, anti_aliasing=True)
        gradient = filters.sobel(restored).ravel()
        rows.append(
            {
                "degradation": "resolution",
                "level": float(factor),
                "ssim": float(
                    metrics.structural_similarity(image, restored, data_range=1)
                ),
                "gradient_correlation": gradient_correlation(
                    reference_gradient, gradient
                ),
                "entropy_retained_fraction": measure_entropy(restored)
                / measure_entropy(image),
            }
        )
    return rows


def noise_sweep(
    image: np.ndarray,
    sigmas=(0.005, 0.01, 0.02, 0.04),
    seed: int = 20261012,
) -> list[dict]:
    """Add declared synthetic Gaussian display noise and measure recoverability."""
    rng = np.random.default_rng(seed)
    reference_gradient = filters.sobel(image).ravel()
    rows = []
    for sigma in sigmas:
        degraded = np.clip(image + rng.normal(0, sigma, image.shape), 0, 1)
        rows.append(
            {
                "degradation": "gaussian_noise",
                "level": float(sigma),
                "ssim": float(
                    metrics.structural_similarity(image, degraded, data_range=1)
                ),
                "gradient_correlation": gradient_correlation(
                    reference_gradient, filters.sobel(degraded)
                ),
                "entropy_retained_fraction": measure_entropy(degraded)
                / measure_entropy(image),
            }
        )
    return rows
