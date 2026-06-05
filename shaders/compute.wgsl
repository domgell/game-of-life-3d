override workgroupSize: u32;
override tileSideCount: u32;

@group(0) @binding(0) var<storage, read> prevTiles: array<u32>;
@group(0) @binding(1) var<storage, read_write> nextTiles: array<atomic<u32>>;

@group(0) @binding(2) var<storage, read_write> liveTiles: array<u32>;
@group(0) @binding(3) var<storage, read_write> indirectBuffer: IndirectDrawIndexed;

struct Settings {
    minScore: u32,
    newScore: u32,
    maxScore: u32,
    faceScore: u32,
    edgeScore: u32,
    cornerScore: u32,
    wrapEdges: u32,
}

@group(0) @binding(4) var<uniform> settings: Settings;

fn getNextState(currentState: bool, score: u32) -> bool {
    if currentState {
        return score >= settings.minScore && score <= settings.maxScore;
    } else {
        return score == settings.newScore;
    }
}

fn getTileIndex(coord: vec3u) -> u32 {
    return coord.z * tileSideCount * tileSideCount + coord.y * tileSideCount + coord.x;
}

fn getTileMask(index: u32) {
    
}

fn getTile(index: u32) -> bool {
    let wordIndex = index / 32u;
    let mask = 1u << (index % 32u);

    return bool(prevTiles[wordIndex] & mask);

    //return bool(prevTiles[index]);
}

fn setTile(index: u32, alive: bool) {
    let wordIndex = index / 32u;
    let mask = 1u << (index % 32u);

    if alive {
        atomicOr(&nextTiles[wordIndex], mask);
    } else {
        atomicAnd(&nextTiles[wordIndex], ~mask);
    }

    //nextTiles[index] = u32(alive);
}

@compute @workgroup_size(workgroupSize, workgroupSize, workgroupSize)
fn main(@builtin(global_invocation_id) coord: vec3u) {
    let gridDim = vec3u(tileSideCount);
    if any(coord >= gridDim) { return; }

    if all(coord == vec3u(0)) {
        atomicStore(&indirectBuffer.instanceCount, 0);
    }

    // Check the 26 neighbor tiles
    var score = 0u;
    for (var i = 0; i < 27; i++) {
        let offset = vec3i((i % 3) - 1, ((i / 3) % 3) - 1, (i / 9) - 1);

        // Skip self (0,0,0)
        if all(offset == vec3i(0)) { continue; }

        var currentCoord = vec3u(offset + vec3i(coord));
        if bool(settings.wrapEdges) { currentCoord %= vec3u(tileSideCount); }

        // Grid bounds check
        if any(currentCoord >= vec3u(tileSideCount)) { continue; }

        let currentTileIndex = getTileIndex(currentCoord);
        let currentState = getTile(currentTileIndex);
        if !currentState { continue; }

        // Add score
        let manhattan = abs(offset.x) + abs(offset.y) + abs(offset.z);
        switch manhattan {
            case 1: { score += settings.faceScore; }
            case 2: { score += settings.edgeScore; }
            case 3: { score += settings.cornerScore; }
            default: {}
        }
    }

    let tileIndex = getTileIndex(coord);
    let prevState = getTile(tileIndex);
    let nextState = getNextState(prevState, score);
    setTile(tileIndex, nextState);

    // Collect alive tile indices to be rendered later
    if nextState {
        let count = atomicAdd(&indirectBuffer.instanceCount, 1);
        liveTiles[count] = tileIndex;
    }
}

struct IndirectDrawIndexed {
    _indexCount: u32,
    instanceCount: atomic<u32>,
    _baseIndex: u32,
    _baseVertex: i32,
    _baseInstance: u32,
}