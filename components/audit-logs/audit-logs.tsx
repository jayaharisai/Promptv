'use client';

import { useEffect, useState } from 'react';

import styles from './audit-logs.module.css';

type AuditEvent = {
  id: string;
  access_key_name: string;
  action: string;
  resource_type: string;
  resource_name: string | null;
  status_code: number;
  created_at: string;
};

type AuditLogPage = {
  items: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

const pageSize = 25;

export function AuditLogs() {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [workspaceName, setWorkspaceName] = useState('this workspace');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<AuditLogPage>({ items: [], total: 0, limit: pageSize, offset: 0, has_more: false });

  useEffect(() => {
    let isCurrent = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let subscribedWorkspaceId = '';

    function websocketUrl(workspaceId: string) {
      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');
      return `${backendUrl.replace(/^http/, 'ws')}/api/v1/ws/workspaces/${encodeURIComponent(workspaceId)}/audit-logs`;
    }

    function subscribe(workspaceId: string) {
      if (subscribedWorkspaceId === workspaceId && socket?.readyState !== WebSocket.CLOSED) return;
      socket?.close();
      window.clearTimeout(reconnectTimer);
      subscribedWorkspaceId = workspaceId;
      socket = new WebSocket(websocketUrl(workspaceId));
      socket.onmessage = (message) => {
        const event = JSON.parse(message.data) as AuditEvent;
        if (page === 0) {
          setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, pageSize));
          setPageInfo((current) => ({ ...current, total: current.total + 1, has_more: current.total + 1 > pageSize }));
        }
      };
      socket.onclose = () => {
        if (isCurrent && subscribedWorkspaceId === workspaceId) {
          reconnectTimer = window.setTimeout(() => subscribe(workspaceId), 3_000);
        }
      };
    }

    async function loadEvents() {
      const activeResponse = await fetch('/api/workspaces/active', { cache: 'no-store' }).catch(() => null);
      const active = activeResponse?.ok ? await activeResponse.json() as { workspaceId: string | null } : null;
      const workspacesResponse = await fetch('/api/workspaces', { cache: 'no-store' }).catch(() => null);
      const workspaces = workspacesResponse?.ok ? await workspacesResponse.json() as { id: string; name: string }[] : [];
      const workspace = workspaces.find((item) => item.id === active?.workspaceId) ?? workspaces[0];

      if (!workspace) {
        if (isCurrent) {
          setLoadError('Unable to find a workspace for these audit logs.');
          setIsLoading(false);
        }
        return;
      }

      const response = await fetch(`/api/workspaces/${workspace.id}/audit-logs?limit=${pageSize}&offset=${page * pageSize}`, { cache: 'no-store' }).catch(() => null);
      if (!isCurrent) return;
      if (!response?.ok) {
        setLoadError('Unable to load audit activity.');
        setIsLoading(false);
        return;
      }

      setWorkspaceName(workspace.name);
      const auditPage = await response.json() as AuditLogPage;
      setEvents(auditPage.items);
      setPageInfo(auditPage);
      setLoadError('');
      setIsLoading(false);
      subscribe(workspace.id);
    }

    void loadEvents();
    window.addEventListener('promptv:workspace-change', loadEvents);
    return () => {
      isCurrent = false;
      window.clearTimeout(reconnectTimer);
      socket?.close();
      window.removeEventListener('promptv:workspace-change', loadEvents);
    };
  }, [page]);

  const visibleEvents = events.filter((event) => {
    const searchable = `${event.access_key_name} ${event.action} ${event.resource_type} ${event.resource_name ?? ''} ${event.status_code}`.toLowerCase();

    return searchable.includes(query.toLowerCase());
  });
  const successfulEvents = events.filter((event) => event.status_code < 400).length;
  const failedEvents = events.length - successfulEvents;
  const firstEvent = pageInfo.total === 0 ? 0 : pageInfo.offset + 1;
  const lastEvent = pageInfo.offset + visibleEvents.length;

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Workspace activity</p>
          <h1>Audit logs</h1>
          <p className={styles.description}>Live access-key activity for {workspaceName}.</p>
        </div>
      </div>

      <div className={styles.summary}>
        <div><span>Recorded requests</span><strong>{pageInfo.total}</strong><small>all API requests</small></div>
        <div><span>Successful</span><strong>{successfulEvents}</strong><small>on this page</small></div>
        <div><span>Failed</span><strong>{failedEvents}</strong><small>on this page</small></div>
      </div>

      <div className={styles.logsPanel}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="3.75" />
              <path d="m10 10 3 3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activity"
              aria-label="Search activity"
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Access key</th><th>Action</th><th>Resource</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {visibleEvents.map((event, index) => (
                <tr key={event.id} className={index === 0 ? styles.newRow : undefined}>
                  <td><span className={styles.team}>{event.access_key_name}</span></td>
                  <td><strong className={styles.target}>{event.action.replaceAll('_', ' ')}</strong></td>
                  <td><span className={styles.version}>{event.resource_name ?? event.resource_type}</span></td>
                  <td className={event.status_code < 400 ? styles.latency : styles.latencyReview}>{event.status_code}</td>
                  <td className={styles.time}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(event.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading ? <p className={styles.empty}>Loading audit activity…</p> : null}
          {!isLoading && (loadError || (visibleEvents.length === 0 ? 'No audit events yet. Activity will appear here when an access key is used.' : '')) ? <p className={styles.empty}>{loadError || 'No audit events yet. Activity will appear here when an access key is used.'}</p> : null}
        </div>

        <footer className={styles.footer}>
          <span>Showing {firstEvent}-{lastEvent} of {pageInfo.total} events</span>
          <div><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || isLoading}>Previous</button><button type="button" onClick={() => setPage((current) => current + 1)} disabled={!pageInfo.has_more || isLoading}>Next</button></div>
        </footer>
      </div>
    </section>
  );
}
