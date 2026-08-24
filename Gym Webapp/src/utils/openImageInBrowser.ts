/**
 * Open a data-URL image in a new browser tab so the user can save/share
 * with the OS (long-press, Share, Download) — no custom modal.
 */
export function openImageDataUrlInBrowser(dataUrl: string): void {
  const blob = dataUrlToBlob(dataUrl);
  const objectUrl = URL.createObjectURL(blob);

  const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    // Popup blocked (common in some PWAs) — same-tab navigation still shows the image.
    window.location.assign(objectUrl);
  }

  // Keep the blob alive long enough for the new tab / navigation to load.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const header = parts[0] ?? '';
  const data = parts[1] ?? '';
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
