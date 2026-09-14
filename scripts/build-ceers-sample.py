"""Build the compact browser dataset from the public CEERS DR1 FITS catalogue.

The FITS file is intentionally not committed. Download ceers_cat_v1.0.fits.gz
from https://web.corral.tacc.utexas.edu/ceersdata/DR1/Catalog/ and run:

    python scripts/build-ceers-sample.py path/to/ceers_cat_v1.0.fits.gz
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from astropy.table import Table


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "ceers-dr1-sample.json"
SAMPLE_SIZE = 12_000
SEED = 1345


def number(value: object, digits: int) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return round(parsed, digits)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the downloaded ceers_cat_v1.0.fits.gz path.")

    table = Table.read(Path(sys.argv[1]))
    star = np.asarray(table["STAR_FLAG"], dtype=float)
    bad = np.asarray(table["BAD_REGION_FLAG"], dtype=float)
    redshift = np.asarray(table["LP_Z_MED"], dtype=float)
    clean_mask = (star == 0) & (bad == 0) & np.isfinite(redshift) & (redshift >= 0) & (redshift <= 15)
    clean_indices = np.flatnonzero(clean_mask)

    rng = np.random.default_rng(SEED)
    sample_indices = np.sort(
        rng.choice(clean_indices, size=min(SAMPLE_SIZE, len(clean_indices)), replace=False)
    )

    z_bins = np.arange(0, 15.5, 0.5)
    z_counts, _ = np.histogram(redshift[clean_mask], bins=z_bins)
    mass = np.asarray(table["LP_MASS_MED"], dtype=float)
    mass_mask = clean_mask & np.isfinite(mass) & (mass >= 5) & (mass <= 13)
    density, z_edges, mass_edges = np.histogram2d(
        redshift[mass_mask], mass[mass_mask], bins=[np.arange(0, 12.5, 0.5), np.arange(5, 13.5, 0.5)]
    )

    rows = []
    for idx in sample_indices:
        flux = number(table["F444W_FLUX"][idx], 2)
        flux_err = number(table["F444W_FLUXERR_EMP"][idx], 2)
        snr = None if flux is None or flux_err in (None, 0) else round(flux / flux_err, 2)
        rows.append(
            {
                "i": int(table["NUMBER"][idx]),
                "r": number(table["RA"][idx], 6),
                "d": number(table["DEC"][idx], 6),
                "z": number(table["LP_Z_MED"][idx], 3),
                "zl": number(table["LP_Z_MED68_LOW"][idx], 3),
                "zh": number(table["LP_Z_MED68_HIGH"][idx], 3),
                "m": number(table["LP_MASS_MED"][idx], 3),
                "s": number(table["LP_SFR_MED"][idx], 3),
                "a": number(table["ISO_AREA"][idx], 1),
                "e": number(table["ELLIPTICITY"][idx], 3),
                "g": number(table["F444W_MAG"][idx], 2),
                "q": snr,
            }
        )

    ra = np.asarray(table["RA"], dtype=float)[clean_mask]
    dec = np.asarray(table["DEC"], dtype=float)[clean_mask]
    payload = {
        "meta": {
            "release": "CEERS Public Data Release 1.0",
            "released": "2025-10-13",
            "program": "JWST ERS 1345",
            "catalogRows": len(table),
            "cleanGalaxyRows": int(clean_mask.sum()),
            "sampleRows": len(rows),
            "filters": ["F115W", "F150W", "F200W", "F277W", "F356W", "F410M", "F444W"],
            "sampleStrategy": f"Seeded random sample ({SEED}) after STAR_FLAG=0, BAD_REGION_FLAG=0, finite 0≤z≤15",
            "ra": [round(float(np.nanmin(ra)), 6), round(float(np.nanmax(ra)), 6)],
            "dec": [round(float(np.nanmin(dec)), 6), round(float(np.nanmax(dec)), 6)],
        },
        "redshiftHistogram": {
            "edges": [round(float(value), 1) for value in z_bins],
            "counts": z_counts.astype(int).tolist(),
        },
        "redshiftMassDensity": {
            "zEdges": [round(float(value), 1) for value in z_edges],
            "massEdges": [round(float(value), 1) for value in mass_edges],
            "counts": density.astype(int).tolist(),
        },
        "rows": rows,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
    print(json.dumps(payload["meta"], indent=2))


if __name__ == "__main__":
    main()
