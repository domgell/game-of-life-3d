import { buildBindGroup, buildBuffer, buildRenderPipeline } from "@domgell/webgpu-builder"
import * as GPU from "@domgell/webgpu-util"
import * as Game from "@domgell/game-util"

export function GridRender({ device, shader, color, depth, cameraBuffer, tileSideCount, tileSize }: {
    device: GPUDevice,
    shader: string,
    color: GPUColorTargetState,
    depth: GPUDepthStencilState,
    cameraBuffer: GPUBuffer,
    tileSideCount: number,
    tileSize: number,
}) {
    const pl = buildRenderPipeline(device)
        .shader(shader)
        .constants({tileSideCount, tileSize})
        .color(color)
        .depth(depth)
        .primitive({cullMode: "back"})
        .build("GridRender.RenderPipeline")

    /* -------------------------------------------------------------------------- */
    
    const tileCount = tileSideCount * tileSideCount * tileSideCount

    const liveTilesBuffer = buildBuffer(device)
        .size(tileCount * 4)
        .usage("storage")
        .build("GridRender.TilesBuffer")

    const bg = buildBindGroup(device)
        .entries(cameraBuffer, liveTilesBuffer)
        .layout(pl.getBindGroupLayout(0))
        .build("GridRender.BG0")

    /* -------------------------------------------------------------------------- */

    const positionBuffer = buildBuffer(device)
        .data(Game.cubeVertexPositions)
        .usage("vertex")
        .build()

    const normalBuffer = buildBuffer(device)
        .data(Game.cubeVertexNormals)
        .usage("vertex")
        .build()

    const indexBuffer = buildBuffer(device)
        .data(Game.cubeIndices)
        .usage("index")
        .build()

    const indirectBuffer = buildBuffer(device)
        .data(new Uint32Array([Game.cubeIndices.length, 0, 0, 0, 0]))
        .usage("storage", "indirect", "copy-dst")
        .build("GridRender.IndirectBuffer")

    return {
        liveTilesBuffer,
        indirectBuffer,
        render(pass: GPU.RenderPassOrBundleEncoder) {
            pass.pushDebugGroup("GridRender.RenderPass")
            pass.setPipeline(pl)
            pass.setVertexBuffer(0, positionBuffer)
            pass.setVertexBuffer(1, normalBuffer)
            pass.setIndexBuffer(indexBuffer, "uint32")
            pass.setBindGroup(0, bg)
            pass.drawIndexedIndirect(indirectBuffer, 0)
            pass.popDebugGroup()
        }
    }
}