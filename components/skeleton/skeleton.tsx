import styles from './skeleton.module.css';

type SkeletonProps = {
  className?: string;
  label?: string;
};

export function Skeleton({ className = '', label = 'Loading' }: SkeletonProps) {
  return <span className={`${styles.skeleton} ${className}`} aria-label={label} role="status" />;
}
