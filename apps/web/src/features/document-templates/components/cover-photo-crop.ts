/** Cover photo box on A4: 54% × 74% of 210×297 mm (matches .q-photo in quotation.source). */
export const COVER_PHOTO_ASPECT = (210 * 0.54) / (297 * 0.74);

/** SVG path (viewBox 0 0 100 100) of the printed photo cut. Must match `.q-photo` clip-path in quotation.source.ts. */
export const COVER_PHOTO_CLIP_PATH = 'M42 0 H100 V100 L3 42 Z';

/** Below 1 the photo no longer fills the box; the uncovered area prints white, like the page. */
export const MIN_ZOOM = 0.3;
/** Start / Reset: the photo just covers the box. */
export const DEFAULT_ZOOM = 1;
export const MAX_ZOOM = 4;

export function coverScale(naturalW: number, naturalH: number, viewW: number, viewH: number): number {
  return Math.max(viewW / naturalW, viewH / naturalH);
}

export function clampOffset(
  x: number,
  y: number,
  naturalW: number,
  naturalH: number,
  viewW: number,
  viewH: number,
  zoom: number,
): { x: number; y: number } {
  const scale = coverScale(naturalW, naturalH, viewW, viewH) * zoom;
  return { x: clampAxis(x, viewW, naturalW * scale), y: clampAxis(y, viewH, naturalH * scale) };
}

/** Larger than the box: no gap may show. Smaller (zoomed out): the photo stays inside the box. */
function clampAxis(pos: number, view: number, size: number): number {
  return size >= view ? Math.min(0, Math.max(view - size, pos)) : Math.min(view - size, Math.max(0, pos));
}

export function centerOffset(
  naturalW: number,
  naturalH: number,
  viewW: number,
  viewH: number,
  zoom: number,
): { x: number; y: number } {
  const scale = coverScale(naturalW, naturalH, viewW, viewH) * zoom;
  return clampOffset((viewW - naturalW * scale) / 2, (viewH - naturalH * scale) / 2, naturalW, naturalH, viewW, viewH, zoom);
}

/** Keep the point under (cx, cy) in the viewport stable when zoom changes. */
export function offsetAfterZoom(
  oldZoom: number,
  newZoom: number,
  offset: { x: number; y: number },
  naturalW: number,
  naturalH: number,
  viewW: number,
  viewH: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const oldScale = coverScale(naturalW, naturalH, viewW, viewH) * oldZoom;
  const imgX = (cx - offset.x) / oldScale;
  const imgY = (cy - offset.y) / oldScale;
  const newScale = coverScale(naturalW, naturalH, viewW, viewH) * newZoom;
  return clampOffset(cx - imgX * newScale, cy - imgY * newScale, naturalW, naturalH, viewW, viewH, newZoom);
}

export function cropViewportToJpeg(
  image: HTMLImageElement,
  viewW: number,
  viewH: number,
  offset: { x: number; y: number },
  zoom: number,
  quality = 0.9,
): Promise<Blob> {
  const scale = coverScale(image.naturalWidth, image.naturalHeight, viewW, viewH) * zoom;
  const outW = 1600;
  const outH = Math.max(1, Math.round(outW / COVER_PHOTO_ASPECT));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Could not crop this image.'));
  // White where the zoomed-out photo does not reach; the canvas cuts off whatever lies outside.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingQuality = 'high';
  const k = outW / viewW;
  ctx.drawImage(image, offset.x * k, offset.y * k, image.naturalWidth * scale * k, image.naturalHeight * scale * k);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not crop this image.'))), 'image/jpeg', quality);
  });
}
