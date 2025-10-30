import { jsPDF } from "jspdf";
import { downloadBlob, downloadDataUrl } from "./download";
import { usePlayStore } from "../../app/store";
import type Konva from "konva";
import { collectPlaybackOrder, ensureFrameGraph, findFrameById } from "../frames/frameGraph";
import type { Frame, Play } from "../../app/types";
import { buildPlayStepSpec, runPlayStep } from "../frames/playback";
import { formatStepTitle } from "../frames/frameLabels";

const IMAGE_PIXEL_RATIO = 2;
const PDF_IMAGE_PIXEL_RATIO = 1.1;
const PDF_IMAGE_MIME_TYPE = "image/jpeg";
const PDF_IMAGE_QUALITY = 0.7;
const VIDEO_PIXEL_RATIO = 1;
const VIDEO_FPS = 60;
const FIRST_FRAME_HOLD_MS = 2000;
const TRANSITION_HOLD_MS = 1000;
const FINAL_FRAME_HOLD_MS = 3000;

type FrameExportEntry = { frame: Frame; label: string };

function collectFrameExportEntries(play: Play): FrameExportEntry[] {
  const normalizedPlay: Play = {
    ...play,
    frames: play.frames.map((frame) => ({
      ...frame,
      nextFrameIds: Array.isArray(frame.nextFrameIds) ? [...frame.nextFrameIds] : [],
      parentId: frame.parentId ?? null,
    })),
  };

  ensureFrameGraph(normalizedPlay);

  const originalById = new Map<Frame["id"], Frame>();
  for (const frame of play.frames) {
    originalById.set(frame.id, frame);
  }

  const normalizedById = new Map<Frame["id"], Frame>();
  for (const frame of normalizedPlay.frames) {
    normalizedById.set(frame.id, frame);
  }

  const root = normalizedPlay.frames.find((frame) => !frame.parentId) ?? normalizedPlay.frames[0];
  if (!root) return [];

  const results: FrameExportEntry[] = [];
  const visited = new Set<Frame["id"]>();

  const visit = (frame: Frame, depth: number) => {
    if (visited.has(frame.id)) return;
    visited.add(frame.id);
    const normalized = normalizedById.get(frame.id);
    if (!normalized) return;
    const parent = normalized.parentId ? normalizedById.get(normalized.parentId) ?? null : null;
    const parentChildren = parent
      ? (parent.nextFrameIds ?? [])
          .map((childId) => normalizedById.get(childId))
          .filter((child): child is Frame => Boolean(child))
      : [];
    const originalFrame = originalById.get(frame.id);
    const labelFrame = originalFrame ?? frame;
    const stepLabel = formatStepTitle(labelFrame, Math.max(1, depth));
    let label = stepLabel;
    if (parent && parentChildren.length > 1) {
      const optionIndex = parentChildren.findIndex((child) => child.id === normalized.id);
      if (optionIndex >= 0) {
        label = `${stepLabel} (Branch ${optionIndex + 1})`;
      }
    }
    if (originalFrame) {
      results.push({ frame: originalFrame, label });
    }

    const children = (normalized.nextFrameIds ?? [])
      .map((childId) => normalizedById.get(childId))
      .filter((child): child is Frame => Boolean(child));
    for (const child of children) {
      visit(child, depth + 1);
    }
  };

  visit(root, 1);
  return results;
}

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

export async function exportPlayAsPdf(): Promise<void> {
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

  const entries = collectFrameExportEntries(play);
  if (!entries.length) {
    console.warn("Export skipped: unable to determine frames for export");
    return;
  }

  const originalIndex = initialState.currentFrameIndex;
  const originalPath = [...initialState.currentBranchPath];
  const wasPlaying = initialState.isPlaying;
  if (wasPlaying) {
    initialState.pauseAnimation();
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const playName = play.meta.name?.trim() || "Untitled Play";
  const availableWidth = pageWidth - margin * 2;

  const writeHeader = () => {
    pdf.setFontSize(20);
    pdf.text(playName, margin, margin);
  };

  writeHeader();

  try {
    for (let i = 0; i < entries.length; i += 1) {
      const { frame, label } = entries[i];
      if (i > 0) {
        pdf.addPage();
        writeHeader();
      }

      let cursorY = margin + 28;
      pdf.setFontSize(16);
      pdf.text(label, margin, cursorY);
      cursorY += 20;

      usePlayStore.getState().focusFrameById(frame.id);
      await waitForStage(stage);

      const noteText = frame.note?.trim() ?? "";
      const noteLines = noteText ? pdf.splitTextToSize(noteText, availableWidth) : [];
      const estimatedNoteHeight = noteLines.length > 0 ? noteLines.length * 14 : 0;

      let remainingHeight = pageHeight - cursorY - margin - (estimatedNoteHeight > 0 ? estimatedNoteHeight + 12 : 0);
      if (remainingHeight <= 0) {
        pdf.addPage();
        writeHeader();
        cursorY = margin + 28;
        pdf.setFontSize(16);
        pdf.text(label, margin, cursorY);
        cursorY += 20;
        remainingHeight = pageHeight - cursorY - margin - (estimatedNoteHeight > 0 ? estimatedNoteHeight + 12 : 0);
      }

      const stageWidth = stage.width();
      const stageHeight = stage.height();
      const aspectRatio = stageHeight > 0 ? stageWidth / stageHeight : 1;
      let renderHeight = Math.max(100, remainingHeight);
      let renderWidth = renderHeight * aspectRatio;
      if (renderWidth > availableWidth) {
        renderWidth = availableWidth;
        renderHeight = renderWidth / (aspectRatio || 1);
      }
      if (renderHeight > remainingHeight) {
        renderHeight = remainingHeight;
        renderWidth = renderHeight * (aspectRatio || 1);
      }
      if (!Number.isFinite(renderHeight) || renderHeight <= 0) {
        renderHeight = Math.max(remainingHeight, 100);
        renderWidth = renderHeight * (aspectRatio || 1);
      }
      if (renderWidth > availableWidth) {
        renderWidth = availableWidth;
        renderHeight = renderWidth / (aspectRatio || 1);
      }

      const imageX = margin + (availableWidth - renderWidth) / 2;
      const dataUrl = stage.toDataURL({
        pixelRatio: PDF_IMAGE_PIXEL_RATIO,
        mimeType: PDF_IMAGE_MIME_TYPE,
        quality: PDF_IMAGE_QUALITY,
      });
      pdf.addImage(dataUrl, "JPEG", imageX, cursorY, renderWidth, renderHeight);
      cursorY += renderHeight + 16;

      if (noteLines.length > 0) {
        if (cursorY + estimatedNoteHeight > pageHeight - margin) {
          pdf.addPage();
          writeHeader();
          cursorY = margin + 28;
          pdf.setFontSize(16);
          pdf.text(`${label} – Notes`, margin, cursorY);
          cursorY += 20;
        }
        pdf.setFontSize(12);
        pdf.text(noteLines, margin, cursorY);
      }
    }

    const filename = buildFilename(play.meta.name, "playbook", "pdf");
    const blob = pdf.output("blob");
    downloadBlob(blob, filename);
  } finally {
    if (originalPath.length > 0) {
      usePlayStore.getState().focusFrameById(originalPath[originalPath.length - 1]);
      usePlayStore.getState().setCurrentFrameIndex(originalIndex);
    } else {
      usePlayStore.getState().setCurrentFrameIndex(originalIndex);
    }
    await waitForStage(stage);
  }
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
  const originalPath = [...initialState.currentBranchPath];
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

  const order = collectPlaybackOrder(play);

  try {
    if (order.length > 0) {
      usePlayStore.getState().focusFrameById(order[0]);
    } else {
      usePlayStore.getState().setCurrentFrameIndex(0);
    }
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
    await wait(FIRST_FRAME_HOLD_MS);

    if (order.length <= 1) {
      await wait(FINAL_FRAME_HOLD_MS);
    } else {
      for (let i = 0; i < order.length - 1; i += 1) {
        const fromId = order[i];
        const toId = order[i + 1];
        const fromFrame = findFrameById(play, fromId);
        const toFrame = findFrameById(play, toId);
        if (!fromFrame || !toFrame) continue;
        const durationMs = initialState.baseDurationMs / initialState.speed;
        const spec = buildPlayStepSpec(play, fromFrame, toFrame, durationMs);
        await runPlayStep(spec);
        usePlayStore.getState().focusFrameById(toId);
        await waitForStage(stage);
        const isLastTransition = i === order.length - 2;
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
    if (originalPath.length > 0) {
      usePlayStore.getState().focusFrameById(originalPath[originalPath.length - 1]);
      usePlayStore.getState().setCurrentFrameIndex(originalIndex);
    } else {
      usePlayStore.getState().setCurrentFrameIndex(originalIndex);
    }
    await waitForStage(stage);
  }

  const blob = await recordingComplete;
  const filename = buildFilename(play.meta.name, "animation", "webm");
  downloadBlob(blob, filename);
}
