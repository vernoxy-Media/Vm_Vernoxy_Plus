import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { Modal, btn } from '@/features/payroll/components/payroll-ui';
import {
  COVER_PHOTO_ASPECT,
  COVER_PHOTO_CLIP_PATH,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  centerOffset,
  coverScale,
  clampOffset,
  cropViewportToJpeg,
  offsetAfterZoom,
} from './cover-photo-crop';

export interface CoverPhotoCropModalProps {
  open: boolean;
  imageSrc: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

/**
 * Zoom and pan the cover photo inside the printed panel, then export that view.
 * The shaded triangle is the part the quotation page cuts away.
 */
export const CoverPhotoCropModal: React.FC<CoverPhotoCropModalProps> = ({ open, imageSrc, fileName, onCancel, onConfirm }) => {
  const viewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState({ w: 260, h: 260 / COVER_PHOTO_ASPECT });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const maxH = Math.min(520, window.innerHeight * 0.52);
    setView({ w: maxH * COVER_PHOTO_ASPECT, h: maxH });
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!natural) return;
    setZoom(DEFAULT_ZOOM);
    setOffset(centerOffset(natural.w, natural.h, view.w, view.h, DEFAULT_ZOOM));
  }, [natural, view.w, view.h]);

  const applyZoom = (next: number, cx = view.w / 2, cy = view.h / 2) => {
    if (!natural) return;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setOffset((prev) => offsetAfterZoom(zoom, z, prev, natural.w, natural.h, view.w, view.h, cx, cy));
    setZoom(z);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !natural) return;
    setOffset(
      clampOffset(
        drag.current.ox + (e.clientX - drag.current.x),
        drag.current.oy + (e.clientY - drag.current.y),
        natural.w,
        natural.h,
        view.w,
        view.h,
        zoom,
      ),
    );
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    applyZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - rect.left, e.clientY - rect.top);
  };

  const apply = async () => {
    const image = imgRef.current;
    if (!image || !natural) {
      setError('Wait for the photo to load, then try again.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await cropViewportToJpeg(image, view.w, view.h, offset, zoom);
      const base = fileName.replace(/\.[^.]+$/, '') || 'cover-photo';
      onConfirm(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
    } catch {
      setError('This image could not be cropped. Try another JPG or PNG.');
    } finally {
      setBusy(false);
    }
  };

  const scale = natural ? coverScale(natural.w, natural.h, view.w, view.h) * zoom : 1;

  return (
    <Modal
      open={open}
      title="Fit cover photo"
      width="max-w-3xl"
      subtitle="Zoom and drag until the laptop, mug and faces sit in the bright shape. Everything in the dark area is cut off on the quotation — including the lower-left of this box."
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={btn.primary} onClick={apply} disabled={busy || !natural}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Use this view
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex justify-center rounded-xl bg-slate-900/90 p-4">
          <div
            ref={viewRef}
            className="relative cursor-grab overflow-hidden rounded-md bg-white active:cursor-grabbing touch-none"
            style={{ width: view.w, height: view.h }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Cover photo"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width: natural ? natural.w * scale : undefined,
                height: natural ? natural.h * scale : undefined,
                left: offset.x,
                top: offset.y,
              }}
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path fill="rgba(2,6,23,0.62)" fillRule="evenodd" d={`M0 0 H100 V100 H0 Z ${COVER_PHOTO_CLIP_PATH}`} />
              <path fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.7" vectorEffect="non-scaling-stroke" d={COVER_PHOTO_CLIP_PATH} />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btn.secondary}
            onClick={() => applyZoom(zoom - 0.25)}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
            Zoom out
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="h-2 min-w-[12rem] flex-1 cursor-pointer accent-blue-600"
            aria-label="Zoom"
          />
          <button
            type="button"
            className={btn.secondary}
            onClick={() => applyZoom(zoom + 0.25)}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
            Zoom in
          </button>
          <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className={btn.secondary}
            onClick={() => {
              if (!natural) return;
              setZoom(DEFAULT_ZOOM);
              setOffset(centerOffset(natural.w, natural.h, view.w, view.h, DEFAULT_ZOOM));
            }}
          >
            Reset
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Scroll the mouse wheel to zoom. Drag the photo to move it.</p>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
};
