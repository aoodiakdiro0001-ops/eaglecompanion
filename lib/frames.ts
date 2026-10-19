export const FRAME_TTL_MS = 5_000;

export interface FrameRecord {
  bytes: Buffer;
  mime: string;
  shareId: string;
  updatedAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __eagleFrames: Map<string, FrameRecord> | undefined;
}

function store(): Map<string, FrameRecord> {
  if (!globalThis.__eagleFrames) {
    globalThis.__eagleFrames = new Map();
  }
  return globalThis.__eagleFrames;
}

export function setFrame(
  deviceId: string,
  shareId: string,
  bytes: Buffer,
  mime = "image/jpeg",
  nowMs = Date.now(),
): void {
  store().set(deviceId, { bytes, mime, shareId, updatedAt: nowMs });
}

export function getFrame(
  deviceId: string,
  nowMs = Date.now(),
): FrameRecord | null {
  const frames = store();
  const frame = frames.get(deviceId);
  if (!frame) return null;
  if (nowMs - frame.updatedAt > FRAME_TTL_MS) {
    frames.delete(deviceId);
    return null;
  }
  return frame;
}

export function clearFrame(deviceId: string): void {
  store().delete(deviceId);
}

export function clearAllFrames(): void {
  store().clear();
}
