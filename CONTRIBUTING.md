# Contributing

COSMIC LOOKBACK welcomes survey adapters, measurement modules, validation fixtures, interface improvements and scientific review.

Open an issue before a large change. State the scientific question, data release, licence, expected row count, provenance fields, validation plan and claim boundary. A survey is not marked integrated until its adapter records checksums, row conservation, schema mapping and quality gates.

For code changes:

1. create a branch;
2. keep archive downloads and multi-gigabyte derived files outside Git;
3. add a small deterministic fixture when an adapter or scientific transform needs verification;
4. run `npm run build` for the interface and the relevant scientific validation commands;
5. document observed, measured, inferred and simulated outputs distinctly.

Never describe a display subset as a representative scientific sample without a tested selection argument. Never label a model-enhanced image as an observation. Keep all variants from one astrophysical object in the same train/validation/test partition.

By contributing, you agree that your code contribution is licensed under MIT. Survey data retain their original licences and required acknowledgements.
