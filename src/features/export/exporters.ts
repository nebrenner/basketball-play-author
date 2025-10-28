import { downloadBlob, downloadDataUrl } from "./download";
import { usePlayStore } from "../../app/store";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import type Konva from "konva";

const IMAGE_PIXEL_RATIO = 2;
const GIF_PIXEL_RATIO = 1;

function sanitizeName(name: string | undefined, fallback: string): string {
  const base = name?.trim() ?? "";
  if (!base) return fallback;
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function buildFilename(name: string | undefined, suffix: string, extension: string): string {
  const safeBase = sanitizeName(name, "play");
  return `${safeBase}-${suffix}.${extension}`;
}

function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame === "function") {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 16));
}

async function waitForStage(stage: Konva.Stage) {
  await nextFrame();
  stage.batchDraw();
  await nextFrame();
}

function captureStagePixels(stage: Konva.Stage, pixelRatio: number) {
  const canvas = stage.toCanvas({ pixelRatio });
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to access 2D context for export");
  }
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width, height };
}

export async function exportCurrentFrameAsImage(): Promise<void> {
  const state = usePlayStore.getState();
  const stage = state.stageRef;
  const play = state.play;
  if (!stage || !play) {
    console.warn("Export skipped: stage or play unavailable");
    return;
  }

  await waitForStage(stage);

  const filename = buildFilename(
    play.meta.name,
    `frame-${String(state.currentFrameIndex + 1).padStart(2, "0")}`,
    "png",
  );
  const dataUrl = stage.toDataURL({ pixelRatio: IMAGE_PIXEL_RATIO });
  downloadDataUrl(dataUrl, filename);
}

export async function exportAnimationAsGif(): Promise<void> {
  const initialState = usePlayStore.getState();
  const stage = initialState.stageRef;
  const play = initialState.play;
  if (!stage || !play) {
    console.warn("Export skipped: stage or play unavailable");
    return;
  }

  if (!play.frames.length) {
    console.warn("Export skipped: play has no frames");
    return;
  }

  const originalIndex = initialState.currentFrameIndex;
  const wasPlaying = initialState.isPlaying;
  if (wasPlaying) {
    initialState.pauseAnimation();
  }

  const speed = initialState.speed <= 0 ? 1 : initialState.speed;
  const frameDelay = Math.max(20, Math.round(initialState.baseDurationMs / speed));
  const encoder = GIFEncoder();
  let palette: number[][] | null = null;

  try {
    for (let i = 0; i < play.frames.length; i += 1) {
      usePlayStore.getState().setCurrentFrameIndex(i);
      await waitForStage(stage);

      const snapshot = captureStagePixels(stage, GIF_PIXEL_RATIO);
      if (!palette) {
        palette = quantize(snapshot.data, 256);
      }
      if (!palette || palette.length === 0) {
        console.warn("Export skipped: unable to compute GIF palette");
        return;
      }
      const index = applyPalette(snapshot.data, palette);
      const frameOptions = {
        palette,
        delay: frameDelay,
        dispose: 2,
        ...(i === 0 ? { repeat: 0 } : {}),
      } as const;
      encoder.writeFrame(index, snapshot.width, snapshot.height, frameOptions);
    }
  } finally {
    usePlayStore.getState().setCurrentFrameIndex(originalIndex);
    await waitForStage(stage);
  }

  encoder.finish();
  const bytesView = encoder.bytesView();
  const bytes = new Uint8Array(bytesView.length);
  bytes.set(bytesView);
  const blob = new Blob([bytes], { type: "image/gif" });
  const filename = buildFilename(play.meta.name, "animation", "gif");
  downloadBlob(blob, filename);
}
