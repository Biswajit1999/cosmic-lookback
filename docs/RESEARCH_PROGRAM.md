# COSMIC LOOKBACK research programme

**Author and principal investigator:** Biswajit Jana  
**Version:** 0.2.0 · 14 September 2026  
**Status:** implementation-ready scientific programme; CEERS browser release operational

## Mission

COSMIC LOOKBACK is an open, multi-survey laboratory for a precise question:

> Over which region of image quality, intrinsic size, surface brightness, redshift and rest-frame wavelength are common galaxy-morphology measurements and interpretations observationally recoverable, and how much apparent morphological evolution remains after galaxies are compared under matched observing conditions?

The project joins deep space imaging, wide ground-based imaging, spectroscopy and cosmic-background constraints without pretending they are interchangeable. Its main scientific product is a **recoverability surface**: a measured probability that a structural quantity or classification remains within a pre-registered tolerance after a controlled change in observation.

The website is a control room for these results. It is not itself the result. A publishable release requires versioned data, executable methods, validation on held-out observations, uncertainty calibration, explicit failure boundaries and per-object provenance.

## What is scientifically new

Artificial redshifting, Sérsic fitting, non-parametric morphology, machine-learning classification and cross-survey adaptation already exist. FERENGI established a physically explicit artificial-redshifting method; MegaMorph/GALFITM developed wavelength-dependent structural fitting; CEERS studies have measured visual and quantitative morphology to high redshift; Yu et al. measured morphology biases by transferring DESI galaxies to CEERS-like conditions; DeepAstroUDA addresses cross-survey domain shift.

COSMIC LOOKBACK therefore makes a narrow claim. Its contribution is a survey-spanning benchmark in which **the stability of the scientific conclusion under observation transfer is the target quantity**, with:

- per-object transformations and provenance;
- matched rest-frame wavelength, PSF, pixel scale, depth and empirical background;
- continuous metric response and probabilistic label response;
- uncertainty decomposition and calibrated abstention;
- held-out survey and field validation;
- an operator interface that marks observed, measured, inferred, simulated, unavailable and out-of-domain quantities.

This is a proposed contribution, not proof that no similar project exists. The [novelty audit supplied with the project](SCIENTIFIC_DESIGN_AUDIT.md) documents the closest precedents and the boundaries of the claim.

## Relationship to NĀSADĪYA LIGHTCONE

Biswajit Jana’s [NĀSADĪYA LIGHTCONE](https://github.com/Biswajit1999/NASADIYA-LIGHTCONE) provides the scale and provenance reference. Its validated DESI DR1 LSS bundle contains **6,093,818 accepted observed rows** across **4,205 spatial tiles**, while its public browser uses a deterministic 125,000-row level of detail. COSMIC LOOKBACK will reuse four proven patterns:

1. archive-native identifiers remain attached to every row;
2. scientific analysis scans the intended parent table, while display selection is separately labelled;
3. large data are spatially partitioned and served by camera or query relevance;
4. every release has a manifest, checksums, input counts and row-conservation tests.

NĀSADĪYA maps the measured large-scale light cone. COSMIC LOOKBACK concentrates on image structure and asks whether morphology survives changes in observation. A future bridge can join spectroscopic DESI records to Legacy Surveys cutouts and transfer-validated morphology without copying the complete NĀSADĪYA bundle into this repository.

## Evidence hierarchy

| State | Meaning | Example | Required metadata |
|---|---|---|---|
| Observed | Recorded or calibrated telescope/archive product | JWST F277W cutout | programme, exposure, detector, calibration release, checksum |
| Measured | Algorithmic result from observed pixels | half-light radius, Gini, asymmetry | code version, mask, PSF, weight map, units, flags |
| Inferred | Model-dependent latent quantity | photometric redshift, mass, SFR | code, templates, priors, posterior reference |
| Simulated | Output of a declared counterfactual transform | CEERS image degraded to a ground-survey PSF | source and target conditions, seed, operator version |
| Unavailable | Missing or failed quality gate | metallicity without usable line spectroscopy | failure reason |
| Uncertain/OOD | Data exist but interpretation is outside calibration support | merger probability for an unresolved source | OOD score, coverage policy, abstention reason |

No output may silently change state. A simulated image must remain visibly distinct from a real observation, including in exports.

## Survey network

### Current object-level layer

**CEERS DR1.** The first browser release contains 87,345 public catalogue rows, 76,979 rows after the declared star, bad-region and finite-redshift gates, and a deterministic 12,000-record interactive layer. Population summaries use the full clean table. CEERS is the development field, not a claim to represent the entire universe. Source: [CEERS releases](https://ceers.github.io/releases.html).

### Linked scale layer

**NĀSADĪYA / DESI DR1 LSS.** The linked project contains 6,093,818 observed LSS rows. The official DESI DR1 contains 18,659,804 useful main-survey spectra, including 13,049,402 objects spectrally classified as galaxies. DESI supplies spectroscopic anchors, emission-line measurements, AGN diagnostics and a large-scale structure context. The COSMIC LOOKBACK registry must distinguish the user-curated LSS bundle count from the official full-release count. Source: [DESI DR1 documentation](https://data.desi.lbl.gov/doc/releases/dr1/).

### Next adapters

| Survey | Role | Published scale | First adapter deliverable |
|---|---|---:|---|
| JADES | deep independent field and NIRSpec validation | photometric catalogue over 45,000 sources in the referenced MAST release | cutout, PSF, weight, photo-z and spec-z resolver |
| COSMOS-Web / COSMOS2025 | wide JWST field and rare-object statistics | 784,016 catalogue sources; 694,341 with `warn_flag=0` | HEALPix catalogue partitions and sealed test set |
| Legacy Surveys DR10 | wide ground-based optical morphology domain | about 2.8 billion unique catalogue sources | cutout service, Tractor shapes, masks and PSF adapter |
| HSC PDR3 | depth ladder and ground-based field diversity | more than 600 deg² of nominal-depth multiband coverage in PDR3 | tract/patch resolver, forced photometry and PSF metadata |
| Hubble deep fields | high-resolution historical baseline | HUDF image contains nearly 10,000 galaxies | aligned cutout pairs for HST–JWST validation |
| Planck | early-universe boundary conditions | full-sky CMB products; photons released about 380,000 years after the Big Bang | hypothesis-level maps and likelihood references, never galaxy rows |

Primary access routes: [JADES MAST](https://archive.stsci.edu/hlsp/jades), [COSMOS2025 catalogue](https://cosmos2025.iap.fr/catalog.html), [Legacy Surveys DR10](https://www.legacysurvey.org/dr10/description/), [HSC PDR3](https://hsc-release.mtk.nao.ac.jp/doc/index.php/survey__pdr3/), [Hubble deep fields](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-deep-fields/) and [Planck legacy archive](https://pla.esac.esa.int/).

Rows from different surveys must not be summed and described as unique galaxies until positional, redshift and ambiguity-aware cross-matching is complete.

## Core equations

### Redshift and wavelength

\[
1+z=\frac{\lambda_{\mathrm{obs}}}{\lambda_{\mathrm{rest}}}.
\]

Morphology depends on rest-frame wavelength. Comparing a fixed observed filter over a wide redshift interval mixes structural evolution with different stellar populations. The pipeline selects or interpolates bands around pre-registered rest-frame windows.

### Expansion and lookback time

For a flat matter-plus-dark-energy reference cosmology,

\[
H(z)=H_0\sqrt{\Omega_m(1+z)^3+\Omega_r(1+z)^4+\Omega_\Lambda},
\]

\[
t_L(z)=\int_0^z\frac{dz'}{(1+z')H(z')}.
\]

Every exported distance or age records the cosmology identifier and parameter values. A photometric-redshift posterior is propagated through this nonlinear transform rather than replaced by a single exact age.

### Angular and surface-brightness transfer

For a source of fixed physical size, the angular scale follows the angular-diameter distance \(D_A(z)\). Cosmological surface brightness is reduced by the Tolman factor,

\[
I_{\mathrm{obs}}=\frac{I_{\mathrm{em}}}{(1+z)^4},
\]

before bandpass, luminosity evolution, PSF, sampling and detector noise are applied. The operator only moves from a higher-information observation to an equal- or lower-information target. It does not claim to reconstruct missing detail.

### Parametric morphology

The Sérsic profile is

\[
I(R)=I_e\exp\left\{-b_n\left[\left(\frac{R}{R_e}\right)^{1/n}-1\right]\right\},
\]

where \(R_e\) is the effective radius and \(n\) controls concentration. A fit is exported with covariance or posterior samples, sky model, PSF, neighbours, mask and convergence flags.

### Non-parametric morphology

The asymmetry statistic is evaluated with a documented centre and background correction,

\[
A=\frac{\sum |I-I_{180}|}{\sum |I|}-A_{\mathrm{background}}.
\]

The Gini coefficient measures the distribution of flux among segmentation pixels. \(M_{20}\) is the normalized second moment of the brightest 20% of the flux. Concentration, asymmetry and smoothness; Gini–\(M_{20}\); multimode, intensity and deviation; outer asymmetry and shape asymmetry form complementary measurements. No single scalar is treated as ground truth for a physical merger.

### Observation transfer and recoverability

Define the transfer operator

\[
T\!\left(I\mid z_t,\lambda_t,P_t,s_t,D_t,N_t\right),
\]

with target redshift \(z_t\), wavelength \(\lambda_t\), PSF \(P_t\), pixel scale \(s_t\), depth \(D_t\) and background/noise model \(N_t\). For any morphology quantity \(m\),

\[
\Delta_m=m[T(I)]-m[I_{\mathrm{reference}}].
\]

The central estimate is

\[
R_m(\tau\mid\mathbf{x})=P(|\Delta_m|<\tau\mid \mathrm{S/N},R_e/\mathrm{FWHM},\mu,\lambda_{\mathrm{rest}},z,\mathrm{field}),
\]

where \(\tau\) is a pre-registered tolerance. Classifier responses use probability-vector divergence, label-switch rate, Brier score, calibration error and an accuracy–coverage curve under abstention.

## Hypotheses and falsification

| ID | Prediction | Evidence required | Falsification condition |
|---|---|---|---|
| H1 | Information quality predicts morphology failure better than redshift alone | conditional model with held-out fields | a large residual redshift effect remains after conditioning on resolution, S/N and surface brightness |
| H2 | Matching PSF, depth, sampling and rest-frame wavelength reduces part of apparent morphology evolution | raw-versus-matched evolution curves with selection corrections | matched trends remain statistically and practically unchanged |
| H3 | Simple parametric quantities remain recoverable below the quality limit of asymmetry and clumpiness | metric-specific recovery surfaces | metrics share indistinguishable boundaries |
| H4 | Calibrated abstention reduces error under survey shift | held-out survey reliability and coverage curves | rejection does not improve conditional reliability or rejects protected scientific strata disproportionately |
| H5 | Physics-aware matching plus a modest model transfers as well as a more complex unmatched classifier | matched compute/data benchmark | the complex model is materially better calibrated on all held-out domains |

The first quantitative release focuses on approximately \(1.5\lesssim z\lesssim6\). Objects at \(6<z<10\) form a frontier/OOD stratum with coarser claims unless their quality cells are independently validated.

## End-to-end pipeline

1. **Acquire.** Resolve archive products; download or stream FITS, weight maps, exposure maps, PSFs and catalogue tables; record URLs, access date, licence and checksums.
2. **Validate inputs.** Confirm WCS, units, photometric calibration, dimensions, row count, unique key contract and finite-value rules. Quarantine failures.
3. **Partition.** Write immutable Parquet partitions by survey, release and HEALPix or field/tract/patch. Preserve a raw-to-canonical column map.
4. **Cross-match.** Use angular uncertainty, redshift compatibility and multiplicity flags. Keep all candidate matches and posterior or score; do not force ambiguous one-to-one links.
5. **Build cutouts.** Determine source-centred footprints, local background, masks, neighbours, segmentation and PSF. Attach weight or RMS maps.
6. **Measure.** Run parametric and non-parametric measurements in fixed rest-frame windows. Record software environment, seeds and configuration hash.
7. **Infer.** Store the full redshift posterior, SED assumptions and physical-property posterior references. Spectroscopic and photometric redshifts occupy separate fields.
8. **Transfer.** Apply wavelength mapping, flux/surface-brightness scaling, angular resampling, PSF matching and injection into empirical target backgrounds.
9. **Validate.** Use synthetic source injection, repeat observations, paired depth data, HST–JWST overlap and sealed fields. Compare simulated targets with real lower-information observations.
10. **Calibrate.** Fit recoverability surfaces and OOD/abstention policies only on the development folds.
11. **Freeze and test.** Lock thresholds, evaluate once on field- and survey-held-out sets, then publish every planned metric including null results.
12. **Release.** Export provenance manifests, row counts, checksums, schemas, model cards, figures and DOI-ready artefacts.

All filters, augmentations, simulated redshifts and visits belonging to one astrophysical object stay in the same data split. Random image splitting is prohibited.

## Canonical object contract

Every object record contains:

- canonical ID plus source survey/release/object IDs;
- ICRS sky position and positional uncertainty;
- cross-match candidates and ambiguity status;
- observed-product references, filters, exposures, calibration and checksums;
- segmentation, masks, PSFs, pixel scales, weight/RMS maps and quality flags;
- spectroscopic redshift with quality or photometric \(p(z)\) reference;
- morphology values, uncertainties, validity gates and method versions;
- inferred physical properties with templates, priors and posterior references;
- transfer inputs, target conditions, random seed and output checksums;
- OOD score, abstention state and human review history;
- provenance graph linking every derived field to inputs and code commit.

The browser receives columnar or typed-array summaries. Statistical analysis uses the scientific partitions, never the visual level-of-detail sample by accident.

## Scalable architecture

The present Vite application demonstrates interaction with 12,000 real points and summaries from 76,979 clean CEERS rows. The research system scales through:

```text
survey archive
  -> checksum-pinned acquisition
  -> immutable object store
  -> canonical Parquet + HEALPix partitions
  -> cutout / PSF / weight services
  -> measurement and transfer workers
  -> provenance + uncertainty registry
  -> query API / Arrow streams / GPU buffers
  -> browser control room + notebooks + release figures
```

DuckDB or Polars can scan local Parquet for development; distributed execution can use Dask, Ray or batch schedulers when the data justify it. The service contract is more important than the specific engine. A camera-aware sky view should request only relevant tiles, while full-catalogue statistics execute on the complete declared analysis selection.

## Black holes and other cosmic entities

The same evidence discipline applies beyond morphology:

- **AGN and black holes:** combine broad-line spectra, emission-line ratios, X-ray luminosity, radio excess, variability, mid-infrared colours and unresolved nuclear light. A compact centre alone cannot confirm an AGN.
- **Lenses:** model magnification and shear; keep cluster light and lens-model uncertainty distinct from blank-field morphology.
- **Stars and artefacts:** retain star classifiers, diffraction spikes, saturation, persistence and detector defects in the quality model rather than deleting every difficult case silently.
- **Groups, clusters and voids:** require selection functions, masks, random catalogues and validated estimators. A sparse browser view is not evidence for a physical void.
- **Transient or moving sources:** need epoch-aware association. Static coadds cannot establish variability by themselves.

## Origin-of-universe hypothesis desk

The hot Big Bang model describes the expansion from an early hot, dense state and successfully connects primordial nucleosynthesis, the cosmic microwave background and structure growth. Extrapolating the classical equations to a singularity does not by itself establish that the singularity was the absolute beginning of all physical reality.

Cyclic, ekpyrotic, bounce and conformal-cyclic models are legitimate theoretical research topics when they produce discriminating predictions. Steinhardt and Turok’s cyclic scenario proposes repeated bang/crunch epochs. Conformal Cyclic Cosmology has motivated searches for low-variance circles and Hawking-point signatures in CMB maps. A high-resolution 2022 Planck/WMAP analysis found no statistically significant evidence for those proposed signatures after artefact controls. This result constrains that search method; it does not prove that every possible pre–Big Bang model is false.

COSMIC LOOKBACK will maintain a hypothesis registry with prediction, observable, dataset, likelihood/test, result and status. Galaxy morphology may constrain structure-growth histories, but claims about a prior cycle require a quantitative causal path to an observable and comparison with the standard cosmological model.

Sources: [Steinhardt & Turok 2002](https://arxiv.org/abs/hep-th/0111030), [Bodnia et al. 2022](https://arxiv.org/abs/2208.06021), [Planck 2018 cosmological parameters](https://arxiv.org/abs/1807.06209).

## Life and habitability evidence ladder

NASA states that no life beyond Earth has been found. Galaxy data provide context, not a detection:

1. **Galactic environment:** star-formation and enrichment history, supernova/AGN radiation, dynamical stability and merger history.
2. **Stellar system:** age, activity, metallicity and multiplicity.
3. **Planet:** radius, mass, orbit, irradiation and atmospheric retention.
4. **Atmosphere/surface observation:** repeated, instrument-calibrated spectra or spatial data.
5. **Biosignature assessment:** joint molecules or patterns compared with abiotic production and false-positive scenarios.
6. **Independent confirmation:** different instruments, epochs, methods and teams.

The galaxy-scale layer may help define priors for where long-lived planetary environments can arise. It cannot rank individual inhabited worlds. See the [NASA Astrobiology Strategy](https://science.nasa.gov/astrobiology/strategy/), [NASA Habitable Environments and Biosignatures programme](https://www.nasa.gov/general/habitable-environments-and-biosignatures-heb/) and [NASA’s biosignature definition](https://science.nasa.gov/astrobiology/learning-resources/alp/what-is-a-biosignature/).

## Validation gates

| Gate | Pass condition | Failure response |
|---|---|---|
| Provenance | every released row resolves to a source product and checksum | block release |
| Row conservation | accepted + rejected equals scanned rows with named reasons | rebuild adapter |
| WCS and photometry | injected coordinate/flux fixtures recovered within tolerance | quarantine product |
| PSF model | star residual and encircled-energy checks pass per field/filter | exclude affected cell |
| Segmentation | injection completeness and split/merge rates reported | add uncertainty or abstain |
| Morphology | biases and interval coverage pass on synthetic and real repeats | withhold metric in failed cell |
| Transfer fidelity | simulated target reproduces paired real lower-quality data within tolerance | rebuild transfer/noise model |
| Redshift | photo-z calibration reported; core claims repeated on secure spec-z subset | weaken or remove claim |
| Domain shift | sealed field/survey calibration satisfies pre-registered bounds | abstain outside support |
| Accessibility | keyboard, text alternatives, contrast and reduced-motion checks pass | block web release |

## Release roadmap

- **R0 — current prototype:** CEERS DR1 browser, real survey imagery, evidence states, preliminary transfer interaction and research programme.
- **R1 — deterministic measurement pilot:** 500–1,000 CEERS galaxies across quality and redshift strata; PSF, segmentation, Sérsic and non-parametric measurements; injection tests.
- **R2 — validated transfer benchmark:** physically explicit observation operator, paired HST/JWST and depth tests, recoverability surfaces and frozen tolerances.
- **R3 — independent fields:** JADES validation followed by sealed COSMOS-Web evaluation; catalogue and cutout adapters with checksums.
- **R4 — spectroscopic bridge:** NĀSADĪYA/DESI and Legacy Surveys links; morphology–spectrum–AGN evidence graph.
- **R5 — community platform:** versioned query API, containerized workers, contribution templates, citable release artefacts and telescope-operator mode.

The smallest publishable unit is R2: a fixed benchmark sample, declared metrics, controlled transfers, held-out validation and quantitative failure boundaries. A classifier is optional.

## Primary methodological sources

- Barden, Jahnke & Häußler, **FERENGI: Redshifting Galaxies from SDSS to GEMS, STAGES, and COSMOS**, [arXiv:0812.1022](https://arxiv.org/abs/0812.1022).
- Vika et al., **MegaMorph: multi-wavelength measurement of galaxy structure**, [arXiv:1307.4996](https://arxiv.org/abs/1307.4996).
- Yu et al., **How galaxy morphology is affected by artificial redshifting to CEERS-like observations**, [arXiv:2307.04753](https://arxiv.org/abs/2307.04753).
- Kartaltepe et al., **CEERS key paper on the evolution of galaxy structure and morphology**, [arXiv:2210.14713](https://arxiv.org/abs/2210.14713).
- Ćiprijanović et al., **DeepAstroUDA: semi-supervised universal domain adaptation for galaxy morphology**, [arXiv:2302.02005](https://arxiv.org/abs/2302.02005).
- Weaver et al., **COSMOS2025**, [arXiv:2506.03243](https://arxiv.org/abs/2506.03243).
- Casey et al., **COSMOS-Web survey overview**, [arXiv:2211.07865](https://arxiv.org/abs/2211.07865).
- DESI Collaboration, **Data Release 1 documentation**, [official release](https://data.desi.lbl.gov/doc/releases/dr1/).

## Scientific limits

This release does not provide validated morphology classes, a real cosmological inference, evidence for a universe before the hot Big Bang, a black-hole census or evidence of extraterrestrial life. The interactive transfer support percentage is a clearly labelled interface prototype until R2 replaces it with an empirically calibrated recoverability probability. These limits are part of the product contract and must remain visible in derivative interfaces.
