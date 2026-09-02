import { ThemeSettings } from '../../components/theme-settings';
import { WorkspaceSidebar } from '../../components/workspace-sidebar';

export default function SettingsPage() {
  return (
    <main>
      <WorkspaceSidebar />
      <ThemeSettings />
    </main>
  );
}
