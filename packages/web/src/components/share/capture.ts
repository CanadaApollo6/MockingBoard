import { domToPng, domToBlob } from 'modern-screenshot';

const CAPTURE_OPTS = {
  scale: 2,
  backgroundColor: '#0a0a0b',
};

/** Capture a DOM element as a PNG data URL. */
export async function capturePng(el: HTMLElement): Promise<string> {
  return domToPng(el, CAPTURE_OPTS);
}

/** Capture a DOM element as a PNG Blob. */
export async function captureBlob(el: HTMLElement): Promise<Blob | null> {
  return domToBlob(el, CAPTURE_OPTS);
}
