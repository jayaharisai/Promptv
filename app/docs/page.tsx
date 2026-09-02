import { Documentation } from '../../components/documentation';
import { WorkspaceSidebar } from '../../components/workspace-sidebar';
import styles from './page.module.css';

export default function DocsPage() {
  return (
    <main className={styles.page}>
      <WorkspaceSidebar />
      <Documentation />
    </main>
  );
}
