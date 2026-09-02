import { AuditLogs } from '../../components/audit-logs';
import { WorkspaceSidebar } from '../../components/workspace-sidebar';

export default function AuditLogsPage() {
  return (
    <main>
      <WorkspaceSidebar />
      <AuditLogs />
    </main>
  );
}
