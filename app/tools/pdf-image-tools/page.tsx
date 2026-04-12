'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { ICO_SIZES, buildMultiSizeIco, canvasToBmp24 } from './format-utils';
import styles from './page.module.css';

type Tab =
  | 'merge'
  | 'compress'
  | 'split'
  | 'image'
  | 'resize'
  | 'img2pdf'
  | 'pdf2jpg';

type RasterMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bytesToBlob(data: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return new Blob([copy], { type });
}

function fmtMb(n: number): string {
  return (n / (1024 * 1024)).toFixed(2);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image. Try PNG, JPEG, WebP, SVG, or ICO.'));
    };
    img.src = url;
  });
}

async function imageFileToPngBytes(file: File): Promise<Uint8Array> {
  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available.');
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not encode image.'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

async function ensurePdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

async function rasterizePdfToNewPdf(file: File, quality: number, scale: number): Promise<Uint8Array> {
  const pdfjs = await ensurePdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const doc = await PDFDocument.create();
  const n = pdf.numPages;
  for (let p = 1; p <= n; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available.');
    const task = page.render({ canvasContext: ctx, viewport, canvas });
    await task.promise;
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('JPEG encode failed.'))), 'image/jpeg', quality),
    );
    const jpgBytes = new Uint8Array(await blob.arrayBuffer());
    const image = await doc.embedJpg(jpgBytes);
    const pageW = image.width;
    const pageH = image.height;
    const pdfPage = doc.addPage([pageW, pageH]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  }
  return doc.save({ useObjectStreams: true });
}

function computeResize(
  w: number,
  h: number,
  mode: 'maxW' | 'maxH' | 'width' | 'height' | 'percent',
  value: number,
): { nw: number; nh: number } {
  if (mode === 'percent') {
    const s = Math.max(1, value) / 100;
    return { nw: Math.max(1, Math.round(w * s)), nh: Math.max(1, Math.round(h * s)) };
  }
  if (mode === 'width') {
    const nw = Math.max(1, Math.round(value));
    return { nw, nh: Math.max(1, Math.round((h * nw) / w)) };
  }
  if (mode === 'height') {
    const nh = Math.max(1, Math.round(value));
    return { nw: Math.max(1, Math.round((w * nh) / h)), nh };
  }
  if (mode === 'maxW') {
    const maxW = Math.max(1, value);
    if (w <= maxW) return { nw: w, nh: h };
    const nw = maxW;
    return { nw, nh: Math.max(1, Math.round((h * nw) / w)) };
  }
  const maxH = Math.max(1, value);
  if (h <= maxH) return { nw: w, nh: h };
  const nh = maxH;
  return { nw: Math.max(1, Math.round((w * nh) / h)), nh };
}

/* ─── Merge PDFs ─── */
function MergePdfsPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setErr('');
    setFiles(prev => [...prev, ...Array.from(list).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    setFiles(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const run = async () => {
    if (files.length < 2) {
      setErr('Add at least two PDF files to merge.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const idx = src.getPageIndices();
        const pages = await merged.copyPages(src, idx);
        pages.forEach(p => merged.addPage(p));
      }
      const out = await merged.save({ useObjectStreams: true });
      downloadBlob(bytesToBlob(out, 'application/pdf'), 'merged.pdf');
    } catch (e) {
      setErr((e as Error).message || 'Merge failed. Encrypted PDFs are not supported.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>Combine multiple PDFs into one file. Order matters — use the arrows to reorder pages.</p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>📄</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Add PDFs</span> — click or tap here
        </p>
        <p className={styles.dropHint}>application/pdf · multiple files OK</p>
        <input ref={inputRef} type="file" className={styles.hiddenInput} accept=".pdf,application/pdf" multiple onChange={e => addFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <ol className={styles.fileList}>
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className={styles.fileRow}>
              <span className={styles.fileName}>{f.name}</span>
              <div className={styles.fileRowBtns}>
                <button type="button" className={styles.iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className={styles.iconBtn} onClick={() => move(i, 1)} disabled={i === files.length - 1} aria-label="Move down">↓</button>
                <button type="button" className={styles.iconBtn} onClick={() => setFiles(prev => prev.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {err && <div className={styles.errorBox}>{err}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || files.length < 2}>
          {busy ? 'Merging…' : 'Download merged.pdf'}
        </button>
      </div>
      <p className={styles.infoMsg}>Runs entirely in your browser. Password-protected PDFs may fail.</p>
    </div>
  );
}

/* ─── Compress PDF ─── */
function CompressPdfPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'repack' | 'raster'>('repack');
  const [quality, setQuality] = useState(0.72);
  const [scale, setScale] = useState(1.5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    if (!file) {
      setErr('Choose a PDF first.');
      return;
    }
    setBusy(true);
    setErr('');
    setNote('');
    const before = file.size;
    try {
      let out: Uint8Array;
      if (mode === 'repack') {
        const src = await PDFDocument.load(await file.arrayBuffer());
        out = await src.save({ useObjectStreams: true });
      } else {
        out = await rasterizePdfToNewPdf(file, quality, scale);
      }
      const after = out.byteLength;
      setNote(`Size: ${fmtMb(before)} MB → ${fmtMb(after)} MB (${before <= after ? 'same or larger — try raster mode or lower quality' : 'smaller'})`);
      downloadBlob(bytesToBlob(out, 'application/pdf'), 'compressed.pdf');
    } catch (e) {
      setErr((e as Error).message || 'Could not compress PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>
        <strong>Repack</strong> rewrites the PDF with object streams (sometimes smaller). <strong>Rasterize</strong> redraws every page as a JPEG — often much smaller but text is no longer selectable.
      </p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>🗜</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Choose PDF</span>
        </p>
        <p className={styles.dropHint}>{file ? `${file.name} · ${fmtMb(file.size)} MB` : '.pdf'}</p>
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept=".pdf,application/pdf"
          onChange={e => {
            setErr('');
            setNote('');
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>Mode</span>
        <select className={styles.select} value={mode} onChange={e => setMode(e.target.value as 'repack' | 'raster')}>
          <option value="repack">Repack (keep vectors)</option>
          <option value="raster">Rasterize (JPEG pages)</option>
        </select>
      </div>
      {mode === 'raster' && (
        <>
          <div className={styles.rowField}>
            <span className={styles.rowLabel}>JPEG quality</span>
            <div className={styles.rangeRow}>
              <input type="range" min={0.35} max={0.95} step={0.02} value={quality} onChange={e => setQuality(Number(e.target.value))} />
              <span className={styles.rangeVal}>{Math.round(quality * 100)}%</span>
            </div>
          </div>
          <div className={styles.rowField}>
            <span className={styles.rowLabel}>Render scale</span>
            <div className={styles.rangeRow}>
              <input type="range" min={1} max={2.5} step={0.25} value={scale} onChange={e => setScale(Number(e.target.value))} />
              <span className={styles.rangeVal}>{scale}×</span>
            </div>
          </div>
        </>
      )}
      {err && <div className={styles.errorBox}>{err}</div>}
      {note && <p className={styles.infoMsg}>{note}</p>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || !file}>
          {busy ? 'Working…' : 'Download compressed.pdf'}
        </button>
      </div>
    </div>
  );
}

/* ─── Split PDF ─── */
function SplitPdfPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    if (!file) {
      setErr('Choose a PDF first.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const n = src.getPageCount();
      if (n < 1) throw new Error('No pages in PDF.');
      const zip = new JSZip();
      const base = file.name.replace(/\.pdf$/i, '') || 'pages';
      for (let i = 0; i < n; i++) {
        const part = await PDFDocument.create();
        const [page] = await part.copyPages(src, [i]);
        part.addPage(page);
        const out = await part.save({ useObjectStreams: true });
        zip.file(`${base}-page-${String(i + 1).padStart(3, '0')}.pdf`, out);
      }
      const zblob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zblob, `${base}-split.zip`);
    } catch (e) {
      setErr((e as Error).message || 'Split failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>One PDF per page, packaged in a ZIP file. Filenames include the original name and page number.</p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>✂</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Choose PDF</span>
        </p>
        <p className={styles.dropHint}>{file ? file.name : '.pdf'}</p>
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept=".pdf,application/pdf"
          onChange={e => {
            setErr('');
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      {err && <div className={styles.errorBox}>{err}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || !file}>
          {busy ? 'Splitting…' : 'Download split ZIP'}
        </button>
      </div>
    </div>
  );
}

/* ─── Image format converter ─── */
type ExportKind = RasterMime | 'bmp' | 'ico';

function ImageConvertPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ExportKind>('image/png');
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [webpOk, setWebpOk] = useState(false);
  const [avifOk, setAvifOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    c.toBlob(b => setWebpOk(!!b), 'image/webp', 0.8);
    c.toBlob(b => setAvifOk(!!b), 'image/avif', 0.5);
  }, []);

  const run = async () => {
    if (!file) {
      setErr('Choose an image first.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const img = await loadImageElement(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available.');
      if (format === 'image/jpeg' || format === 'image/webp' || format === 'image/avif') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const base = file.name.replace(/\.[^.]+$/, '') || 'image';

      if (format === 'bmp') {
        const u8 = canvasToBmp24(canvas);
        downloadBlob(bytesToBlob(u8, 'image/bmp'), `${base}.bmp`);
        return;
      }

      if (format === 'ico') {
        const u8 = await buildMultiSizeIco(img, [...ICO_SIZES]);
        downloadBlob(bytesToBlob(u8, 'image/x-icon'), `${base}.ico`);
        return;
      }

      if (format === 'image/webp' && !webpOk) {
        setErr('WebP is not supported in this browser.');
        return;
      }
      if (format === 'image/avif') {
        const ok = await new Promise<boolean>(res => {
          const t = document.createElement('canvas');
          t.width = 2;
          t.height = 2;
          t.toBlob(b => res(!!b), 'image/avif', 0.5);
        });
        if (!ok) {
          setErr('AVIF export is not supported in this browser. Try PNG or JPEG.');
          return;
        }
      }

      const q = format === 'image/jpeg' || format === 'image/webp' || format === 'image/avif' ? quality : undefined;
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('Export failed.'))), format, q),
      );
      const ext =
        format === 'image/png'
          ? 'png'
          : format === 'image/jpeg'
            ? 'jpg'
            : format === 'image/webp'
              ? 'webp'
              : 'avif';
      downloadBlob(blob, `${base}.${ext}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>
        PNG, JPEG, WebP, AVIF (if the browser supports it), 24-bit BMP, and multi-size ICO (16–256 px). Also accepts SVG and ICO as input when the browser can decode them.
      </p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>🖼</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Choose image</span>
        </p>
        <p className={styles.dropHint}>{file ? file.name : 'image/*, .svg, .ico'}</p>
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept="image/*,.svg,.ico"
          onChange={e => {
            setErr('');
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>Output format</span>
        <select className={styles.select} value={format} onChange={e => setFormat(e.target.value as ExportKind)}>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          {webpOk && <option value="image/webp">WebP</option>}
          {avifOk && <option value="image/avif">AVIF</option>}
          <option value="bmp">BMP (24-bit)</option>
          <option value="ico">ICO (multi-size icon)</option>
        </select>
      </div>
      {(format === 'image/jpeg' || format === 'image/webp' || format === 'image/avif') && (
        <div className={styles.rowField}>
          <span className={styles.rowLabel}>Quality</span>
          <div className={styles.rangeRow}>
            <input type="range" min={0.5} max={1} step={0.02} value={quality} onChange={e => setQuality(Number(e.target.value))} />
            <span className={styles.rangeVal}>{Math.round(quality * 100)}%</span>
          </div>
        </div>
      )}
      {err && <div className={styles.errorBox}>{err}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || !file}>
          {busy ? 'Converting…' : 'Download converted image'}
        </button>
      </div>
    </div>
  );
}

/* ─── Resize image ─── */
function ResizeImagePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'maxW' | 'maxH' | 'width' | 'height' | 'percent'>('maxW');
  const [value, setValue] = useState(1920);
  const [format, setFormat] = useState<ExportKind>('image/png');
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [webpOk, setWebpOk] = useState(false);
  const [avifOk, setAvifOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    c.toBlob(b => setWebpOk(!!b), 'image/webp', 0.8);
    c.toBlob(b => setAvifOk(!!b), 'image/avif', 0.5);
  }, []);

  const run = async () => {
    if (!file) {
      setErr('Choose an image first.');
      return;
    }
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) {
      setErr('Enter a positive number.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const img = await loadImageElement(file);
      const { nw, nh } = computeResize(img.naturalWidth, img.naturalHeight, mode, v);
      const canvas = document.createElement('canvas');
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available.');
      if (format === 'image/jpeg' || format === 'image/webp' || format === 'image/avif') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, nw, nh);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, nw, nh);

      const base = `${file.name.replace(/\.[^.]+$/, '') || 'image'}-resized`;

      if (format === 'bmp') {
        downloadBlob(bytesToBlob(canvasToBmp24(canvas), 'image/bmp'), `${base}.bmp`);
        return;
      }
      if (format === 'ico') {
        const url = canvas.toDataURL('image/png');
        const tmp = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => rej(new Error('ICO build failed.'));
          i.src = url;
        });
        const u8 = await buildMultiSizeIco(tmp, [...ICO_SIZES]);
        downloadBlob(bytesToBlob(u8, 'image/x-icon'), `${base}.ico`);
        return;
      }
      if (format === 'image/webp' && !webpOk) {
        setErr('WebP is not supported in this browser.');
        return;
      }
      if (format === 'image/avif') {
        const ok = await new Promise<boolean>(res => {
          const t = document.createElement('canvas');
          t.width = 2;
          t.height = 2;
          t.toBlob(b => res(!!b), 'image/avif', 0.5);
        });
        if (!ok) {
          setErr('AVIF export is not supported in this browser.');
          return;
        }
      }

      const q = format === 'image/jpeg' || format === 'image/webp' || format === 'image/avif' ? quality : undefined;
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('Export failed.'))), format, q),
      );
      const ext =
        format === 'image/png'
          ? 'png'
          : format === 'image/jpeg'
            ? 'jpg'
            : format === 'image/webp'
              ? 'webp'
              : 'avif';
      downloadBlob(blob, `${base}.${ext}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>Scale down (or up) by max width, max height, exact width, exact height, or percentage. Then pick the output format.</p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>↔</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Choose image</span>
        </p>
        <p className={styles.dropHint}>{file ? file.name : 'image/*, .svg, .ico'}</p>
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept="image/*,.svg,.ico"
          onChange={e => {
            setErr('');
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>Resize rule</span>
        <select className={styles.select} value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
          <option value="maxW">Max width (px, keeps ratio)</option>
          <option value="maxH">Max height (px, keeps ratio)</option>
          <option value="width">Exact width (px)</option>
          <option value="height">Exact height (px)</option>
          <option value="percent">Percent of original size</option>
        </select>
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>{mode === 'percent' ? 'Percent' : 'Pixels / value'}</span>
        <input
          type="number"
          className={styles.select}
          min={1}
          step={mode === 'percent' ? 1 : 1}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
        />
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>Output format</span>
        <select className={styles.select} value={format} onChange={e => setFormat(e.target.value as ExportKind)}>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          {webpOk && <option value="image/webp">WebP</option>}
          {avifOk && <option value="image/avif">AVIF</option>}
          <option value="bmp">BMP (24-bit)</option>
          <option value="ico">ICO (multi-size)</option>
        </select>
      </div>
      {(format === 'image/jpeg' || format === 'image/webp' || format === 'image/avif') && (
        <div className={styles.rowField}>
          <span className={styles.rowLabel}>Quality</span>
          <div className={styles.rangeRow}>
            <input type="range" min={0.5} max={1} step={0.02} value={quality} onChange={e => setQuality(Number(e.target.value))} />
            <span className={styles.rangeVal}>{Math.round(quality * 100)}%</span>
          </div>
        </div>
      )}
      {err && <div className={styles.errorBox}>{err}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || !file}>
          {busy ? 'Resizing…' : 'Download resized image'}
        </button>
      </div>
      <p className={styles.infoMsg}>ICO embeds square sizes 16–256 px from your resized result.</p>
    </div>
  );
}

/* ─── Images → PDF ─── */
function ImagesToPdfPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setErr('');
    setFiles(prev => [...prev, ...Array.from(list).filter(f => f.type.startsWith('image/'))]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    setFiles(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const embedOne = async (doc: PDFDocument, file: File) => {
    const lower = file.name.toLowerCase();
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      try {
        return doc.embedJpg(bytes);
      } catch {
        /* fall through */
      }
    }
    if (lower.endsWith('.png')) {
      try {
        return doc.embedPng(bytes);
      } catch {
        /* fall through */
      }
    }
    const png = await imageFileToPngBytes(file);
    return doc.embedPng(png);
  };

  const run = async () => {
    if (files.length < 1) {
      setErr('Add at least one image.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const image = await embedOne(doc, file);
        const w = image.width;
        const h = image.height;
        const page = doc.addPage([w, h]);
        page.drawImage(image, { x: 0, y: 0, width: w, height: h });
      }
      const out = await doc.save({ useObjectStreams: true });
      downloadBlob(bytesToBlob(out, 'application/pdf'), 'images.pdf');
    } catch (e) {
      setErr((e as Error).message || 'Could not build PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>Turn JPG, PNG, WebP, and other images into a single PDF — one image per page, sized to the image.</p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>📑</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Add images</span>
        </p>
        <p className={styles.dropHint}>JPG, PNG, WebP, GIF, …</p>
        <input ref={inputRef} type="file" className={styles.hiddenInput} accept="image/*" multiple onChange={e => addFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <ol className={styles.fileList}>
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className={styles.fileRow}>
              <span className={styles.fileName}>{f.name}</span>
              <div className={styles.fileRowBtns}>
                <button type="button" className={styles.iconBtn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className={styles.iconBtn} onClick={() => move(i, 1)} disabled={i === files.length - 1}>↓</button>
                <button type="button" className={styles.iconBtn} onClick={() => setFiles(prev => prev.filter((_, k) => k !== i))}>✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {err && <div className={styles.errorBox}>{err}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || files.length < 1}>
          {busy ? 'Building PDF…' : 'Download images.pdf'}
        </button>
      </div>
    </div>
  );
}

/* ─── PDF → JPEG ─── */
function PdfToJpegPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.88);
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    if (!file) {
      setErr('Choose a PDF first.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const pdfjs = await ensurePdfJs();
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;
      const n = pdf.numPages;
      const blobs: Blob[] = [];
      for (let p = 1; p <= n; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not available.');
        const task = page.render({ canvasContext: ctx, viewport, canvas });
        await task.promise;
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => (b ? res(b) : rej(new Error('JPEG export failed.'))), 'image/jpeg', quality),
        );
        blobs.push(blob);
      }
      const base = file.name.replace(/\.pdf$/i, '') || 'pages';
      if (n === 1) {
        downloadBlob(blobs[0], `${base}.jpg`);
      } else {
        const zip = new JSZip();
        blobs.forEach((b, i) => {
          zip.file(`page-${String(i + 1).padStart(3, '0')}.jpg`, b);
        });
        const zblob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zblob, `${base}-pages.zip`);
      }
    } catch (e) {
      setErr((e as Error).message || 'Could not read PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>Rasterize each PDF page to a JPEG. One page → one .jpg file. Multiple pages download as a ZIP of numbered images.</p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>📷</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Choose PDF</span>
        </p>
        <p className={styles.dropHint}>{file ? file.name : '.pdf'}</p>
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept=".pdf,application/pdf"
          onChange={e => {
            setErr('');
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>JPEG quality</span>
        <div className={styles.rangeRow}>
          <input type="range" min={0.5} max={0.98} step={0.02} value={quality} onChange={e => setQuality(Number(e.target.value))} />
          <span className={styles.rangeVal}>{Math.round(quality * 100)}%</span>
        </div>
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>Resolution scale</span>
        <div className={styles.rangeRow}>
          <input type="range" min={1} max={3} step={0.5} value={scale} onChange={e => setScale(Number(e.target.value))} />
          <span className={styles.rangeVal}>{scale}×</span>
        </div>
      </div>
      {err && <div className={styles.errorBox}>{err}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.downloadBtn} onClick={run} disabled={busy || !file}>
          {busy ? 'Rendering…' : 'Download JPEG / ZIP'}
        </button>
      </div>
      <p className={styles.infoMsg}>Large PDFs or high scale use more memory. Encrypted PDFs are not supported.</p>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'merge', label: 'Merge PDFs' },
  { id: 'compress', label: 'Compress PDF' },
  { id: 'split', label: 'Split PDF' },
  { id: 'image', label: 'Image convert' },
  { id: 'resize', label: 'Resize image' },
  { id: 'img2pdf', label: 'Images → PDF' },
  { id: 'pdf2jpg', label: 'PDF → JPEG' },
];

export default function PdfImageToolsPage() {
  const [tab, setTab] = useState<Tab>('merge');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/tools" className={styles.back}>← Back to Tools</Link>
        </div>
        <header className={styles.header}>
          <h1 className={styles.title}>PDF &amp; image tools</h1>
          <p className={styles.subtitle}>
            Merge, compress, and split PDFs; convert and resize images (PNG, JPEG, WebP, AVIF, BMP, ICO); build PDFs from images; export PDF pages as JPEG — in your browser.
          </p>
        </header>

        <div className={styles.tabsWrap} role="tablist" aria-label="Tool mode">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'merge' && <MergePdfsPanel />}
        {tab === 'compress' && <CompressPdfPanel />}
        {tab === 'split' && <SplitPdfPanel />}
        {tab === 'image' && <ImageConvertPanel />}
        {tab === 'resize' && <ResizeImagePanel />}
        {tab === 'img2pdf' && <ImagesToPdfPanel />}
        {tab === 'pdf2jpg' && <PdfToJpegPanel />}
      </div>
    </div>
  );
}
