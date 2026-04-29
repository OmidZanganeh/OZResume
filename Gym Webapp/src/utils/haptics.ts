/**
 * Short vibration via the Vibration API. Works on many Android browsers;
 * iOS Safari generally does not support navigator.vibrate — no-op there.
 */
export function hapticLight(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch {
    /* ignore */
  }
}

const DIRECT_CONTROL =
  'button:not(:disabled),[role="button"]:not([aria-disabled="true"]),a.button,input[type="checkbox"]:not(:disabled),input[type="radio"]:not(:disabled),summary';

/** Closest control we should give tap feedback for. Honors data-no-haptic on any ancestor. */
export function findHapticControl(start: EventTarget | null): Element | null {
  const el = start instanceof Element ? start : null;
  if (!el) return null;
  if (el.closest('[data-no-haptic]')) return null;
  const direct = el.closest(DIRECT_CONTROL);
  if (direct) return direct;
  const lab = el.closest('label');
  if (lab) {
    const inp = lab.querySelector('input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled)');
    if (inp) return lab;
  }
  return null;
}

export function attachGlobalHaptics(): () => void {
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (findHapticControl(e.target)) hapticLight();
  };
  document.addEventListener('pointerdown', onPointerDown, { capture: true });
  return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
}
