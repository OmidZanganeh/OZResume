'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import styles from './page.module.css';

type Tab = 'merge' | 'image' | 'img2pdf' | 'pdf2jpg';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** pdf-lib returns Uint8Array views that TypeScript treats as non-BlobPart; copy to a plain buffer for Blob. */
function bytesToBlob(data: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return new Blob([copy], { type });
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
      reject(new Error('Could not read this image. Try PNG or JPEG.'));
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
      const out = await merged.save();
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

/* ─── Image format converter ─── */
function ImageConvertPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [webpOk, setWebpOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    c.toBlob(b => setWebpOk(!!b), 'image/webp', 0.8);
  }, []);

  const run = async () => {
    if (!file) {
      setErr('Choose an image first.');
      return;
    }
    if (format === 'image/webp') {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ok = await new Promise<boolean>(res => {
        canvas.toBlob(b => res(!!b), 'image/webp', 0.8);
      });
      if (!ok) {
        setErr('WebP export is not supported in this browser. Try PNG or JPEG.');
        return;
      }
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
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((res, rej) => {
        const q = format === 'image/jpeg' || format === 'image/webp' ? quality : undefined;
        canvas.toBlob(b => (b ? res(b) : rej(new Error('Export failed.'))), format, q);
      });
      const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
      const base = file.name.replace(/\.[^.]+$/, '') || 'image';
      downloadBlob(blob, `${base}.${ext}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.toolBody}>
      <p className={styles.toolDesc}>Convert PNG, JPEG, WebP, GIF, and other browser-readable images to PNG, JPEG, or WebP.</p>
      <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}>🖼</span>
        <p className={styles.dropText}>
          <span className={styles.dropLink}>Choose image</span>
        </p>
        <p className={styles.dropHint}>{file ? file.name : 'image/*'}</p>
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept="image/*"
          onChange={e => {
            setErr('');
            const f = e.target.files?.[0];
            setFile(f ?? null);
          }}
        />
      </div>
      <div className={styles.rowField}>
        <span className={styles.rowLabel}>Output format</span>
        <select className={styles.select} value={format} onChange={e => setFormat(e.target.value as typeof format)}>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          {webpOk && <option value="image/webp">WebP</option>}
        </select>
      </div>
      {(format === 'image/jpeg' || format === 'image/webp') && (
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
        /* fall through to PNG path */
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
      const out = await doc.save();
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
  { id: 'image', label: 'Image convert' },
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
            Merge PDFs, convert image formats, build a PDF from images, and export PDF pages as JPEG — all in your browser.
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
        {tab === 'image' && <ImageConvertPanel />}
        {tab === 'img2pdf' && <ImagesToPdfPanel />}
        {tab === 'pdf2jpg' && <PdfToJpegPanel />}
      </div>
    </div>
  );
}
