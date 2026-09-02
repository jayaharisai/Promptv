'use client';

import { useEffect } from 'react';

export function ThemeLoader() {
  useEffect(() => {
    const accent = window.localStorage.getItem('promptv-accent');

    if (accent) {
      document.documentElement.style.setProperty('--accent', accent);
    }
  }, []);

  return null;
}
