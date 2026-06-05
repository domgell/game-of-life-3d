import { ImGui } from "@mori2003/jsimgui"

export const settings = {
    minScore: 3,
    newScore: 6,
    maxScore: 5,
    faceScore: 2,
    edgeScore: 2,
    cornerScore: 1,
    wrapEdges: false,
    tileSideCount: 128,
    updateInterval: 0.05,
    randomSeed: 12345,
    startingDensity: 0.01,
    restart: true,
}

export function drawUi() {
    ImGui.SetNextWindowPos({ x: 0, y: 0 }, ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowCollapsed(true, ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowBgAlpha(0.75)

    ImGui.Begin("Settings", null, ImGui.WindowFlags.AlwaysAutoResize)
    const maxWidth = 100;

    if (ImGui.Button("Restart")) {
        settings.restart = true;
    }

    const randomSeed = [settings.randomSeed] as [number]
    ImGui.SetNextItemWidth(maxWidth)
    if (ImGui.InputInt("Random Seed", randomSeed)) {
        settings.randomSeed = randomSeed[0]
    }

    const startingDensity = [settings.startingDensity] as [number]
    ImGui.SetNextItemWidth(maxWidth)
    if (ImGui.SliderFloat("Starting Density", startingDensity, 0.0001, 1)) {
        settings.startingDensity = startingDensity[0]
    }

    const updateInterval = [settings.updateInterval] as [number]
    ImGui.SetNextItemWidth(maxWidth)
    if (ImGui.SliderFloat("Update Interval", updateInterval, 0.001, 0.5)) {
        settings.updateInterval = updateInterval[0]
    }

    if (ImGui.CollapsingHeader("Rules")) {
        const minScore = [settings.minScore] as [number]
        ImGui.SetNextItemWidth(maxWidth)
        ImGui.InputInt("min score", minScore)
        settings.minScore = minScore[0]

        const newScore = [settings.newScore] as [number]
        ImGui.SetNextItemWidth(maxWidth)
        ImGui.InputInt("new score", newScore)
        settings.newScore = newScore[0]

        const maxScore = [settings.maxScore] as [number]
        ImGui.SetNextItemWidth(maxWidth)
        ImGui.InputInt("max score", maxScore)
        settings.maxScore = maxScore[0]

        const faceScore = [settings.faceScore] as [number]
        ImGui.SetNextItemWidth(maxWidth)
        ImGui.InputInt("face score", faceScore)
        settings.faceScore = faceScore[0]

        const edgeScore = [settings.edgeScore] as [number]
        ImGui.SetNextItemWidth(maxWidth)
        ImGui.InputInt("edge score", edgeScore)
        settings.edgeScore = edgeScore[0]

        const cornerScore = [settings.cornerScore] as [number]
        ImGui.SetNextItemWidth(maxWidth)
        ImGui.InputInt("corner score", cornerScore)
        settings.cornerScore = cornerScore[0]

        const wrapEdges = [settings.wrapEdges] as [boolean]
        ImGui.SetNextItemWidth(maxWidth)
        if (ImGui.Checkbox("wrap edges", wrapEdges)) {
            settings.wrapEdges = wrapEdges[0]
        }
    }

    ImGui.End()
}