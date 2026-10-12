"""Validate structural recoverability in tracked public display imagery."""

from __future__ import annotations

import csv
import json
from pathlib import Path
import sys

import matplotlib.pyplot as plt
import numpy as np
import scienceplots  # noqa: F401

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from research.image_transfer import (  # noqa: E402
    load_luminance,
    noise_sweep,
    resolution_sweep,
    source_diagnostics,
)

IMAGES = sorted(ROOT.glob("public/*.*"))
IMAGES = [path for path in IMAGES if path.suffix.lower() in {".jpg", ".jpeg", ".png"}]
OUT = ROOT / "research" / "results"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sources = [source_diagnostics(path) for path in IMAGES]
    transfer = []
    for path in IMAGES:
        image = load_luminance(path)
        for row in resolution_sweep(image) + noise_sweep(image):
            transfer.append({"file": path.name, **row})

    (OUT / "display-image-audit.json").write_text(
        json.dumps(
            {
                "data_kind": "real public mission display composites",
                "derived_kind": "synthetic resolution/noise transformations",
                "sources": sources,
                "limitations": (
                    "Rendered RGB display products lack calibrated flux, PSF, weight maps, "
                    "masks, and a common angular pixel scale. Results are pixel-structure "
                    "diagnostics and cannot support galaxy morphology or survey comparisons."
                ),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    with (OUT / "display-image-transfer.csv").open(
        "w", newline="", encoding="utf-8"
    ) as stream:
        writer = csv.DictWriter(stream, fieldnames=list(transfer[0]))
        writer.writeheader()
        writer.writerows(transfer)

    labels = [Path(row["file"]).stem.replace("-", "\n") for row in sources]
    with plt.style.context(["science", "no-latex", "bright"]):
        fig, axes = plt.subplots(1, 3, figsize=(11.2, 3.6), constrained_layout=True)
        entropy = [row["shannon_entropy_bits"] for row in sources]
        gradient = [row["sobel_rms"] for row in sources]
        axes[0].scatter(
            entropy, gradient, s=65, c=np.arange(len(sources)), cmap="viridis"
        )
        for x, y, label in zip(entropy, gradient, labels, strict=True):
            axes[0].annotate(
                label.replace("\n", " "),
                (x, y),
                xytext=(4, 4),
                textcoords="offset points",
                fontsize=6,
            )
        axes[0].set(
            xlabel="Luminance entropy [bit]",
            ylabel="Sobel RMS",
            title="(a) Display structure",
        )

        for path in IMAGES:
            rows = [
                row
                for row in transfer
                if row["file"] == path.name and row["degradation"] == "resolution"
            ]
            axes[1].semilogx(
                [row["level"] for row in rows],
                [row["ssim"] for row in rows],
                "o-",
                label=path.stem,
            )
        axes[1].set(
            xlabel="Linear downsampling factor",
            ylabel="SSIM after restoration",
            title="(b) Resolution loss",
            ylim=(0, 1.02),
        )

        for path in IMAGES:
            rows = [
                row
                for row in transfer
                if row["file"] == path.name and row["degradation"] == "gaussian_noise"
            ]
            axes[2].semilogx(
                [row["level"] for row in rows],
                [row["ssim"] for row in rows],
                "o-",
                label=path.stem,
            )
        axes[2].set(
            xlabel="Synthetic noise RMS [0--1]",
            ylabel="SSIM",
            title="(c) Noise sensitivity",
            ylim=(0, 1.02),
        )
        axes[2].legend(fontsize=5.5, frameon=False, loc="lower left")
        fig.suptitle("COSMIC LOOKBACK: display-image transfer diagnostics")
        fig.savefig(OUT / "display-image-transfer.png", dpi=240)
        fig.savefig(OUT / "display-image-transfer.pdf")
        plt.close(fig)


if __name__ == "__main__":
    main()
