import styles from './Skeleton.module.css';

export function SkeletonLine({ width = '100%', height = '1rem', style }) {
  return <span className={styles.block} style={{ width, height, ...style }} aria-hidden="true" />;
}
