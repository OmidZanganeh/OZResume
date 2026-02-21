'use client';

import { useEffect } from 'react';

/**
 * When user taps "Request desktop site" on mobile, some browsers (e.g. Safari)
 * keep the viewport at device-width, so our (min-width: 961px) media query
 * never triggers. We detect "desktop UA + narrow viewport" and add a class
 * so CSS can show the desktop layout anyway.
 */
export default function DesktopLayoutDetector() {
  useEffect(() => {
    const viewportW = document.documentElement.clientWidth || window.innerWidth;
    const isNarrowViewport = viewportW < 961;
    // When "Request desktop site" is on, many browsers send a desktop UA (no "Mobile")
    const looksLikeDesktopRequest = !/Mobile/i.test(navigator.userAgent);

    if (isNarrowViewport && looksLikeDesktopRequest) {
      document.documentElement.classList.add('desktop-layout-requested');
    }
  }, []);

  return null;
}
