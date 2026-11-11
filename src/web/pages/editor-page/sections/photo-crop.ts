/** The 4:5 frame the photo is adjusted in, in px */
export const FRAME_WIDTH = 240;
export const FRAME_HEIGHT = 300;
export const MAX_ZOOM = 3;

/** The size of the saved photo */
const OUTPUT_WIDTH = 600;
const OUTPUT_HEIGHT = 750;

interface Point {
  x: number;
  y: number;
}

/** Pixels per picture pixel at zoom 1: the picture just covers the frame */
function baseScale(width: number, height: number): number {
  return Math.max(FRAME_WIDTH / width, FRAME_HEIGHT / height);
}

/** Keeps the picture covering the frame: its top-left corner is never inside the frame */
export function clampOffset(
  offset: Point,
  width: number,
  height: number,
  zoom: number
): Point {
  if (width === 0 || height === 0) {
    return { x: 0, y: 0 };
  }
  const scale = baseScale(width, height) * zoom;
  const minX = FRAME_WIDTH - width * scale;
  const minY = FRAME_HEIGHT - height * scale;
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

/** The new offset after a zoom change, so the point in the middle of the frame stays there */
export function zoomAroundCentre(
  offset: Point,
  size: { width: number; height: number },
  oldZoom: number,
  newZoom: number
): Point {
  if (size.width === 0) {
    return offset;
  }
  const base = baseScale(size.width, size.height);
  const centreX = (FRAME_WIDTH / 2 - offset.x) / (base * oldZoom);
  const centreY = (FRAME_HEIGHT / 2 - offset.y) / (base * oldZoom);
  return clampOffset(
    {
      x: FRAME_WIDTH / 2 - centreX * base * newZoom,
      y: FRAME_HEIGHT / 2 - centreY * base * newZoom,
    },
    size.width,
    size.height,
    newZoom
  );
}

/** Cuts what the frame shows out of the picture as a JPEG data URL (600 x 750) */
export function cropToDataUrl(
  image: HTMLImageElement | null,
  offset: Point,
  size: { width: number; height: number },
  zoom: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context || !image) {
    return "";
  }
  const scale = baseScale(size.width, size.height) * zoom;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.drawImage(
    image,
    -offset.x / scale,
    -offset.y / scale,
    FRAME_WIDTH / scale,
    FRAME_HEIGHT / scale,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT
  );
  return canvas.toDataURL("image/jpeg", 0.88);
}

export interface PhotoCrop {
  zoom: number;
  cx: number;
  cy: number;
}

/** The crop in a form that does not depend on the frame size: zoom and the middle point as fractions */
export function cropOf(
  offset: Point,
  size: { width: number; height: number },
  zoom: number
): PhotoCrop {
  const scale = baseScale(size.width, size.height) * zoom;
  return {
    zoom,
    cx: (FRAME_WIDTH / 2 - offset.x) / (size.width * scale),
    cy: (FRAME_HEIGHT / 2 - offset.y) / (size.height * scale),
  };
}

/** The offset that shows a saved crop */
export function offsetOf(
  crop: PhotoCrop,
  size: { width: number; height: number }
): Point {
  const scale = baseScale(size.width, size.height) * crop.zoom;
  return clampOffset(
    {
      x: FRAME_WIDTH / 2 - crop.cx * size.width * scale,
      y: FRAME_HEIGHT / 2 - crop.cy * size.height * scale,
    },
    size.width,
    size.height,
    crop.zoom
  );
}
