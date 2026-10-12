# COSMIC LOOKBACK

[Open the live scientific observatory](https://biswajit1999.github.io/cosmic-lookback/)

> A multi-survey galaxy-morphology laboratory that measures whether a scientific conclusion survives a change in redshift, wavelength, depth, pixel scale or telescope resolution.

**Author and principal investigator: [Biswajit Jana](https://github.com/Biswajit1999)**

COSMIC LOOKBACK combines a real CEERS DR1 catalogue explorer, population diagnostics, public telescope imagery and an observation-transfer workbench. The project’s proposed scientific contribution is a reproducible **morphology recoverability benchmark** with per-object provenance, held-out survey validation, uncertainty calibration and explicit abstention outside validated support.

## Current release

| Layer | State | Scale |
|---|---|---:|
| CEERS DR1 catalogue | object data integrated | 87,345 real rows |
| CEERS clean population | full aggregate analysis | 76,979 rows |
| CEERS browser field | deterministic real-record display | 12,000 rows |
| NĀSADĪYA / DESI DR1 LSS | linked research pipeline | 6,093,818 observed rows |
| JADES, Legacy Surveys, Hubble | real image references | survey imagery |
| COSMOS-Web, HSC PDR3 | adapter registry | not yet object-level integrated |

The interface states this boundary directly. Registered survey counts are not added together as unique galaxies, and browser level-of-detail records are not used as a scientific selection.

## Scientific programme

Read the [research programme](docs/RESEARCH_PROGRAM.md) for the mission, equations, survey matrix, falsifiable hypotheses, canonical object contract, architecture, validation gates, origin-of-universe hypothesis desk, life-evidence ladder and release roadmap.

The extended [scientific design and novelty audit](docs/SCIENTIFIC_DESIGN_AUDIT.md) compares the proposed contribution with artificial redshifting, multi-band Sérsic fitting, existing JWST morphology catalogues, domain adaptation and citizen-science work.

The core question is:

> Over which region of signal-to-noise, intrinsic size, surface brightness, redshift and rest-frame wavelength is a galaxy-morphology conclusion recoverable?

The current transfer control is an interface prototype. Its support percentage is labelled simulated and must not be used as a scientific probability. A later release will replace it with recovery surfaces calibrated through injection, repeat-observation and held-out field tests.

The [display-image transfer validation](docs/DISPLAY_IMAGE_VALIDATION.md) now provides a reproducible `scikit-image` audit of the five tracked public RGB composites, including resolution-loss and synthetic-noise sweeps. It is intentionally a pixel-structure check, not a morphology measurement: the rendered web images lack calibrated flux, PSFs, masks, weights and a common angular scale.

## Run locally

```bash
npm install
npm run dev
```

Build the production bundle:

```bash
npm run build
```

## Rebuild the CEERS browser product

Download `ceers_cat_v1.0.fits.gz` from the official CEERS DR1 catalogue directory, then run:

```bash
python scripts/build-ceers-sample.py path/to/ceers_cat_v1.0.fits.gz
```

The script writes `public/data/ceers-dr1-sample.json`. The committed product includes a fixed real-record browser subset plus distributions computed from the full clean selection.

## Primary data and image records

- [CEERS releases](https://ceers.github.io/releases.html)
- [NASA CEERS NIRCam mosaic](https://science.nasa.gov/asset/webb/cosmic-evolution-early-release-science-ceers-survey-nircam-image/)
- [JADES MAST high-level science product](https://archive.stsci.edu/hlsp/jades)
- [NASA JADES GOODS-S image](https://science.nasa.gov/asset/webb/jwst-advanced-deep-extragalactic-survey-nircam-image/)
- [NASA Hubble Ultra Deep Field](https://science.nasa.gov/asset/hubble/hubble-ultra-deep-field-image-reveals-galaxies-galore/)
- [Legacy Surveys DR10](https://www.legacysurvey.org/dr10/description/)
- [DESI DR1](https://data.desi.lbl.gov/doc/releases/dr1/)
- [COSMOS2025 catalogue](https://cosmos2025.iap.fr/catalog.html)
- [HSC PDR3](https://hsc-release.mtk.nao.ac.jp/doc/index.php/survey__pdr3/)

Public imagery remains credited to its source mission and release. The MIT licence covers project code and documentation; it does not replace survey data licences or acknowledgement requirements.

## Relationship to NĀSADĪYA LIGHTCONE

[NĀSADĪYA LIGHTCONE](https://github.com/Biswajit1999/NASADIYA-LIGHTCONE) is Biswajit Jana’s survey-native redshift and cosmic-time browser. Its six-million-row DESI workflow supplies a proven pattern for immutable manifests, deterministic display layers, spatial partitioning and source-row provenance. COSMIC LOOKBACK adds the image-domain question: whether measured or classified structure survives controlled observation transfer.

## Citation and contribution

Citation metadata are in [CITATION.cff](CITATION.cff). Scientific contributions should follow [CONTRIBUTING.md](CONTRIBUTING.md). Cite every survey product used in an analysis in addition to this software.

## Licence

Code and original documentation are available under the [MIT License](LICENSE). Survey data and imagery retain their original terms.
