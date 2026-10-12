# Display-image transfer validation

This validation asks a deliberately limited question: how quickly does visible pixel structure in the five tracked public mission display images disappear under controlled resampling and additive noise?

## Data states and provenance

The inputs are real, publicly released mission or survey **display composites** already tracked in `public/`. SHA-256 receipts and analysis dimensions are written to `research/results/display-image-audit.json`. They are not calibrated FITS mosaics: their RGB mapping, resampling, contrast, crop, compression and annotation history need not be uniform.

The downsample/restore and Gaussian-noise products are explicitly **synthetic transformations**. No transformed image is described as an observation.

## Methods

`scikit-image` converts RGB to luminance, anti-aliases resampling, computes Sobel gradients, and evaluates structural similarity (SSIM). Each image is capped at 512 pixels on its longest side for deterministic runtime. Resolution trials reduce each axis by factors 2, 4, 8 and 16 before restoration. Noise trials add zero-mean Gaussian deviates with unit-range RMS 0.005, 0.01, 0.02 and 0.04 using seed 20261012.

Three diagnostics are retained: SSIM; Pearson correlation of Sobel-gradient maps; and the fraction of 256-bin luminance entropy retained. The SciencePlots figure is generated as both PNG and vector PDF.

## Interpretation boundary

These tests validate code paths and expose how the web assets respond to information loss. They do **not** measure galaxy morphology, compare telescope resolution, infer astrophysical evolution, or calibrate the proposed recoverability surface. Those claims require linear calibrated mosaics, a PSF, pixel scale, masks, weight maps, source segmentation, and object-level held-out observations.

Run with:

```bash
python -m pip install -r requirements-analysis.txt
pytest -q
python scripts/validate-image-transfer.py
```
