# Sulfur cube experiment fixtures

These fixtures preserve the Java Edition 26.2 player-melee validation evidence
recorded on 2026-09-02:

- `je26_2MeleeEndpointValidation.csv` contains all 100 completed endpoint cases;
- `je26_2MeleeExtremeValidation.json` preserves command aim, post-hit Motion and
  endpoints for the five named high-discrepancy rows;
- `je26_2NumericEdgeValidation.json` preserves source-boundary and row 44
  composed-mechanics oracles.

The source artifacts are:

- `minecraft-je-research/notes/in-game-data/sulfur_cube_endpoint/command_storage.dat`
- `minecraft-je-research/notes/in-game-data/sulfur_cube_endpoint/protocol-iterations/je26_2-melee-accuracy-matrix-accurate`

The `predicted_*` columns preserve the exact former Standard-backend results.
The `actual_*` columns are the full-precision stable feet positions decoded
from command storage after 40 unchanged samples. The endpoint fixture
deliberately excludes harness bookkeeping that does not affect model
evaluation. The focused JSON fixtures were produced by the source-audit
generator with SHA-256
`9386d4df2306d40f82ea6d83777eeec011760309c3dc3b47a9473f01e58cd5fe`.
