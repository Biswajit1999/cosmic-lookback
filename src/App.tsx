import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Audience = "explorer" | "student" | "researcher";
type FieldMode = "sources" | "mosaic";
type EpochBand = "all" | "nearby" | "noon" | "early" | "frontier";
type Source = {
  i: number; r: number; d: number; z: number; zl: number | null; zh: number | null;
  m: number | null; s: number | null; a: number | null; e: number | null;
  g: number | null; q: number | null;
};
type Catalog = {
  meta: {
    release: string; released: string; program: string; catalogRows: number;
    cleanGalaxyRows: number; sampleRows: number; filters: string[];
    sampleStrategy: string; ra: [number, number]; dec: [number, number];
  };
  redshiftHistogram: { edges: number[]; counts: number[] };
  redshiftMassDensity: { zEdges: number[]; massEdges: number[]; counts: number[][] };
  rows: Source[];
};
type Landmark = { name: string; z: number; column: number; row: number; field: string };

const LANDMARKS: Landmark[] = [
  { name: "CEERS 14448", z: 4.75, column: 0, row: 0, field: "CEERS" },
  { name: "NGDEEP 4321", z: 8.92, column: 1, row: 0, field: "NGDEEP" },
  { name: "PRIMER-COS 10539", z: 7.48, column: 2, row: 0, field: "PRIMER-COS" },
  { name: "CEERS 20320", z: 5.27, column: 0, row: 1, field: "CEERS" },
  { name: "JADES 9186", z: 4.99, column: 1, row: 1, field: "JADES" },
  { name: "PRIMER-UDS 17818", z: 6.4, column: 2, row: 1, field: "PRIMER-UDS" },
];

const BANDS: { id: EpochBand; label: string; range: [number, number]; note: string }[] = [
  { id: "all", label: "All epochs", range: [0, 15], note: "the complete clean sample" },
  { id: "nearby", label: "z 0–2", range: [0, 2], note: "the later universe" },
  { id: "noon", label: "z 2–4", range: [2, 4], note: "peak cosmic star formation" },
  { id: "early", label: "z 4–8", range: [4, 8], note: "early galaxy assembly" },
  { id: "frontier", label: "z 8–15", range: [8, 15.01], note: "the frontier sample" },
];

const SURVEYS = [
  { name: "NĀSADĪYA / DESI DR1", kind: "SPECTROSCOPY", status: "PIPELINE LINKED", count: "6,093,818", area: "DESI LSS footprint", band: "360–982.4 nm", role: "Measured redshift backbone and a proven multi-million-row delivery pattern.", image: "/legacy-survey-dr10.jpg", href: "https://github.com/Biswajit1999/NASADIYA-LIGHTCONE" },
  { name: "CEERS DR1", kind: "DEEP IMAGING", status: "OBJECT DATA LIVE", count: "87,345", area: "Extended Groth Strip", band: "7 NIRCam filters", role: "Development field for photometric redshift, structure and observation transfer.", image: "/ceers-full-field.png", href: "https://ceers.github.io/releases.html" },
  { name: "JADES", kind: "IMAGING + SPECTRA", status: "IMAGE LIVE · ADAPTER NEXT", count: ">45,000", area: "GOODS-S / GOODS-N", band: "NIRCam + NIRSpec", role: "Independent deep-field validation and secure spectroscopic redshifts.", image: "/jades-goods-s.png", href: "https://archive.stsci.edu/hlsp/jades" },
  { name: "COSMOS-Web", kind: "WIDE JWST", status: "REGISTRY", count: "784,016", area: "0.54 deg² release", band: "NIRCam + MIRI", role: "Rare-object statistics, environment tests and sealed cross-survey validation.", image: "/hubble-ultra-deep-field.jpg", href: "https://cosmos2025.iap.fr/catalog.html" },
  { name: "Legacy Surveys DR10", kind: "GROUND IMAGING", status: "REAL CUTOUT LIVE", count: "~2.8 billion", area: "~14,000 deg²", band: "optical + WISE", role: "Low-redshift image domain, morphology priors and telescope-transfer tests.", image: "/legacy-survey-dr10.jpg", href: "https://www.legacysurvey.org/dr10/description/" },
  { name: "HSC PDR3", kind: "GROUND IMAGING", status: "REGISTRY", count: ">600 deg²", area: "Wide + Deep + UltraDeep", band: "grizy + narrow bands", role: "Depth ladder and field-to-field tests from a ground-based observatory.", image: "/legacy-survey-dr10.jpg", href: "https://hsc-release.mtk.nao.ac.jp/doc/index.php/survey__pdr3/" },
];

const PIPELINE_STEPS = [
  ["01", "Acquire", "Archive-native FITS, catalogues, weight maps, PSFs and checksums."],
  ["02", "Harmonise", "WCS, units, masks, pixel scale, PSF, depth and rest-frame wavelength."],
  ["03", "Measure", "Sérsic structure, CAS, Gini–M₂₀, MID, colours and segmentation stability."],
  ["04", "Infer", "Full p(z), mass, SFR and AGN evidence with model and prior recorded."],
  ["05", "Transfer", "Degrade the same object to a target survey without inventing information."],
  ["06", "Validate", "Injection recovery, held-out fields, calibration, OOD detection and abstention."],
  ["07", "Publish", "Versioned Parquet, provenance manifests, APIs, figures and citable releases."],
] as const;

const AUDIENCE_COPY: Record<Audience, { label: string; eyebrow: string; atlas: string; analysis: string }> = {
  explorer: {
    label: "Explorer", eyebrow: "Plain-language view",
    atlas: "Each point is one real catalog source. Colour shows how far back in cosmic time its light began travelling.",
    analysis: "These charts show where the catalog is rich in data and where conclusions become less certain.",
  },
  student: {
    label: "Student", eyebrow: "Learning view",
    atlas: "The map plots measured sky positions from CEERS DR1. Colour encodes median photometric redshift, an inferred distance estimate from multi-band light.",
    analysis: "Selection, depth and redshift uncertainty shape these distributions. A falling count does not by itself mean galaxies were rarer.",
  },
  researcher: {
    label: "Researcher", eyebrow: "Technical view",
    atlas: "12,000 seeded records after STAR_FLAG=0, BAD_REGION_FLAG=0 and finite 0≤zphot≤15; plotted in catalog RA/Dec space.",
    analysis: "Population panels use all 76,979 clean rows. LP_Z_MED and LP_MASS_MED are LePHARE posterior medians; counts remain selection-convolved.",
  },
};

const formatter = new Intl.NumberFormat("en-US");

function OrbitMark() {
  return <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="3" fill="currentColor" /><ellipse cx="22" cy="22" rx="18" ry="8" fill="none" stroke="currentColor" /><ellipse cx="22" cy="22" rx="18" ry="8" fill="none" stroke="currentColor" transform="rotate(60 22 22)" /><ellipse cx="22" cy="22" rx="18" ry="8" fill="none" stroke="currentColor" transform="rotate(120 22 22)" /></svg>;
}

function Arrow() { return <span aria-hidden="true">↗</span>; }

function Status({ children, kind }: { children: React.ReactNode; kind: "observed" | "measured" | "inferred" | "simulated" }) {
  return <span className={`status status--${kind}`}>{children}</span>;
}

function LandmarkImage({ landmark, state = "observed" }: { landmark: Landmark; state?: "observed" | "matched" | "simulated" }) {
  const style = { "--sprite-x": `${landmark.column * 50}%`, "--sprite-y": `${landmark.row * 100}%` } as React.CSSProperties;
  return <div className={`landmark-image landmark-image--${state}`} style={style} role="img" aria-label={`${state === "simulated" ? "Modelled transfer of" : "Real JWST NIRCam image of"} ${landmark.name} at redshift ${landmark.z}`}><div className="landmark-image__pixels" /><span className="focus-ring" aria-hidden="true" />{state === "simulated" && <span className="pixel-grid" aria-hidden="true" />}</div>;
}

function SourceField({ sources, bounds, selected, onSelect }: { sources: Source[]; bounds: Catalog["meta"]; selected: Source | null; onSelect: (source: Source) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef(sources);
  sourceRef.current = sources;
  const toPoint = (source: Source, width: number, height: number) => {
    const pad = 24;
    const x = pad + ((bounds.ra[1] - source.r) / (bounds.ra[1] - bounds.ra[0])) * (width - pad * 2);
    const y = pad + ((bounds.dec[1] - source.d) / (bounds.dec[1] - bounds.dec[0])) * (height - pad * 2);
    return [x, y] as const;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * scale)); canvas.height = Math.max(1, Math.round(rect.height * scale));
      const context = canvas.getContext("2d"); if (!context) return;
      context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, rect.width, rect.height);
      const gradient = context.createRadialGradient(rect.width * 0.68, rect.height * 0.4, 20, rect.width * 0.5, rect.height * 0.5, rect.width * 0.7);
      gradient.addColorStop(0, "rgba(23,84,96,.26)"); gradient.addColorStop(.55, "rgba(8,19,30,.7)"); gradient.addColorStop(1, "rgba(3,6,10,.98)");
      context.fillStyle = gradient; context.fillRect(0, 0, rect.width, rect.height);
      context.strokeStyle = "rgba(155,194,208,.09)"; context.lineWidth = 1;
      for (let x = 24; x < rect.width; x += Math.max(70, rect.width / 10)) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke(); }
      for (let y = 24; y < rect.height; y += Math.max(60, rect.height / 7)) { context.beginPath(); context.moveTo(0, y); context.lineTo(rect.width, y); context.stroke(); }
      for (const source of sources) {
        const [x, y] = toPoint(source, rect.width, rect.height);
        context.fillStyle = source.z < 2 ? "#7ee7ff" : source.z < 4 ? "#bdff72" : source.z < 8 ? "#ffbd66" : "#ff6f91";
        const radius = source.z >= 8 ? 1.9 : source.q && source.q > 20 ? 1.65 : 1.1;
        context.globalAlpha = source.z >= 8 ? .95 : .66; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
      }
      context.globalAlpha = 1;
      if (selected && sources.some((source) => source.i === selected.i)) {
        const [x, y] = toPoint(selected, rect.width, rect.height); context.strokeStyle = "#fff"; context.lineWidth = 1.5;
        context.beginPath(); context.arc(x, y, 9, 0, Math.PI * 2); context.stroke(); context.beginPath(); context.moveTo(x - 14, y); context.lineTo(x - 6, y); context.moveTo(x + 6, y); context.lineTo(x + 14, y); context.moveTo(x, y - 14); context.lineTo(x, y - 6); context.moveTo(x, y + 6); context.lineTo(x, y + 14); context.stroke();
      }
    };
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw(); return () => observer.disconnect();
  }, [sources, selected, bounds]);

  const pickSource = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas || sources.length === 0) return;
    const rect = canvas.getBoundingClientRect(); let best = sources[0]; let bestDistance = Infinity;
    for (const source of sourceRef.current) { const [x, y] = toPoint(source, rect.width, rect.height); const distance = (event.clientX - rect.left - x) ** 2 + (event.clientY - rect.top - y) ** 2; if (distance < bestDistance) { bestDistance = distance; best = source; } }
    if (bestDistance < 625) onSelect(best);
  };
  return <canvas ref={canvasRef} className="source-canvas" onPointerDown={pickSource} role="img" aria-label={`${formatter.format(sources.length)} real CEERS catalog sources plotted by right ascension and declination. Use the source list after the map for keyboard selection.`} />;
}

function Histogram({ data }: { data: Catalog["redshiftHistogram"] }) {
  const width = 760, height = 282, left = 42, right = 14, top = 16, bottom = 38;
  const max = Math.max(...data.counts), chartW = width - left - right, chartH = height - top - bottom;
  return <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="hist-title hist-desc"><title id="hist-title">CEERS DR1 clean-source redshift distribution</title><desc id="hist-desc">Counts peak at lower photometric redshift and decline toward the early-universe frontier. The vertical count scale is logarithmic.</desc>
    {[0, 1, 2, 3].map((tick) => <line key={tick} x1={left} x2={width - right} y1={top + (chartH / 3) * tick} y2={top + (chartH / 3) * tick} />)}
    {data.counts.map((count, index) => { const barW = chartW / data.counts.length; const barH = (Math.log1p(count) / Math.log1p(max)) * chartH; const z = data.edges[index]; const fill = z < 2 ? "#7ee7ff" : z < 4 ? "#bdff72" : z < 8 ? "#ffbd66" : "#ff6f91"; return <rect key={z} x={left + index * barW + 1} y={top + chartH - barH} width={Math.max(1, barW - 2)} height={barH} fill={fill} opacity={.82} />; })}
    {[0, 3, 6, 9, 12, 15].map((tick) => <g key={tick}><line x1={left + (tick / 15) * chartW} x2={left + (tick / 15) * chartW} y1={height - bottom} y2={height - bottom + 5} /><text x={left + (tick / 15) * chartW} y={height - 14}>{tick}</text></g>)}<text className="axis-title" x={width / 2} y={height - 1}>MEDIAN PHOTOMETRIC REDSHIFT</text><text className="axis-note" x={left + 4} y={top + 12}>LOG COUNT</text>
  </svg>;
}

function DensityChart({ data }: { data: Catalog["redshiftMassDensity"] }) {
  const width = 760, height = 282, left = 46, right = 14, top = 16, bottom = 38;
  const cols = data.counts.length, rows = data.counts[0]?.length ?? 0, max = Math.max(1, ...data.counts.flat());
  const cellW = (width - left - right) / cols, cellH = (height - top - bottom) / rows;
  return <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="density-title density-desc"><title id="density-title">Photometric redshift and inferred stellar-mass density</title><desc id="density-desc">A binned view of the clean catalog. Brighter cells contain more sources.</desc>
    {data.counts.map((column, x) => column.map((count, y) => { const alpha = Math.log1p(count) / Math.log1p(max); return <rect key={`${x}-${y}`} x={left + x * cellW} y={top + (rows - y - 1) * cellH} width={cellW + .2} height={cellH + .2} fill={`rgba(126,231,255,${Math.max(.035, alpha)})`} />; }))}
    {[0, 3, 6, 9, 12].map((tick) => <text key={tick} x={left + (tick / 12) * (width - left - right)} y={height - 14}>{tick}</text>)}{[5, 7, 9, 11, 13].map((tick) => <text key={tick} x={30} y={top + ((13 - tick) / 8) * (height - top - bottom) + 4}>{tick}</text>)}<text className="axis-title" x={width / 2} y={height - 1}>PHOTOMETRIC REDSHIFT</text><text className="axis-title" transform="rotate(-90 10 145)" x={10} y={145}>LOG STELLAR MASS</text>
  </svg>;
}

function App() {
  const reducedMotion = useReducedMotion();
  const [catalog, setCatalog] = useState<Catalog | null>(null), [loadError, setLoadError] = useState("");
  const [audience, setAudience] = useState<Audience>("explorer"), [fieldMode, setFieldMode] = useState<FieldMode>("sources"), [band, setBand] = useState<EpochBand>("all");
  const [selected, setSelected] = useState<Source | null>(null), [query, setQuery] = useState(""), [searchMessage, setSearchMessage] = useState("");
  const [landmark, setLandmark] = useState(LANDMARKS[0]), [targetZ, setTargetZ] = useState(7.2), [depth, setDepth] = useState(68), [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null), drawerButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { fetch("/data/ceers-dr1-sample.json").then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then((payload: Catalog) => { setCatalog(payload); const initial = payload.rows.filter((source) => source.q && source.q > 8).sort((a, b) => Math.abs(a.z - 6.4) - Math.abs(b.z - 6.4))[0] ?? payload.rows[0]; setSelected(initial); }).catch(() => setLoadError("The catalog subset could not be loaded.")); }, []);
  useEffect(() => {
    if (!catalog || !window.location.hash) return;
    const alignHash = () => document.querySelector(window.location.hash)?.scrollIntoView({ block: "start", behavior: "auto" });
    window.requestAnimationFrame(() => window.requestAnimationFrame(alignHash));
    const timer = window.setTimeout(alignHash, 350);
    return () => window.clearTimeout(timer);
  }, [catalog]);
  useEffect(() => { if (!drawerOpen) return; drawerRef.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setDrawerOpen(false); window.requestAnimationFrame(() => drawerButtonRef.current?.focus()); } }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [drawerOpen]);

  const activeBand = BANDS.find((item) => item.id === band) ?? BANDS[0];
  const filtered = useMemo(() => catalog ? catalog.rows.filter((source) => source.z >= activeBand.range[0] && source.z < activeBand.range[1]) : [], [catalog, activeBand]);
  const nearby = useMemo(() => { if (!selected || filtered.length === 0) return filtered.slice(0, 6); const index = filtered.findIndex((source) => source.i === selected.i); const start = Math.max(0, index < 0 ? 0 : index - 2); return filtered.slice(start, start + 6); }, [filtered, selected]);
  const search = (event: FormEvent) => { event.preventDefault(); if (!catalog) return; const id = Number(query.replace(/\D/g, "")); const result = catalog.rows.find((source) => source.i === id); if (result) { setSelected(result); setBand("all"); setFieldMode("sources"); setSearchMessage(`Selected CEERS DR1 #${result.i}.`); } else setSearchMessage("That ID is not in the 12,000-source browser subset."); };

  const transferLoss = Math.max(0, targetZ - landmark.z), support = Math.max(9, Math.round(98 - transferLoss * 14 - (100 - depth) * .32));
  const interpretation = support >= 68 ? "SUPPORTED" : support >= 38 ? "CAUTION" : "ABSTAIN";
  const blur = .7 + transferLoss * .55 + (100 - depth) * .008, dim = Math.max(.34, 1 - transferLoss * .085 - (100 - depth) * .004);
  const currentCopy = AUDIENCE_COPY[audience];
  const closeDrawer = () => { setDrawerOpen(false); window.requestAnimationFrame(() => drawerButtonRef.current?.focus()); };

  return <div className="app" data-audience={audience}>
    <header className="topbar"><a href="#top" className="brand" aria-label="Cosmic Lookback home"><OrbitMark /><span>COSMIC<br />LOOKBACK</span></a><nav aria-label="Primary navigation"><a href="#network">Survey network</a><a href="#atlas">Atlas</a><a href="#pipeline">Pipeline</a><a href="#life">Life</a></nav><div className="audience-switch" aria-label="Explanation level"><span>VIEW</span>{(["explorer", "student", "researcher"] as Audience[]).map((item) => <button key={item} type="button" className={audience === item ? "is-active" : ""} aria-pressed={audience === item} onClick={() => setAudience(item)}>{AUDIENCE_COPY[item].label}</button>)}</div><button ref={drawerButtonRef} className="provenance-button" type="button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-controls="provenance">Data record <Arrow /></button></header>

    <main id="main">
      <section className="hero" id="top"><div className="hero-grid" aria-hidden="true" /><motion.div className="hero-copy" initial={reducedMotion ? false : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, ease: [0.2, 0.75, 0.25, 1] }}><div className="release-line"><span className="live-dot" /> MULTI-SURVEY MORPHOLOGY LAB <span>PUBLIC SCIENCE</span></div><h1>How much of a galaxy<br /><em>survives observation?</em></h1><p>Trace real galaxies across cosmic time, measure their structure, then test whether the same scientific conclusion survives a change in redshift, wavelength, depth or telescope.</p><div className="hero-actions"><a className="primary-action" href="#network">Enter the observatory <span>↓</span></a><a className="quiet-action" href="https://github.com/Biswajit1999/cosmic-lookback" target="_blank" rel="noreferrer">Open research repository</a></div><p className="author-line">Designed and researched by <b>Biswajit Jana</b></p></motion.div>
        <motion.figure className="survey-horizon" initial={reducedMotion ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }} transition={{ delay: .12, duration: 1.1, ease: [0.2, 0.75, 0.25, 1] }}><img src="/ceers-full-field.png" alt="Real James Webb NIRCam CEERS mosaic containing about 100,000 galaxies" /><span className="scan-line" aria-hidden="true" /><figcaption><span>REAL OBSERVATION · COMPOSITE MOSAIC</span><b>~100,000 galaxies in this field</b><small>NASA / ESA / CSA · CEERS · STScI</small></figcaption></motion.figure><div className="hero-orbit" aria-hidden="true"><span /><span /><span /><i /></div>
        <div className="hero-stats"><div><strong>6,093,818</strong><span>NĀSADĪYA DESI ROWS · LINKED</span></div><div><strong>{catalog ? formatter.format(catalog.meta.catalogRows) : "87,345"}</strong><span>CEERS ROWS · INTEGRATED</span></div><div><strong>{catalog ? formatter.format(catalog.meta.sampleRows) : "12,000"}</strong><span>REAL SOURCES · LIVE MAP</span></div><div><strong>6</strong><span>SURVEY DOMAINS · REGISTRY</span></div></div>
      </section>

      <section className="network section" id="network"><div className="section-heading"><div><span className="kicker">01 · FEDERATED SKY NETWORK</span><h2>Many windows.<br />One evidence graph.</h2></div><aside><b>Scale with provenance</b><p>Catalog size is not the same as scientific coverage. Every layer declares whether records are integrated, linked, or only registered for a future adapter.</p></aside></div>
        <div className="network-intro"><p className="lead-copy">A deep JWST pencil beam sees faint early structure. A wide ground survey measures context. Spectroscopy anchors distance and black-hole diagnostics. The project joins those views by sky coordinate and uncertainty while preserving each survey’s selection function.</p><div className="scale-callout"><span>REFERENCE PIPELINE</span><strong>6.09M</strong><b>observed DESI DR1 LSS rows</b><p>Validated in Biswajit Jana’s NĀSADĪYA LIGHTCONE across 4,205 spatial tiles. COSMIC LOOKBACK reuses its manifest, tiling and deterministic level-of-detail pattern.</p><a href="https://github.com/Biswajit1999/NASADIYA-LIGHTCONE" target="_blank" rel="noreferrer">Inspect NĀSADĪYA <Arrow /></a></div></div>
        <div className="survey-grid">{SURVEYS.map((survey) => <article className="survey-card" key={survey.name}><figure><img src={survey.image} alt={`Real survey observation representing ${survey.name}`} /><figcaption>{survey.kind}</figcaption></figure><div className="survey-card__body"><span className="survey-state">{survey.status}</span><h3>{survey.name}</h3><strong>{survey.count}</strong><small>{survey.area} · {survey.band}</small><p>{survey.role}</p><a href={survey.href} target="_blank" rel="noreferrer">Primary record <Arrow /></a></div></article>)}</div>
        <p className="registry-note"><b>Current release boundary.</b> CEERS has object-level data in this browser. NĀSADĪYA is a linked six-million-row repository. JADES and Legacy Surveys contribute real observation imagery here. COSMOS-Web and HSC are registry entries until their checksum-pinned adapters and validation reports are complete.</p>
      </section>

      <section className="timeline section" id="timeline"><div className="section-heading"><div><span className="kicker">02 · COSMIC LOOKBACK</span><h2>The universe is not<br />a single photograph.</h2></div><aside><b>Redshift is a time coordinate with a model</b><p>We observe along our past light cone. Converting redshift to age or distance requires an adopted cosmology and its uncertainties.</p></aside></div>
        <div className="timeline-track" role="img" aria-label="Cosmic timeline from the cosmic microwave background to today"><div className="timeline-axis"><span style={{ left: "1%" }}><i />380 kyr<b>CMB released</b><small>Planck</small></span><span style={{ left: "11%" }}><i />0.2–1 Gyr<b>Cosmic dawn</b><small>JWST frontier</small></span><span style={{ left: "27%" }}><i />2–4 Gyr<b>Cosmic noon</b><small>galaxy growth peak</small></span><span style={{ left: "67%" }}><i />8–11 Gyr<b>Assembly</b><small>DESI / HSC</small></span><span style={{ left: "96%" }}><i />13.8 Gyr<b>Today</b><small>local anchor</small></span></div><div className="timeline-scale"><span>z ≳ 1100</span><span>z 15–6</span><span>z 4–2</span><span>z 1–0.2</span><span>z 0</span></div></div>
        <div className="cosmology-grid"><article><span>SUPPORTED FRAMEWORK</span><h3>Hot early universe</h3><p>Expansion, primordial nucleosynthesis and the cosmic microwave background form a quantitative framework. Galaxy surveys test later structure growth; they do not directly observe the mathematical origin.</p></article><article><span>OPEN PHYSICS</span><h3>What preceded the hot phase?</h3><p>Inflation, bounce, ekpyrotic and cyclic scenarios make different claims about earlier conditions. Any comparison needs a prediction for CMB, primordial waves or large-scale structure.</p></article><article><span>CURRENT RESULT</span><h3>No verified previous-cycle imprint</h3><p>A 2022 Planck/WMAP search found no statistically significant low-variance circles or Hawking-point evidence after artefact controls. Absence of that signal does not test every cyclic model.</p><a href="https://arxiv.org/abs/2208.06021" target="_blank" rel="noreferrer">Read the test <Arrow /></a></article></div>
      </section>

      <section className="pipeline section" id="pipeline"><div className="section-heading"><div><span className="kicker">03 · SCIENTIFIC PIPELINE</span><h2>From archive pixel<br />to a claim that can fail.</h2></div><aside><b>Operator-ready</b><p>A telescope operator can inspect calibration context; a morphology scientist can reproduce every transform; a learner can see why a conclusion was withheld.</p></aside></div>
        <div className="pipeline-steps">{PIPELINE_STEPS.map(([index, title, copy]) => <article key={index}><span>{index}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <div className="science-question"><span>PRIMARY FALSIFIABLE QUESTION</span><blockquote>Over which region of signal-to-noise, intrinsic size, surface brightness, redshift and rest-frame wavelength is a morphology conclusion recoverable?</blockquote><div className="hypothesis-row"><p><b>H1</b> Image quality predicts failure better than redshift alone.</p><p><b>H2</b> Matching PSF, depth and wavelength reduces part of apparent morphology evolution.</p><p><b>H3</b> Calibrated abstention improves reliability under survey shift.</p></div></div>
      </section>

      <section className="atlas section" id="atlas"><div className="section-heading"><div><span className="kicker">04 · FIELD ATLAS</span><h2>Thousands of sources.<br />One navigable sky.</h2></div><aside><b>{currentCopy.eyebrow}</b><p>{currentCopy.atlas}</p></aside></div>
        <div className="atlas-shell"><div className="atlas-toolbar"><div className="mode-switch" role="group" aria-label="Field view"><button type="button" className={fieldMode === "sources" ? "is-active" : ""} onClick={() => setFieldMode("sources")}>12k source map</button><button type="button" className={fieldMode === "mosaic" ? "is-active" : ""} onClick={() => setFieldMode("mosaic")}>Real mosaic</button></div><form onSubmit={search}><label htmlFor="source-search">Find catalog ID</label><div><span>#</span><input id="source-search" inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. 62144" /><button type="submit">Locate</button></div></form><span className="search-message" aria-live="polite">{searchMessage}</span></div>
          <div className="epoch-filter" aria-label="Filter sources by redshift">{BANDS.map((item) => <button key={item.id} type="button" className={band === item.id ? "is-active" : ""} aria-pressed={band === item.id} onClick={() => setBand(item.id)}><span>{item.label}</span><small>{item.note}</small></button>)}</div>
          <div className="field-layout"><div className="field-stage"><div className="field-stage__meta"><span>RA {catalog?.meta.ra[0].toFixed(3)}° — {catalog?.meta.ra[1].toFixed(3)}°</span><b>{formatter.format(filtered.length)} / {formatter.format(catalog?.meta.sampleRows ?? 12000)} VISIBLE</b><span>DEC {catalog?.meta.dec[0].toFixed(3)}° — {catalog?.meta.dec[1].toFixed(3)}°</span></div>{loadError ? <div className="load-state">{loadError}</div> : !catalog ? <div className="load-state"><span className="loader" /> Loading public catalog…</div> : fieldMode === "sources" ? <SourceField sources={filtered} bounds={catalog.meta} selected={selected} onSelect={setSelected} /> : <figure className="mosaic-view"><img src="/ceers-full-field.png" alt="Real CEERS NIRCam deep-field mosaic" /><figcaption>Display mosaic · not a synthetic sky · switch to Source map for catalog coordinates</figcaption></figure>}<div className="field-legend"><span><i className="z1" />z 0–2</span><span><i className="z2" />z 2–4</span><span><i className="z3" />z 4–8</span><span><i className="z4" />z 8–15</span></div></div>
            <aside className="source-inspector" aria-live="polite"><div className="inspector-title"><div><span>SELECTED SOURCE</span><h3>{selected ? `CEERS DR1 #${selected.i}` : "Choose a point"}</h3></div><Status kind="measured">CATALOG</Status></div>{selected ? <><div className="coordinate-lock"><span>RA {selected.r.toFixed(6)}°</span><i /><span>DEC +{selected.d.toFixed(6)}°</span></div><div className="primary-redshift"><span>PHOTOMETRIC REDSHIFT <Status kind="inferred">INFERRED</Status></span><strong>{selected.z.toFixed(2)}</strong><small>{selected.zl !== null && selected.zh !== null ? `68% interval ${selected.zl.toFixed(2)} — ${selected.zh.toFixed(2)}` : "interval unavailable"}</small></div><div className="uncertainty-track" aria-label={`Redshift ${selected.z.toFixed(2)}`}><span style={{ left: `${Math.min(100, (selected.z / 15) * 100)}%` }} /><i style={{ left: `${Math.min(100, ((selected.zl ?? selected.z) / 15) * 100)}%`, width: `${Math.max(1, (((selected.zh ?? selected.z) - (selected.zl ?? selected.z)) / 15) * 100)}%` }} /></div><dl className="data-grid"><div><dt>Stellar mass <Status kind="inferred">INFERRED</Status></dt><dd>{selected.m === null ? "—" : `${selected.m.toFixed(2)} log M☉`}</dd></div><div><dt>Star formation <Status kind="inferred">INFERRED</Status></dt><dd>{selected.s === null ? "—" : `${selected.s.toFixed(2)} log M☉/yr`}</dd></div><div><dt>F444W magnitude <Status kind="measured">MEASURED</Status></dt><dd>{selected.g === null ? "—" : `${selected.g.toFixed(2)} AB`}</dd></div><div><dt>F444W signal/noise <Status kind="measured">MEASURED</Status></dt><dd>{selected.q === null ? "—" : selected.q.toFixed(1)}</dd></div><div><dt>Segment area <Status kind="measured">MEASURED</Status></dt><dd>{selected.a === null ? "—" : `${selected.a.toFixed(0)} px`}</dd></div><div><dt>Ellipticity <Status kind="measured">MEASURED</Status></dt><dd>{selected.e === null ? "—" : selected.e.toFixed(3)}</dd></div></dl><a className="inspector-action" href="#analysis">Place in population <Arrow /></a></> : <p>Select a point on the field or use the list below.</p>}</aside></div>
          <div className="source-ribbon" aria-label="Keyboard-selectable catalog sources"><span>FIELD QUEUE</span>{nearby.map((source) => <button key={source.i} type="button" className={selected?.i === source.i ? "is-active" : ""} onClick={() => setSelected(source)}><b>#{source.i}</b><span>z {source.z.toFixed(2)}</span><small>{source.g === null ? "F444W —" : `F444W ${source.g.toFixed(1)}`}</small></button>)}</div>
        </div>
      </section>

      <section className="analysis section" id="analysis"><div className="section-heading"><div><span className="kicker">05 · POPULATION ANALYSIS</span><h2>Patterns, with the<br />selection effects visible.</h2></div><aside><b>{currentCopy.eyebrow}</b><p>{currentCopy.analysis}</p></aside></div>{catalog && <div className="analysis-grid"><article className="analysis-panel analysis-panel--wide"><header><div><span>FULL CLEAN CATALOG · 76,979 SOURCES</span><h3>How sources are distributed through redshift</h3></div><Status kind="inferred">PHOTO-Z</Status></header><Histogram data={catalog.redshiftHistogram} /><footer><b>Read this carefully</b><p>Counts combine the real population with survey depth, detection completeness, photometric-redshift uncertainty and the area observed.</p></footer></article><article className="analysis-panel analysis-panel--wide"><header><div><span>REDSHIFT × PHYSICAL PROPERTY</span><h3>Where inferred stellar mass is constrained</h3></div><Status kind="inferred">LEPHARE</Status></header><DensityChart data={catalog.redshiftMassDensity} /><footer><b>Brighter cells mean more catalog rows</b><p>This is a density map, not a claim about intrinsic galaxy abundance. Mass is model-dependent.</p></footer></article><article className="analysis-panel signal-panel"><header><div><span>ACTIVE SOURCE</span><h3>Evidence quality</h3></div><span className={`verdict verdict--${selected && selected.q && selected.q > 10 ? "good" : "caution"}`}>{selected && selected.q && selected.q > 10 ? "USABLE" : "CHECK"}</span></header><div className="signal-orbit"><span style={{ "--score": `${Math.min(100, Math.max(0, selected?.q ?? 0) * 2)}%` } as React.CSSProperties}><b>{selected?.q === null || !selected ? "—" : selected.q.toFixed(1)}</b><small>F444W S/N</small></span></div><ul><li><b>Position</b><span>measured from detection image</span></li><li><b>Redshift</b><span>photometric posterior median</span></li><li><b>Morphology</b><span>not validated in this prototype</span></li></ul></article><article className="analysis-panel question-panel"><header><div><span>INTERPRETATION CHECK</span><h3>What can we ask?</h3></div></header><div className="question-list"><div><i>01</i><p><b>Observed?</b> Sky position, calibrated flux and source footprint.</p></div><div><i>02</i><p><b>Inferred?</b> Redshift, mass and star-formation rate depend on SED models.</p></div><div><i>03</i><p><b>Still unknown?</b> Whether a detailed morphology label survives poorer resolution.</p></div></div><a href="#transfer">Run an observation transfer <Arrow /></a></article></div>}</section>

      <section className="transfer section" id="transfer"><div className="section-heading"><div><span className="kicker">06 · OBSERVATION TRANSFER</span><h2>Change the instrument.<br />Watch certainty move.</h2></div><aside><b>Case-study laboratory</b><p>Six published JWST galaxies anchor this visual study. The target frame is explicitly simulated and removes information only.</p></aside></div><div className="landmark-rail">{LANDMARKS.map((item) => <button type="button" key={item.name} className={item.name === landmark.name ? "is-active" : ""} onClick={() => { setLandmark(item); setTargetZ(Math.max(item.z, 7.2)); }}><span className="landmark-thumb" style={{ "--sprite-x": `${item.column * 50}%`, "--sprite-y": `${item.row * 100}%` } as React.CSSProperties} /><b>{item.name}</b><small>z {item.z.toFixed(2)}</small></button>)}</div><div className="transfer-console"><div className="transfer-sequence"><article><header><span>01 · NATIVE</span><Status kind="observed">OBSERVED</Status></header><LandmarkImage landmark={landmark} /><dl><div><dt>Object</dt><dd>{landmark.name}</dd></div><div><dt>Redshift</dt><dd>{landmark.z.toFixed(2)}</dd></div><div><dt>Pixels</dt><dd>JWST NIRCam</dd></div></dl></article><i className="transfer-arrow" aria-hidden="true">→</i><article><header><span>02 · MATCH</span><Status kind="measured">TRANSFORM</Status></header><LandmarkImage landmark={landmark} state="matched" /><dl><div><dt>PSF</dt><dd>target matched</dd></div><div><dt>Sampling</dt><dd>rescaled</dd></div><div><dt>Rest-frame</dt><dd>aligned</dd></div></dl></article><i className="transfer-arrow" aria-hidden="true">→</i><article className="simulated-card" style={{ "--transfer-blur": `${blur}px`, "--transfer-dim": dim } as React.CSSProperties}><header><span>03 · TARGET</span><Status kind="simulated">SIMULATED</Status></header><LandmarkImage landmark={landmark} state="simulated" /><dl><div><dt>Target z</dt><dd>{targetZ.toFixed(2)}</dd></div><div><dt>Depth</dt><dd>{depth}%</dd></div><div><dt>Support</dt><dd>{support}%</dd></div></dl></article></div><div className="transfer-controls"><div><label htmlFor="target-z"><span>TARGET REDSHIFT</span><output>z = {targetZ.toFixed(2)}</output></label><input id="target-z" type="range" min={landmark.z} max="10" step="0.05" value={targetZ} onChange={(event) => setTargetZ(Number(event.target.value))} style={{ "--progress": `${((targetZ - landmark.z) / (10 - landmark.z)) * 100}%` } as React.CSSProperties} /></div><div><label htmlFor="depth"><span>RELATIVE DEPTH</span><output>{depth}%</output></label><input id="depth" type="range" min="20" max="100" step="1" value={depth} onChange={(event) => setDepth(Number(event.target.value))} style={{ "--progress": `${((depth - 20) / 80) * 100}%` } as React.CSSProperties} /></div><div className={`support-verdict support-verdict--${interpretation.toLowerCase()}`}><span>INTERPRETATION STATE</span><strong>{interpretation}</strong><p>{interpretation === "SUPPORTED" ? "Coarse structure remains within this prototype’s support region." : interpretation === "CAUTION" ? "Subtle features are unstable under the selected observation." : "Detailed morphology should be withheld at this information level."}</p></div></div></div></section>

      <section className="method section" id="method"><div className="section-heading"><div><span className="kicker">07 · EQUATIONS & EVIDENCE</span><h2>Every number declares<br />what kind of knowledge it is.</h2></div><aside><b>The mathematics is part of the interface</b><p>Definitions, assumptions, units and failure conditions sit beside results so another scientist can reproduce or reject them.</p></aside></div><div className="epistemic-grid"><article><Status kind="observed">OBSERVED</Status><h3>Telescope pixels</h3><p>Recorded by a public mission and tied to an archive product.</p></article><article><Status kind="measured">MEASURED</Status><h3>Pixel statistics</h3><p>Calculated directly from observed data with a stated method.</p></article><article><Status kind="inferred">INFERRED</Status><h3>Model-dependent</h3><p>Redshift and physical properties estimated from photometry.</p></article><article><Status kind="simulated">SIMULATED</Status><h3>Counterfactual</h3><p>A controlled view of how information changes under a target observation.</p></article></div><div className="equation-grid"><article><span>LIGHT CONE</span><code>1 + z = λ<sub>obs</sub> / λ<sub>rest</sub></code><p>Redshift maps an observed wavelength to the emitted rest-frame wavelength.</p></article><article><span>LOOKBACK TIME</span><code>t<sub>L</sub>(z) = ∫<sub>0</sub><sup>z</sup> dz′ / [(1+z′)H(z′)]</code><p>The age conversion depends on the adopted expansion model H(z).</p></article><article><span>SURFACE BRIGHTNESS</span><code>I<sub>obs</sub> ∝ I<sub>em</sub> / (1+z)<sup>4</sup></code><p>Tolman dimming rapidly erases low-surface-brightness structure.</p></article><article><span>RESOLUTION GATE</span><code>ρ = R<sub>e</sub> / FWHM<sub>PSF</sub></code><p>A dimensionless size-to-PSF ratio helps predict recoverability.</p></article><article><span>MORPHOLOGY RESPONSE</span><code>Δm = m[T(I)] − m[I]</code><p>The change in metric m after a declared observation transfer T.</p></article><article><span>RECOVERABILITY</span><code>P(|Δm| &lt; τ | S/N, ρ, μ, λ<sub>rest</sub>, field)</code><p>The project’s central output: where a conclusion remains within tolerance τ.</p></article></div></section>

      <section className="life section" id="life"><div className="section-heading"><div><span className="kicker">08 · LIFE & COSMIC CONTEXT</span><h2>A question this atlas<br />cannot answer alone.</h2></div><aside><b>Evidence ladder</b><p>Galaxy evolution sets the history of stars, metals and environments. A galaxy image is not a biosignature and cannot establish life.</p></aside></div><div className="life-ledger"><div className="life-zero"><span>CONFIRMED LIFE BEYOND EARTH</span><strong>0</strong><p>NASA states that no life beyond Earth has been found. COSMIC LOOKBACK will not turn a morphology score into a life claim.</p></div><ol><li><span>01</span><div><b>Cosmic environment</b><p>Galaxy mass, metallicity history, radiation field, merger history and black-hole activity define broad priors.</p></div><Status kind="inferred">CONTEXT</Status></li><li><span>02</span><div><b>Stellar and planetary system</b><p>Host-star age and chemistry, planet occurrence, orbit and energy balance narrow habitability.</p></div><Status kind="measured">CATALOGUE</Status></li><li><span>03</span><div><b>Atmospheric observation</b><p>Repeated spectra must recover molecules with instrument and stellar contamination modelled.</p></div><Status kind="observed">SPECTRUM</Status></li><li><span>04</span><div><b>Biosignature assessment</b><p>Biological and abiotic hypotheses are compared; false positives and false negatives remain explicit.</p></div><Status kind="inferred">MODEL TEST</Status></li></ol></div></section>

      <section className="sources section" id="sources"><div className="section-heading"><div><span className="kicker">09 · PRIMARY SOURCES</span><h2>Claims with a route<br />back to the archive.</h2></div></div><div className="source-links"><a href="https://ceers.github.io/releases.html" target="_blank" rel="noreferrer"><b>CEERS DR1</b><span>catalogue and release products</span><Arrow /></a><a href="https://archive.stsci.edu/hlsp/jades" target="_blank" rel="noreferrer"><b>JADES</b><span>MAST imaging, catalogues and spectra</span><Arrow /></a><a href="https://cosmos2025.iap.fr/catalog.html" target="_blank" rel="noreferrer"><b>COSMOS2025</b><span>COSMOS-Web DR1 catalogue</span><Arrow /></a><a href="https://data.desi.lbl.gov/doc/releases/dr1/" target="_blank" rel="noreferrer"><b>DESI DR1</b><span>spectroscopic release and statistics</span><Arrow /></a><a href="https://www.legacysurvey.org/dr10/description/" target="_blank" rel="noreferrer"><b>Legacy Surveys DR10</b><span>ground-based imaging description</span><Arrow /></a><a href="https://hsc-release.mtk.nao.ac.jp/doc/index.php/survey__pdr3/" target="_blank" rel="noreferrer"><b>HSC PDR3</b><span>survey layers and footprint</span><Arrow /></a><a href="https://science.nasa.gov/astrobiology/strategy/" target="_blank" rel="noreferrer"><b>NASA Astrobiology</b><span>habitability and biosignature strategy</span><Arrow /></a><a href="https://arxiv.org/abs/2307.04753" target="_blank" rel="noreferrer"><b>Yu et al. 2023</b><span>artificial-redshift morphology bias</span><Arrow /></a></div><p className="research-link">The full novelty audit, equations, data contracts, validation matrix and release gates are in <a href="https://github.com/Biswajit1999/cosmic-lookback/blob/main/docs/RESEARCH_PROGRAM.md" target="_blank" rel="noreferrer">the research programme</a>.</p></section>
    </main>

    <footer className="footer"><div className="brand"><OrbitMark /><span>COSMIC<br />LOOKBACK</span></div><p>Research and design by <b>Biswajit Jana</b><br />Multi-survey morphology recoverability laboratory · public science.</p><div className="footer-links"><a href="https://github.com/Biswajit1999/cosmic-lookback" target="_blank" rel="noreferrer">GitHub ↗</a><a href="#top">Return to top ↑</a></div></footer>

    <AnimatePresence>{drawerOpen && <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={closeDrawer}><motion.aside ref={drawerRef} id="provenance" tabIndex={-1} className="drawer" role="dialog" aria-modal="true" aria-labelledby="provenance-title" initial={reducedMotion ? false : { x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 30 }} onPointerDown={(event) => event.stopPropagation()}><button type="button" className="drawer-close" aria-label="Close data record" onClick={closeDrawer}>×</button><span className="kicker">DATA RECORD</span><h2 id="provenance-title">Real sources.<br />Traceable origin.</h2><dl><div><dt>Catalog</dt><dd>CEERS Public Data Release 1.0</dd></div><div><dt>Rows</dt><dd>87,345 total · 76,979 clean</dd></div><div><dt>Browser layer</dt><dd>12,000 seeded real records</dd></div><div><dt>Program</dt><dd>JWST ERS 1345</dd></div><div><dt>Catalog release</dt><dd>13 October 2025</dd></div><div><dt>Mosaic instrument</dt><dd>JWST NIRCam · 6-filter display</dd></div><div><dt>Catalog method</dt><dd>F150W+F200W+F277W+F356W detection; hot+cold Source Extractor catalogs</dd></div><div><dt>Browser filter</dt><dd>STAR_FLAG=0 · BAD_REGION_FLAG=0 · finite 0≤z≤15</dd></div></dl><div className="drawer-links"><a href="https://ceers.github.io/releases.html" target="_blank" rel="noreferrer">CEERS data releases <Arrow /></a><a href="https://science.nasa.gov/asset/webb/cosmic-evolution-early-release-science-ceers-survey-nircam-image/" target="_blank" rel="noreferrer">NASA mosaic record <Arrow /></a></div><p className="drawer-note">The atlas points and population counts come from the real CEERS DR1 catalog. The large field mosaic and six case-study frames are real public JWST imagery. Transfer blur, dimming, support and interpretation states are interactive prototype outputs, not released scientific measurements.</p></motion.aside></motion.div>}</AnimatePresence>
  </div>;
}

export default App;
