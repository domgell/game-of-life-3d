import { buildBindGroup, buildBuffer } from "@domgell/webgpu-builder"
import * as GPU from "@domgell/webgpu-util"

export function GridCompute({ device, shader, tileSideCount, indirectBuffer, liveTilesBuffer }: {
    device: GPUDevice,
    shader: string,
    tileSideCount: number,
    indirectBuffer: GPUBuffer,
    liveTilesBuffer: GPUBuffer,
}) {
    const workgroupSize = 4;

    const pl = GPU.createComputePipeline(device, {
        shader, 
        constants: { workgroupSize, tileSideCount },
        label: "GridCompute.ComputePipeline"
    })

    /* -------------------------------------------------------------------------- */

    const tileCount = tileSideCount * tileSideCount * tileSideCount
    const tilesByteSize = Math.ceil(tileCount / 32) * 4;

    const nextTilesBuffer = buildBuffer(device)
        .size(tilesByteSize)
        .usage("copy-src", "storage")
        .build("GridCompute.NextTilesBuffer")

    const prevTilesBuffer = buildBuffer(device)
        .size(tilesByteSize)
        .usage("copy-dst", "storage")
        .build("GridCompute.PrevTilesBuffer")

    const settingsBuffer = buildBuffer(device)
        .size(GPU.Size.u32 * 7)
        .usage("copy-dst", "uniform")
        .build("GridCompute.SettingsBuffer")

    const bg = buildBindGroup(device)
        .entries(prevTilesBuffer, nextTilesBuffer, liveTilesBuffer, indirectBuffer, settingsBuffer)
        .layout(pl.getBindGroupLayout(0))
        .build("GridCompute.BG0")

    /* -------------------------------------------------------------------------- */

    const dispatchCount = Math.ceil(tileSideCount / workgroupSize)

    return {
        nextTilesBuffer,
        prevTilesBuffer,
        settingsBuffer,
        update(pass: GPUComputePassEncoder) {
            pass.pushDebugGroup("GridCompute.ComputePass")
            pass.setPipeline(pl)
            pass.setBindGroup(0, bg)
            pass.dispatchWorkgroups(dispatchCount, dispatchCount, dispatchCount)
            pass.popDebugGroup()
        },
    }
}