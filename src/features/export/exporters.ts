import { downloadBlob, downloadDataUrl } from "./download";
import { usePlayStore } from "../../app/store";
import type Konva from "konva";

const IMAGE_PIXEL_RATIO = 2;
const VIDEO_PIXEL_RATIO = 1;
const VIDEO_FPS = 60;
const FIRST_FRAME_HOLD_MS = 2000;
const TRANSITION_HOLD_MS = 1000;
const FINAL_FRAME_HOLD_MS = 5000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function pickVideoMimeType(): string | null {
  if (typeof window === "undefined") return null;
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
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

export async function exportAnimationAsVideo(): Promise<void> {
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

  if (typeof document === "undefined") {
    console.warn("Export skipped: document unavailable");
    return;
  }

  const mimeType = pickVideoMimeType();
  if (!mimeType) {
    console.warn("Export skipped: MediaRecorder or requested codec unsupported");
    return;
  }

  const originalIndex = initialState.currentFrameIndex;
  const wasPlaying = initialState.isPlaying;
  if (wasPlaying) {
    initialState.pauseAnimation();
  }

  const captureCanvas = document.createElement("canvas");
  const context = captureCanvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to access 2D context for video export");
  }

  if (typeof captureCanvas.captureStream !== "function") {
    console.warn("Export skipped: canvas.captureStream is unsupported");
    return;
  }

  const stream = captureCanvas.captureStream(VIDEO_FPS);
  const recorder = new MediaRecorder(stream, { mimeType });

  const chunks: BlobPart[] = [];
  const recordingComplete = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });
    recorder.addEventListener("stop", () => {
      resolve(new Blob(chunks, { type: mimeType }));
    });
    recorder.addEventListener("error", (event) => {
      reject(event.error ?? new Error("MediaRecorder error"));
    });
  });

  let recording = false;

  try {
    usePlayStore.getState().setCurrentFrameIndex(0);
    await waitForStage(stage);

    const initialCanvas = stage.toCanvas({ pixelRatio: VIDEO_PIXEL_RATIO });
    captureCanvas.width = initialCanvas.width;
    captureCanvas.height = initialCanvas.height;
    context.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
    context.drawImage(initialCanvas, 0, 0);

    recorder.start();

    recording = true;
    const pumpFrame = () => {
      if (!recording) return;
      const snapshot = stage.toCanvas({ pixelRatio: VIDEO_PIXEL_RATIO });
      context.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
      context.drawImage(snapshot, 0, 0);
      requestAnimationFrame(pumpFrame);
    };
    pumpFrame();

    await wait(100);
    const state = usePlayStore.getState();
    const frameCount = play.frames.length;

    await wait(FIRST_FRAME_HOLD_MS);

    if (frameCount === 1) {
      await wait(FINAL_FRAME_HOLD_MS);
    } else {
      for (let i = 0; i < frameCount - 1; i += 1) {
        await state.stepForward();
        await waitForStage(stage);
        const isLastTransition = i === frameCount - 2;
        const holdDuration = isLastTransition ? FINAL_FRAME_HOLD_MS : TRANSITION_HOLD_MS;
        await wait(holdDuration);
      }
    }

    recording = false;
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  } catch (error) {
    recording = false;
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    throw error;
  } finally {
    recording = false;
    usePlayStore.getState().setCurrentFrameIndex(originalIndex);
    await waitForStage(stage);
  }

  const blob = await recordingComplete;
  const filename = buildFilename(play.meta.name, "animation", "webm");
  downloadBlob(blob, filename);
}
