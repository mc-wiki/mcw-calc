# Sulfur Cube Launch Mechanics

Interactive Vue/SVG tool for Java Edition 26.3 sulfur-cube launch mechanics.

The repository registers it as `sulfurCube`; `data-view="compact"` selects the Wiki embed.

- `data/je26_3/` contains versioned values and source provenance.
- `model/`, `numerics/`, and `resolution/` contain pure mechanics.
- `presets/` assembles reader-facing scenarios from the pure layers.
- `input/` normalizes editable form values.
- `presentation/` maps model results to scene geometry.
- `components/` renders Codex controls and SVG views.
- `__tests__/` contains unit, regression, source-fixture, and presentation coverage.

Run `pnpm test`, `pnpm run type-check`, and `pnpm run build --base=/static/` before submission.
