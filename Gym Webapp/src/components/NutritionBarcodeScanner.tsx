import { useEffect, useRef } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader } from '@zxing/browser';

/** ZXing throws this on every frame with no decode; avoid importing `@zxing/library` (not a direct dep on CI). */
function isZxingNotFoundInFrame(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  return (err as { name?: string }).name === 'NotFoundException';
}

type NutritionBarcodeScannerProps = {
  open: boolean;
  onClose: () => void;
  onBarcode: (raw: string) => void;
  onScannerError?: (message: string) => void;
};

/**
 * Live camera barcode scan (EAN/UPC etc.) via @zxing/browser.
 * Uses refs for callbacks so the camera stream is not restarted on parent re-renders.
 */
function NutritionBarcodeScanner({ open, onClose, onBarcode, onScannerError }: NutritionBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onBarcodeRef = useRef(onBarcode);
  const onCloseRef = useRef(onClose);
  const onScannerErrorRef = useRef(onScannerError);
  const doneRef = useRef(false);

  onBarcodeRef.current = onBarcode;
  onCloseRef.current = onClose;
  onScannerErrorRef.current = onScannerError;

  function releaseCamera() {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
    try {
      BrowserCodeReader.releaseAllStreams();
    } catch {
      /* ignore */
    }
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
  }

  useEffect(() => {
    if (!open) {
      releaseCamera();
      doneRef.current = false;
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    doneRef.current = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, video, (result, err) => {
        if (doneRef.current) return;
        if (result?.getText()) {
          const text = result.getText().trim();
          if (text) {
            doneRef.current = true;
            releaseCamera();
            onBarcodeRef.current(text);
            onCloseRef.current();
          }
          return;
        }
        if (err && !isZxingNotFoundInFrame(err)) {
          console.warn('[NutritionBarcodeScanner]', err);
        }
      })
      .then((controls) => {
        if (doneRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((e: unknown) => {
        const msg = String(e ?? '');
        const denied =
          /NotAllowedError|PermissionDenied|permission/i.test(msg) ||
          (e instanceof DOMException && e.name === 'NotAllowedError');
        const text = denied
          ? 'Camera permission denied. Allow camera for this site, then try again.'
          : 'Could not start the camera. You can still search by name.';
        onScannerErrorRef.current?.(text);
        onCloseRef.current();
      });

    return () => {
      doneRef.current = true;
      releaseCamera();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="nutrition-scan-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nutrition-scan-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nutrition-scan-card">
        <div className="nutrition-scan-head">
          <span id="nutrition-scan-title" className="nutrition-scan-title">
            Scan barcode
          </span>
          <button type="button" className="button button-muted button-small" onClick={() => onClose()}>
            Close
          </button>
        </div>
        <video ref={videoRef} className="nutrition-scan-video" muted playsInline autoPlay />
        <p className="panel-subtle nutrition-scan-hint">Point at a product barcode (UPC / EAN). Escape closes.</p>
      </div>
    </div>
  );
}

export default NutritionBarcodeScanner;
