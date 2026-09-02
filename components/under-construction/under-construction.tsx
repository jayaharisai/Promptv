import { WorkspaceSidebar } from '../workspace-sidebar';
import styles from './under-construction.module.css';

type UnderConstructionProps = {
  title: string;
};

export function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <main className={styles.page}>
      <WorkspaceSidebar />
      <section className={styles.content}>
        <p className={styles.eyebrow}>Promptv</p>
        <h1>{title}</h1>
        <p>Under construction</p>
      </section>
    </main>
  );
}
