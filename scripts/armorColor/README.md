# Java armor dye recipes

Regenerate the binary tables with `pnpm exec tsx scripts/generateArmorDyes.ts` and a C++17 compiler on the path. Set `CXX` to select a compiler. The normal site build uses the checked-in tables.

The generator starts with undyed armor and visits colors in increasing order of total dye consumption. Each edge adds one to eight dyes in the same craft. After processing a budget, only the previous eight layers can contribute to a later budget. The search ends after all those layers are empty. It checks the last craft and its cost for every reachable RGB before writing the tables.

For the large layers, the generator partitions colors and dye batches by their RGB sums and brightness. A pair of bounding boxes can be skipped when its entire output range already has cheaper recipes. The resulting gamut contains 5,713,438 RGB values, matching the [independent exhaustive count](https://anrar4.github.io/DyeLeatherArmor/).

The worker reads the compressed reachability bitset and the recipe shard for the winning color's high red nibble. It constructs short recipes using an index through five dyes and an inverse search for final batches of one or two dyes. The generator stores complete witnesses for the other colors. Each returned row represents one craft.
