/** 24-bit BMP (BGR, bottom-up), Windows V3 header */

export function canvasToBmp24(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available.');
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const rowStride = Math.ceil((w * 3) / 4) * 4;
  const pixelSize = rowStride * h;
  const fileSize = 14 + 40 + pixelSize;
  const buf = new ArrayBuffer(fileSize);
  const u8 = new Uint8Array(buf);
  const view = new DataView(buf);

  u8[0] = 0x42;
  u8[1] = 0x4d;
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 14 + 40, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, w, true);
  view.setInt32(22, h, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  let offset = 54;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      u8[offset++] = data[i + 2];
      u8[offset++] = data[i + 1];
      u8[offset++] = data[i];
    }
    const pad = rowStride - w * 3;
    for (let p = 0; p < pad; p++) u8[offset++] = 0;
  }

  return u8;
}

/** ICO with embedded PNG payloads (Windows Vista+), multiple square sizes */

export async function buildMultiSizeIco(img: HTMLImageElement, sizes: number[]): Promise<Uint8Array> {
  const pngs: { w: number; h: number; data: Uint8Array }[] = [];

  for (const s of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.clearRect(0, 0, s, s);
    const scale = Math.min(s / img.naturalWidth, s / img.naturalHeight);
    const dw = Math.max(1, Math.round(img.naturalWidth * scale));
    const dh = Math.max(1, Math.round(img.naturalHeight * scale));
    const dx = Math.floor((s - dw) / 2);
    const dy = Math.floor((s - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png'),
    );
    pngs.push({ w: s, h: s, data: new Uint8Array(await blob.arrayBuffer()) });
  }

  if (pngs.length === 0) throw new Error('Could not build ICO.');

  const count = pngs.length;
  const headerSize = 6 + count * 16;
  let total = headerSize;
  for (const p of pngs) total += p.data.length;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  let dataOffset = headerSize;
  for (let i = 0; i < count; i++) {
    const p = pngs[i];
    const e = 6 + i * 16;
    out[e] = p.w >= 256 ? 0 : p.w;
    out[e + 1] = p.h >= 256 ? 0 : p.h;
    out[e + 2] = 0;
    out[e + 3] = 0;
    view.setUint16(e + 4, 1, true);
    view.setUint16(e + 6, 32, true);
    view.setUint32(e + 8, p.data.length, true);
    view.setUint32(e + 12, dataOffset, true);
    out.set(p.data, dataOffset);
    dataOffset += p.data.length;
  }

  return out;
}

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256] as const;
