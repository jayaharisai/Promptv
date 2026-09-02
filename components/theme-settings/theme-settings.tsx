'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import styles from './theme-settings.module.css';

const themes = [
  { name: 'Amber', value: '#f2d36b' },
  { name: 'Mint', value: '#86c7a1' },
  { name: 'Sky', value: '#79b7e5' },
  { name: 'Coral', value: '#e99682' },
  { name: 'Rose', value: '#d995a8' },
];

export function ThemeSettings() {
  const [selectedAccent, setSelectedAccent] = useState('#f2d36b');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedAccent = window.localStorage.getItem('promptv-accent');

    if (savedAccent && themes.some((theme) => theme.value === savedAccent)) {
      setSelectedAccent(savedAccent);
    }
  }, []);

  function saveTheme() {
    document.documentElement.style.setProperty('--accent', selectedAccent);
    window.localStorage.setItem('promptv-accent', selectedAccent);
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2200);
  }

  return (
    <section className={styles.page}>
      <header>
        <p>Workspace settings</p>
        <h1>Theme</h1>
        <span>Choose the accent color used across your Promptv workspace.</span>
      </header>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><strong>Accent color</strong><span>Used for buttons, charts, focus states, and highlights.</span></div>
          <span className={styles.preview} style={{ backgroundColor: selectedAccent }} aria-label={`${selectedAccent} preview`} />
        </div>
        <div className={styles.swatches} role="radiogroup" aria-label="Accent color">
          {themes.map((theme) => (
            <button
              key={theme.value}
              type="button"
              className={selectedAccent === theme.value ? styles.swatchSelected : styles.swatch}
              style={{ '--swatch-color': theme.value } as CSSProperties}
              onClick={() => { setSelectedAccent(theme.value); setIsSaved(false); }}
              role="radio"
              aria-checked={selectedAccent === theme.value}
              aria-label={theme.name}
            >
              <span />
              <small>{theme.name}</small>
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <span>{isSaved ? 'Theme saved and applied.' : 'Changes apply when you save.'}</span>
          <button type="button" onClick={saveTheme}>Save theme</button>
        </div>
      </div>
    </section>
  );
}
