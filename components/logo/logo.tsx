import type { CSSProperties } from 'react';

import styles from './logo.module.css';

export type LogoProps = {
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export function Logo({ label = 'promptv', className, style }: LogoProps) {
  return (
    <span className={[styles.logo, className].filter(Boolean).join(' ')} style={style}>
      <span className={styles.label}>{label}</span>
      <span className={styles.dot} aria-hidden="true" />
    </span>
  );
}
