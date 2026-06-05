import * as GPU from "@domgell/webgpu-util"
import * as Game from "@domgell/game-util"
import { Input } from "@domgell/game-input"
import { clamp, mat4, quat, vec2, vec3 } from "dom-game-math";
import { DebugRenderer } from "@domgell/webgpu-samples"
import { buildRenderPass } from "@domgell/webgpu-builder";
import { GridRender } from "./GridRender";
import { GridCompute } from "./GridCompute";
import { ImGui, ImGuiImplWeb } from "@mori2003/jsimgui";
import { drawUi, settings } from "./settings";

/* ------------------------------- Init Canvas ------------------------------ */

const canvas = document.querySelector("canvas")!;
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

const input = Input.create(canvas)

/* -------------------------------- Init GPU -------------------------------- */

const { device, context } = await GPU.initWebGPU(canvas);
await ImGuiImplWeb.Init({ device, canvas })

const { cameraBuffer } = GPU.createCameraState(device)

const colorState = GPU.defaultColorTargetState({ format: "bgra8unorm" })
const depthState = GPU.defaultDepthTargetState()
const debugRenderer = DebugRenderer.create({ device, camera: cameraBuffer, color: colorState, depth: depthState })

const depthTexture = GPU.createDepthTexture(device, canvas)

const tileSideCount = 128;
const tileSize = 0.1;

const gridRender = GridRender({
    device,
    tileSideCount,
    tileSize,
    cameraBuffer,
    color: colorState,
    depth: depthState,
    shader: await Game.importText("shaders/render.wgsl")
})

const gridCompute = GridCompute({
    device,
    tileSideCount,
    liveTilesBuffer: gridRender.liveTilesBuffer,
    indirectBuffer: gridRender.indirectBuffer,
    shader: await Game.importText("shaders/compute.wgsl"),
})

/* --------------------------------- Update --------------------------------- */

let lastUpdateTime = -Infinity

let cameraDist = 50
let cameraYaw = 0
let cameraPitch = 0

Game.runUpdate((dt, t) => {

    /* --------------------------------- Camera --------------------------------- */

    const uiFocus = ImGui.GetIO().WantCaptureMouse || ImGui.GetIO().WantCaptureKeyboard;
    const capture = input.isDown("LeftMouse") && !uiFocus
    input.setMouseCapture(capture)

    // Camera orbit input
    if (capture) {
        const look = vec2.mul(input.mouseDelta(), 0.005)
        cameraYaw += look.x;
        cameraPitch += look.y;
        cameraPitch = clamp(cameraPitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01)
    }

    // Camera zoom input
    if (!uiFocus) {
        const scroll = input.scrollDelta()
        cameraDist *= 1 + scroll * 0.01
        cameraDist = clamp(cameraDist, 5, 75)
    }

    // Camera orbit position
    const cosPitch = Math.cos(cameraPitch);
    const center = vec3.new(tileSideCount * tileSize)
    const cameraPosition = vec3.new(
        center.x + Math.sin(cameraYaw) * cosPitch * cameraDist,
        center.y + Math.sin(cameraPitch) * cameraDist,
        center.z + Math.cos(cameraYaw) * cosPitch * cameraDist
    )

    // Update camera buffer
    const projection = mat4.perspectiveProjection(65, canvas.width / canvas.height, 0.01, 100)
    const view = mat4.lookAt(cameraPosition, center, vec3.up)
    const viewProjection = mat4.mul(projection, view)
    GPU.writeBuffer(device, cameraBuffer, viewProjection as Float32Array)

    /* -------------------------------- Settings -------------------------------- */

    ImGuiImplWeb.BeginRender()
    drawUi()

    // Initialize tiles
    if (settings.restart) {
        settings.restart = false

        // Seeded random number generator
        // https://github.com/cprosche/mulberry32
        const random = (seed => () => {
            let t = seed += 0x6d2b79f5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        })(settings.randomSeed)

        const tileCount = tileSideCount * tileSideCount * tileSideCount
        const tiles = new Uint32Array(Math.ceil(tileCount / 32))
        for (let i = 0; i < tileCount; i++) {
            if (random() < settings.startingDensity) {
                const wordIndex = (i / 32) | 0;
                const bitIndex = (i % 32) | 0;
                tiles[wordIndex] |= (1 << bitIndex);
            }
        }
        GPU.writeBuffer(device, gridCompute.prevTilesBuffer, tiles)
    }

    // Update settings buffer
    GPU.writeBuffer(device, gridCompute.settingsBuffer, new Uint32Array([
        settings.minScore,
        settings.newScore,
        settings.maxScore,
        settings.faceScore,
        settings.edgeScore,
        settings.cornerScore,
        settings.wrapEdges ? 1 : 0,
    ]))

    /* --------------------------------- Render --------------------------------- */

    const { currentTexture, commandEncoder } = GPU.createRenderState(device, context)

    const renderPass = buildRenderPass(commandEncoder)
        .color(currentTexture, [0.1, 0.1, 0.1, 1.0])
        .depth(depthTexture, "clear")
        .build()

    gridRender.render(renderPass)
    debugRenderer.render(renderPass)
    renderPass.end()

    const uiPass = buildRenderPass(commandEncoder)
        .color(currentTexture)
        .build()

    ImGuiImplWeb.EndRender(uiPass)
    uiPass.end()

    // Update/compute tiles
    if (t - lastUpdateTime > settings.updateInterval) {
        const computePass = commandEncoder.beginComputePass()
        gridCompute.update(computePass)
        computePass.end()
        commandEncoder.copyBufferToBuffer(gridCompute.nextTilesBuffer, gridCompute.prevTilesBuffer)
        lastUpdateTime = t
    }

    GPU.submitCommandEncoder(device, commandEncoder)

    input.flush()
})