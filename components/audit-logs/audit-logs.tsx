'use client';

import { useState } from 'react';

import styles from './audit-logs.module.css';

type AuditEvent = {
  id: string;
  team: string;
  prompt: string;
  version: string;
  user: string;
  systemTokens: number;
  latency: number;
  source: 'Dashboard' | 'API' | 'CLI';
  timestamp: string;
  status: 'Success' | 'Review';
};

const events: AuditEvent[] = [];

export function AuditLogs() {
  const [query, setQuery] = useState('');
  const [streamedEvents] = useState(events);
  const visibleEvents = streamedEvents.filter((event) => {
    const searchable = `${event.team} ${event.prompt} ${event.version} ${event.user} ${event.source}`.toLowerCase();

    return searchable.includes(query.toLowerCase());
  });

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Workspace activity</p>
          <h1>Audit logs</h1>
          <p className={styles.description}>Live prompt execution data for Default.</p>
        </div>
        <button type="button" className={styles.exportButton}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2.5v7" />
            <path d="m5.25 6.75 2.75 2.75 2.75-2.75" />
            <path d="M3 11.5v1.25c0 .69.56 1.25 1.25 1.25h7.5c.69 0 1.25-.56 1.25-1.25V11.5" />
          </svg>
          Export
        </button>
      </div>

      <div className={styles.summary}>
        <div><span>Requests today</span><strong>0</strong><small>across all prompts</small></div>
        <div><span>System tokens</span><strong>0</strong><small>last 24 hours</small></div>
        <div><span>P95 latency</span><strong>--</strong><small>last 24 hours</small></div>
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
              <tr><th>Team</th><th>Prompt</th><th>Version</th><th>User</th><th>System tokens</th><th>Latency</th><th>Time</th></tr>
            </thead>
            <tbody>
              {visibleEvents.map((event, index) => (
                <tr key={event.id} className={index === 0 ? styles.newRow : undefined}>
                  <td><span className={styles.team}>{event.team}</span></td>
                  <td><strong className={styles.target}>{event.prompt}</strong></td>
                  <td><span className={styles.version}>{event.version}</span></td>
                  <td><span className={styles.user}>{event.user}</span></td>
                  <td className={styles.metric}>{event.systemTokens.toLocaleString()}</td>
                  <td className={event.status === 'Success' ? styles.latency : styles.latencyReview}>{event.latency} ms</td>
                  <td className={styles.time}>{event.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleEvents.length === 0 ? <p className={styles.empty}>No audit events yet. Activity will appear here when a prompt is used.</p> : null}
        </div>

        <footer className={styles.footer}>
          <span>Showing {visibleEvents.length} events</span>
          <div><button type="button" disabled>Previous</button><button type="button" disabled>Next</button></div>
        </footer>
      </div>
    </section>
  );
}
