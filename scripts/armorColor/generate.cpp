// Generate Java armor colors in order of minimum dye cost. Compile without fast-math:
// Minecraft rounds the multiplication and division separately to IEEE single precision.
#include <algorithm>
#include <array>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
constexpr int colorCount = 1 << 24;
constexpr int undyed = colorCount;
constexpr int maxBatch = 8;
using Components = std::array<int, 4>; // R, G, B, brightest input channel

Components unpack(int rgb) {
    int r = rgb >> 16, g = (rgb >> 8) & 255, b = rgb & 255;
    return {r, g, b, std::max({r, g, b})};
}

struct Batch {
    Components sum;
    uint32_t dyes; // One four-bit palette index per dye in crafting order.
    int size;
};

std::array<Components, 16> palette;
std::vector<Batch> batches;
std::array<std::vector<int>, maxBatch + 1> bySize;

void makeBatches(int first, Components sum, uint32_t dyes, int size) {
    if (size > 0) {
        bySize[size].push_back(static_cast<int>(batches.size()));
        batches.push_back({sum, dyes, size});
    }
    if (size == maxBatch) return;
    for (int i = first; i < 16; ++i) {
        Components next = sum;
        for (int c = 0; c < 4; ++c) next[c] += palette[i][c];
        makeBatches(i, next, (dyes << 4) | i, size + 1);
    }
}

// Each invocation processes a whole layer with the same divisor.
template<int N>
int mix(const Components& armor, const Components& sum) {
    int r = (armor[0] + sum[0]) / N;
    int g = (armor[1] + sum[1]) / N;
    int b = (armor[2] + sum[2]) / N;
    int peak = std::max({r, g, b});
    float brightness = static_cast<float>(armor[3] + sum[3]) / N;
    return (static_cast<int>(r * brightness / peak) << 16) |
           (static_cast<int>(g * brightness / peak) << 8) |
           static_cast<int>(b * brightness / peak);
}

using Mix = int (*)(const Components&, const Components&);
constexpr Mix mixers[] = {nullptr, mix<1>, mix<2>, mix<3>, mix<4>, mix<5>,
                          mix<6>, mix<7>, mix<8>, mix<9>};

struct Witness {
    int parent, batch;
};

std::vector<Witness> witnesses(colorCount);
std::vector<uint8_t> cost(colorCount), crafts(colorCount), reconstructible(colorCount);
std::vector<int> reached;

// Only the cheapest prefix can belong to a cheapest recipe. Among equal-cost witnesses
// prefer fewer crafting steps. Keep track of those the web worker can construct itself.
void record(int rgb, int parent, int batch, int budget, bool small) {
    int rounds = parent == undyed ? 1 : crafts[parent] + 1;
    if (cost[rgb] == 0) {
        cost[rgb] = budget;
        reached.push_back(rgb);
    } else if (cost[rgb] != budget) {
        return;
    }
    if (small) reconstructible[rgb] = true;
    if (crafts[rgb] == 0 || rounds < crafts[rgb]) {
        crafts[rgb] = rounds;
        witnesses[rgb] = {parent, batch};
    }
}

void buildCore() {
    std::array<size_t, maxBatch + 1> ends{};
    for (int budget = 1; budget <= maxBatch; ++budget) {
        for (int k = 1; k <= budget; ++k) {
            if (k == budget) {
                for (int id : bySize[k]) record(mixers[k]({}, batches[id].sum), undyed, id, budget, budget <= 5);
                continue;
            }
            for (size_t i = ends[budget - k - 1]; i < ends[budget - k]; ++i) {
                int parent = reached[i];
                Components base = unpack(parent);
                bool small = budget <= 5 || (budget <= 7 && k <= 2 && reconstructible[parent]);
                for (int id : bySize[k]) {
                    int rgb = mixers[k + 1](base, batches[id].sum);
                    record(rgb, parent, id, budget, small);
                }
            }
        }
        ends[budget] = reached.size();
    }
}

struct Point {
    Components value;
    int id;
};

struct Box {
    Components low, high;
    int first, last;
    int left = -1, right = -1, spread = 0;
};

// Partition both the parent colors and the dye sums. Whole pairs of boxes can often
// be discarded before testing a single craft, especially for large final batches.
struct Tree {
    std::vector<Point> points;
    std::vector<Box> nodes;

    int build(int first, int last, int leafSize) {
        Box box{points[first].value, points[first].value, first, last};
        for (int i = first + 1; i < last; ++i) {
            for (int c = 0; c < 4; ++c) {
                box.low[c] = std::min(box.low[c], points[i].value[c]);
                box.high[c] = std::max(box.high[c], points[i].value[c]);
            }
        }
        int axis = 0;
        for (int c = 0; c < 4; ++c) {
            int width = box.high[c] - box.low[c];
            if (width > box.spread) {
                axis = c;
                box.spread = width;
            }
        }
        int index = static_cast<int>(nodes.size());
        nodes.push_back(box);
        if (last - first > leafSize) {
            int mid = (first + last) / 2;
            std::nth_element(points.begin() + first, points.begin() + mid, points.begin() + last,
                [axis](const Point& a, const Point& b) {
                    if (a.value[axis] == b.value[axis]) return a.id < b.id;
                    return a.value[axis] < b.value[axis];
                });
            int left = build(first, mid, leafSize);
            int right = build(mid, last, leafSize);
            nodes[index].left = left;
            nodes[index].right = right;
        } else {
            // A total order inside a leaf makes equal-cost witness selection reproducible
            // across standard libraries with different nth_element implementations.
            std::sort(points.begin() + first, points.begin() + last,
                      [](const Point& a, const Point& b) { return a.id < b.id; });
        }
        return index;
    }
};

constexpr int side = 257;
std::vector<int> holes(side * side * side);

// Summed-volume table of colors without a cheaper recipe. Freeze it for the whole
// budget so every equal-cost alternative can still improve the number of crafts.
void snapshot() {
    for (int r = 0; r < 256; ++r) {
        for (int g = 0; g < 256; ++g) {
            int row = 0;
            for (int b = 0; b < 256; ++b) {
                int i = ((r + 1) * side + g + 1) * side + b + 1;
                row += cost[(r << 16) | (g << 8) | b] == 0;
                holes[i] = row + holes[i - side] + holes[i - side * side] - holes[i - side * side - side];
            }
        }
    }
}

bool covered(const std::array<int, 3>& low, const std::array<int, 3>& high) {
    const int* a = &holes[low[0] * side * side];
    const int* b = &holes[(high[0] + 1) * side * side];
    int g0 = low[1] * side, g1 = (high[1] + 1) * side;
    int b0 = low[2], b1 = high[2] + 1;
    return b[g1+b1] - a[g1+b1] - b[g0+b1] + a[g0+b1]
         - b[g1+b0] + a[g1+b0] + b[g0+b0] - a[g0+b0] == 0;
}

template<int N>
void search(const Tree& parents, int parentNode, const Tree& dyes, int dyeNode, int budget) {
    const auto& p = parents.nodes[parentNode];
    const auto& d = dyes.nodes[dyeNode];
    std::array<int, 3> low, high;
    for (int c = 0; c < 3; ++c) {
        low[c] = (p.low[c] + d.low[c]) / N;
        high[c] = (p.high[c] + d.high[c]) / N;
    }
    int minPeak = *std::max_element(low.begin(), low.end());
    int maxPeak = *std::max_element(high.begin(), high.end());
    float minBrightness = static_cast<float>(p.low[3] + d.low[3]) / N;
    float maxBrightness = static_cast<float>(p.high[3] + d.high[3]) / N;
    for (int c = 0; c < 3; ++c) {
        low[c] = static_cast<int>(low[c] * minBrightness / maxPeak);
        high[c] = std::min(static_cast<int>(maxBrightness), static_cast<int>(high[c] * maxBrightness / minPeak));
    }
    if (covered(low, high)) return;
    if (d.left >= 0 && (p.left < 0 || d.spread >= p.spread)) {
        search<N>(parents, parentNode, dyes, d.left, budget);
        search<N>(parents, parentNode, dyes, d.right, budget);
    } else if (p.left >= 0) {
        search<N>(parents, p.left, dyes, dyeNode, budget);
        search<N>(parents, p.right, dyes, dyeNode, budget);
    } else {
        for (int j = d.first; j < d.last; ++j) {
            const auto& batch = dyes.points[j];
            for (int i = p.first; i < p.last; ++i) {
                const auto& parent = parents.points[i];
                int rgb = mix<N>(parent.value, batch.value);
                if (cost[rgb] == 0 || cost[rgb] == budget) record(rgb, parent.id, batch.id, budget, false);
            }
        }
    }
}

using Search = void (*)(const Tree&, int, const Tree&, int, int);
constexpr Search searches[] = {nullptr, search<2>, search<3>, search<4>, search<5>,
                               search<6>, search<7>, search<8>, search<9>};

void completeGamut() {
    std::array<Tree, maxBatch + 1> dyeTrees, layers;
    for (int k = 1; k <= maxBatch; ++k) {
        auto& tree = dyeTrees[k];
        for (int id : bySize[k]) tree.points.push_back({batches[id].sum, id});
        tree.build(0, static_cast<int>(tree.points.size()), 4);
    }
    for (int rgb : reached) layers[cost[rgb]].points.push_back({unpack(rgb), rgb});
    for (auto& layer : layers) {
        if (!layer.points.empty()) layer.build(0, static_cast<int>(layer.points.size()), 16);
    }
    int lastDiscovery = maxBatch;
    for (int budget = maxBatch + 1; budget <= lastDiscovery + maxBatch; ++budget) {
        auto& next = layers[budget % layers.size()];
        next = Tree{};
        size_t first = reached.size();
        snapshot();
        for (int k = 1; k <= maxBatch; ++k) {
            const auto& parents = layers[(budget - k) % layers.size()];
            if (!parents.points.empty()) searches[k](parents, 0, dyeTrees[k], 0, budget);
        }
        for (size_t i = first; i < reached.size(); ++i) next.points.push_back({unpack(reached[i]), reached[i]});
        if (!next.points.empty()) {
            lastDiscovery = budget;
            next.build(0, static_cast<int>(next.points.size()), 16);
        }
        std::cerr << "Up to " << budget << " dyes: " << reached.size() << " colors\n";
    }
}

void writeTables(const std::filesystem::path& directory) {
    std::vector<uint8_t> mask(colorCount / 8);
    std::array<std::ofstream, 16> shards;
    std::array<int, 16> previous{};
    for (int i = 0; i < 16; ++i) {
        shards[i].exceptions(std::ios::failbit | std::ios::badbit);
        shards[i].open(directory / ("recipes-" + std::to_string(i) + ".raw"), std::ios::binary);
    }
    for (int rgb = 0; rgb < colorCount; ++rgb) {
        if (!cost[rgb]) continue;
        mask[rgb / 8] |= 1 << (rgb % 8);
        const auto last = witnesses[rgb];
        const auto& batch = batches[last.batch];
        bool first = last.parent == undyed;
        int predecessorCost = first ? 0 : cost[last.parent];
        int result = mixers[batch.size + !first](first ? Components{} : unpack(last.parent), batch.sum);
        if (result != rgb || predecessorCost + batch.size != cost[rgb]) throw std::runtime_error("Invalid witness");
        if (reconstructible[rgb]) continue;

        std::vector<int> path;
        for (int p = rgb; p != undyed; p = witnesses[p].parent) path.push_back(witnesses[p].batch);
        std::reverse(path.begin(), path.end());
        int shard = rgb >> 20;
        int local = rgb & 0xfffff;
        int gap = local - previous[shard];
        previous[shard] = local;
        auto& out = shards[shard];
        while (gap >= 128) {
            out.put(static_cast<char>((gap & 127) | 128));
            gap >>= 7;
        }
        out.put(static_cast<char>(gap));
        out.put(static_cast<char>(cost[rgb]));
        for (int id : path) {
            const auto& step = batches[id];
            for (int digit = step.size - 1; digit >= 0; --digit) {
                int dye = (step.dyes >> (4 * digit)) & 15;
                out.put(static_cast<char>(digit == 0 ? dye | 16 : dye));
            }
        }
    }
    std::ofstream out;
    out.exceptions(std::ios::failbit | std::ios::badbit);
    out.open(directory / "gamut.raw", std::ios::binary);
    out.write(reinterpret_cast<const char*>(mask.data()), mask.size());
}
} // namespace

int main(int argc, char** argv) {
    if (argc != 18) return 1;
    for (int i = 0; i < 16; ++i) palette[i] = unpack(std::stoi(argv[i + 2], nullptr, 16));
    makeBatches(0, {}, 0, 0);
    buildCore();
    completeGamut();
    if (reached.size() != 5713438) throw std::runtime_error("Unexpected Java armor gamut");
    writeTables(argv[1]);
}
