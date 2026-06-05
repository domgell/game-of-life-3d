override tileSideCount: u32;
override tileSize: f32;

@group(0) @binding(0) var<uniform> viewProjection: mat4x4f;
@group(0) @binding(1) var<storage, read> liveTiles: array<u32>;

struct VertOut {
    @builtin(position) builtinPosition: vec4f,
    @location(0) worldPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) localPosition: vec3f,
}

@vertex
fn vert(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @builtin(instance_index) instanceIndex: u32
) -> VertOut {
    var out: VertOut;

    let id = liveTiles[instanceIndex];

    let tileX = id % tileSideCount;
    let tileY = (id / tileSideCount) % tileSideCount;
    let tileZ = id / (tileSideCount * tileSideCount);
    let tileOffset = vec3f(f32(tileX), f32(tileY), f32(tileZ)) * tileSize * 2;

    let world = position * tileSize + tileOffset;

    out.builtinPosition = viewProjection * vec4f(world, 1);
    out.worldPosition = world;
    out.localPosition = position;
    out.normal = normal;

    return out;
}

@fragment
fn frag(
    @location(0) worldPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) localPosition: vec3f,
) -> @location(0) vec4f {
    let nDotL = max(dot(normalize(normal), normalize(vec3f(1, 1, 1))), 0.75);

    let maxSize = f32(tileSideCount) * tileSize;
    let color = max(worldPosition / maxSize, vec3f(0.5)) + abs(localPosition) * 0.25;
    
    return vec4f(color * nDotL, 1);
}