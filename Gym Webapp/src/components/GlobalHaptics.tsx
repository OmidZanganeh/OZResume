import { useEffect } from 'react';
import { attachGlobalHaptics } from '../utils/haptics';

/** Registers light haptic feedback for primary controls app-wide. */
export function GlobalHaptics() {
  useEffect(() => attachGlobalHaptics(), []);
  return null;
}
