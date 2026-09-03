'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DiscardNotice } from '../discard-notice';
import { Skeleton } from '../skeleton';
import styles from './prompts.module.css';

type Folder = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

type Prompt = {
  id: string;
  folder_id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

const folders: Folder[] = [];
const minimumFolderNameLength = 3;
const minimumFolderDescriptionLength = 20;
function FolderIcon() {
  return (
    <span className={styles.folderIcon} aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h4l1.15 1.35h5.85v6.65c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5z" /></svg>
    </span>
  );
}

function PromptIcon() {
  return (
    <span className={`${styles.folderIcon} ${styles.promptIcon}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none"><path d="M4.5 2.25h4.15l2.85 2.85v8.65H4.5c-.83 0-1.5-.67-1.5-1.5v-8.5c0-.83.67-1.5 1.5-1.5Z" /><path d="M8.5 2.5v3h3M5.7 8h4.6M5.7 10.4h4.6" /></svg>
    </span>
  );
}

function MetricIcon({ type }: { type: 'folders' | 'prompts' | 'activity' }) {
  const paths = {
    folders: <path d="M2.5 4.5h4l1.15 1.35h5.85v6.65c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5z" />,
    prompts: <><path d="M4.5 2.25h4.15l2.85 2.85v8.65H4.5c-.83 0-1.5-.67-1.5-1.5v-8.5c0-.83.67-1.5 1.5-1.5Z" /><path d="M8.5 2.5v3h3M5.7 8h4.6M5.7 10.4h4.6" /></>,
    activity: <path d="M2.5 8h2l1.2-3 2.3 6 1.6-4h3.9" />,
  };

  return <span className={styles.metricIcon} aria-hidden="true"><svg viewBox="0 0 16 16" fill="none">{paths[type]}</svg></span>;
}

type PromptsProps = {
  folderSlug?: string;
};

function truncateText(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function formatPromptCount(count: number) {
  return `${count} prompt${count === 1 ? '' : 's'}`;
}

export function Prompts({ folderSlug }: PromptsProps) {
  const router = useRouter();
  const [folderList, setFolderList] = useState(folders);
  const [workspaceId, setWorkspaceId] = useState('');
  const [promptList, setPromptList] = useState<Prompt[]>([]);
  const [folderPromptCounts, setFolderPromptCounts] = useState<Record<string, number>>({});
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderError, setFolderError] = useState('');
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const selectedFolder = folderList.find((folder) => folder.id === folderSlug) ?? null;
  const folderPrompts = selectedFolder ? promptList : [];
  const totalPromptCount = Object.values(folderPromptCounts).reduce((total, count) => total + count, 0);
  const folderNameLength = folderName.length;
  const folderDescriptionLength = folderDescription.length;
  const canCreateFolder =
    folderName.trim().length >= minimumFolderNameLength &&
    folderDescription.trim().length >= minimumFolderDescriptionLength;
  const isFolderFormDirty = folderName.trim().length > 0 || folderDescription.trim().length > 0;

  useEffect(() => {
    void loadFolders();

    function refreshFoldersForWorkspace() {
      void loadFolders();
    }

    window.addEventListener('promptv:workspace-change', refreshFoldersForWorkspace);
    return () => window.removeEventListener('promptv:workspace-change', refreshFoldersForWorkspace);
  }, []);

  useEffect(() => {
    if (!selectedFolder) {
      setPromptList([]);
      setIsLoadingPrompts(false);
      return;
    }

    void loadPrompts(selectedFolder.id);
  }, [selectedFolder?.id]);

  async function loadFolders() {
    setFolderList([]);
    setFolderError('');
    setIsLoadingFolders(true);
    const [workspacesResponse, activeWorkspaceResponse] = await Promise.all([
      fetch('/api/workspaces', { cache: 'no-store' }).catch(() => null),
      fetch('/api/workspaces/active', { cache: 'no-store' }).catch(() => null),
    ]);
    if (!workspacesResponse?.ok) {
      setFolderError('Unable to load folders. Start the API service and try again.');
      setIsLoadingFolders(false);
      return;
    }

    const workspaces = await workspacesResponse.json() as { id: string }[];
    const activeWorkspace = activeWorkspaceResponse?.ok ? await activeWorkspaceResponse.json() as { workspaceId: string | null } : null;
    const currentWorkspaceId = workspaces.some((workspace) => workspace.id === activeWorkspace?.workspaceId)
      ? activeWorkspace?.workspaceId
      : workspaces[0]?.id;

    if (!currentWorkspaceId) {
      setFolderError('Create a workspace before creating folders.');
      setIsLoadingFolders(false);
      return;
    }

    setWorkspaceId(currentWorkspaceId);
    if (activeWorkspace?.workspaceId !== currentWorkspaceId) {
      void fetch('/api/workspaces/active', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: currentWorkspaceId }) });
    }

    const foldersResponse = await fetch(`/api/workspaces/${currentWorkspaceId}/folders`, { cache: 'no-store' }).catch(() => null);
    if (!foldersResponse?.ok) {
      setFolderError('Unable to load folders. Start the API service and try again.');
      setIsLoadingFolders(false);
      return;
    }
    const loadedFolders = await foldersResponse.json() as Folder[];
    setFolderList(loadedFolders);

    const promptCounts = await Promise.all(loadedFolders.map(async (folder) => {
      const response = await fetch(`/api/folders/${folder.id}/prompts`, { cache: 'no-store' }).catch(() => null);
      const prompts = response?.ok ? await response.json() as Prompt[] : [];
      return [folder.id, prompts.length] as const;
    }));
    setFolderPromptCounts(Object.fromEntries(promptCounts));
    setIsLoadingFolders(false);
  }

  async function loadPrompts(folderId: string) {
    setIsLoadingPrompts(true);
    const response = await fetch(`/api/folders/${folderId}/prompts`, { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) {
      setFolderError('Unable to load prompts. Start the API service and try again.');
      setIsLoadingPrompts(false);
      return;
    }
    setPromptList(await response.json() as Prompt[]);
    setIsLoadingPrompts(false);
  }

  function resetFolderForm() {
    setFolderName('');
    setFolderDescription('');
    setEditingFolder(null);
    setFolderError('');
  }

  function openCreateFolder() {
    resetFolderForm();
    setIsCreateFolderOpen(true);
  }

  function openEditFolder(folder: Folder) {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description);
    setFolderError('');
    setIsCreateFolderOpen(true);
  }

  async function saveFolder() {
    if (!canCreateFolder || !workspaceId) return;

    setIsSavingFolder(true);
    setFolderError('');
    const response = await fetch(editingFolder ? `/api/folders/${editingFolder.id}` : `/api/workspaces/${workspaceId}/folders`, {
      method: editingFolder ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName.trim(), description: folderDescription.trim() }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as Folder | { detail?: string } : null;
    if (!response?.ok) {
      setFolderError((payload as { detail?: string } | null)?.detail ?? 'Unable to save this folder. Try again.');
      setIsSavingFolder(false);
      return;
    }

    const savedFolder = payload as Folder;
    setFolderList((current) => editingFolder
      ? current.map((folder) => folder.id === savedFolder.id ? savedFolder : folder)
      : [savedFolder, ...current]);
    resetFolderForm();
    setIsDiscardConfirmOpen(false);
    setIsCreateFolderOpen(false);
    setIsSavingFolder(false);
  }

  async function deleteFolder(folder: Folder) {
    if (!window.confirm(`Delete ${folder.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as { detail?: string } : null;
      setFolderError(payload?.detail ?? 'Unable to delete this folder. Try again.');
      return;
    }
    setFolderList((current) => current.filter((item) => item.id !== folder.id));
    setFolderPromptCounts((current) => {
      const { [folder.id]: _deletedCount, ...remaining } = current;
      return remaining;
    });
  }

  async function deletePrompt(prompt: Prompt) {
    if (!window.confirm(`Delete ${prompt.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/prompts/${prompt.id}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      setFolderError('Unable to delete this prompt. Try again.');
      return;
    }
    setPromptList((current) => current.filter((item) => item.id !== prompt.id));
    setFolderPromptCounts((current) => ({
      ...current,
      [prompt.folder_id]: Math.max(0, (current[prompt.folder_id] ?? 1) - 1),
    }));
  }

  function requestCloseCreateFolder() {
    if (isFolderFormDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    setIsCreateFolderOpen(false);
  }

  function discardFolderDraft() {
    resetFolderForm();
    setIsDiscardConfirmOpen(false);
    setIsCreateFolderOpen(false);
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{selectedFolder ? 'Prompt folder' : 'Prompt library'}</p>
          <h1>{selectedFolder ? selectedFolder.name : 'Folders'}</h1>
          <p className={styles.description}>
            {selectedFolder ? selectedFolder.description : 'Organise your prompts into folders for each product area.'}
          </p>
        </div>
        {selectedFolder ? (
          <div className={styles.headerActions}>
            <Link href="/prompts" className={styles.secondaryButton}>
              <span aria-hidden="true">←</span> All folders
            </Link>
            <Link href={`/prompts/${selectedFolder.id}/new`} className={styles.createButton}><span aria-hidden="true">+</span> Create prompt</Link>
          </div>
        ) : (
          <button type="button" className={styles.createButton} onClick={openCreateFolder}><span aria-hidden="true">+</span> Create folder</button>
        )}
      </header>

      {!selectedFolder ? (
        <>
          <div className={styles.overview}>
            <div className={styles.metricCard}>
              <MetricIcon type="folders" />
              <span className={styles.metricLabel}>Folders</span>
              {isLoadingFolders ? <Skeleton className={styles.metricValueSkeleton} /> : <strong>{folderList.length}</strong>}
              <span className={styles.metricDetail}>Organised collections</span>
            </div>
            <div className={styles.metricCard}>
              <MetricIcon type="prompts" />
              <span className={styles.metricLabel}>All prompts</span>
              {isLoadingFolders ? <Skeleton className={styles.metricValueSkeleton} /> : <strong>{totalPromptCount}</strong>}
              <span className={styles.metricDetail}>Across this workspace</span>
            </div>
            <div className={styles.metricCard}>
              <MetricIcon type="activity" />
              <span className={styles.metricLabel}>Recently used</span>
              {isLoadingFolders ? <Skeleton className={styles.metricValueSkeleton} /> : <strong>0</strong>}
              <span className={styles.metricDetail}>Activity in the last 7 days</span>
            </div>
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.tableHeader}><p>All folders <span>{folderList.length}</span></p></div>
            <div className={styles.tableWrap}>
              <table className={styles.folderTable}>
                <colgroup>
                  <col className={styles.folderNameCol} />
                  <col className={styles.folderCountCol} />
                  <col className={styles.folderUpdatedCol} />
                  <col className={styles.folderActionsCol} />
                </colgroup>
                <thead><tr><th>Folder</th><th>Prompts</th><th>Last updated</th><th className={styles.folderActions}>Actions</th></tr></thead>
                <tbody>
                  {isLoadingFolders ? Array.from({ length: 4 }, (_, index) => (
                    <tr key={`folder-skeleton-${index}`} aria-hidden="true"><td><div className={styles.folderSkeleton}><Skeleton className={styles.iconSkeleton} /><Skeleton className={styles.nameSkeleton} /></div></td><td><Skeleton className={styles.cellSkeleton} /></td><td><Skeleton className={styles.cellSkeleton} /></td><td><Skeleton className={styles.actionsSkeleton} /></td></tr>
                  )) : folderList.length === 0 ? <tr><td className={styles.emptyState} colSpan={4}>No folders yet. Create your first folder to start organising prompts.</td></tr> : folderList.map((folder) => (
                    <tr
                      key={folder.id}
                      className={styles.clickableRow}
                      onClick={() => router.push(`/prompts/${folder.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(`/prompts/${folder.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <button
                          type="button"
                          className={styles.folderButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/prompts/${folder.id}`);
                          }}
                        >
                          <FolderIcon />
                          <span><strong>{folder.name}</strong><small>{folder.description}</small></span>
                        </button>
                      </td>
                      <td><span className={styles.count}>{formatPromptCount(folderPromptCounts[folder.id] ?? 0)}</span></td>
                      <td className={styles.updated}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(folder.updated_at))}</td>
                      <td className={styles.folderActions}><div className={styles.actions}><button type="button" className={styles.actionButton} onClick={(event) => { event.stopPropagation(); openEditFolder(folder); }}>Edit</button><button type="button" className={styles.deleteButton} onClick={(event) => { event.stopPropagation(); void deleteFolder(folder); }}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className={styles.folderMetrics} aria-label={`${selectedFolder.name} token usage`}>
            <div className={styles.metricsHeader}>
              <div>
                <p>System prompt tokens</p>
                <strong>No activity yet</strong>
                <span>Usage will appear here once prompts are run.</span>
              </div>
            </div>
            <div className={styles.chartEmpty}>
              <span aria-hidden="true" />
              <p>No usage has been recorded for this folder.</p>
            </div>
          </section>

          <div className={styles.tablePanel}>
            <div className={styles.tableHeader}><p>{selectedFolder.name} prompts <span>{folderPrompts.length}</span></p></div>
            <div className={styles.tableWrap}>
              <table className={styles.promptTable}>
                <colgroup>
                  <col className={styles.promptCol} />
                  <col className={styles.versionCol} />
                  <col className={styles.updatedCol} />
                  <col className={styles.statusCol} />
                  <col className={styles.actionsCol} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Version</th>
                    <th>Updated</th>
                    <th>Status</th>
                    <th className={styles.promptActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingPrompts ? Array.from({ length: 5 }, (_, index) => (
                    <tr key={`prompt-skeleton-${index}`} aria-hidden="true"><td><div className={styles.folderSkeleton}><Skeleton className={styles.iconSkeleton} /><Skeleton className={styles.nameSkeleton} /></div></td><td><Skeleton className={styles.cellSkeleton} /></td><td><Skeleton className={styles.cellSkeleton} /></td><td><Skeleton className={styles.cellSkeleton} /></td><td><Skeleton className={styles.actionsSkeleton} /></td></tr>
                  )) : folderPrompts.length === 0 ? <tr><td className={styles.emptyState} colSpan={5}>No prompts in this folder yet. Create a prompt when you are ready.</td></tr> : folderPrompts.map((prompt) => (
                    <tr
                      key={prompt.name}
                      className={styles.clickableRow}
                      onClick={() => router.push(`/prompts/${selectedFolder.id}/${prompt.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(`/prompts/${selectedFolder.id}/${prompt.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <div className={styles.promptInfo}>
                          <PromptIcon />
                          <span>
                            <strong title={prompt.name}>{truncateText(prompt.name, 28)}</strong>
                            <small title={prompt.description}>{truncateText(prompt.description, 42)}</small>
                          </span>
                        </div>
                      </td>
                      <td><span className={styles.version}>{prompt.active_version_id ? 'Active' : '--'}</span></td>
                      <td className={styles.updated}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(prompt.updated_at))}</td>
                      <td><span className={prompt.status === 'published' ? styles.published : styles.draft}>{prompt.status}</span></td>
                      <td className={styles.promptActions}>
                        <div className={styles.actions}>
                          <Link href={`/prompts/${selectedFolder.id}/${prompt.id}`} className={styles.actionButton}>Edit</Link>
                          <Link href={`/prompts/${selectedFolder.id}/${prompt.id}`} className={styles.actionButton}>Version it</Link>
                          <button type="button" className={styles.deleteButton} onClick={(event) => { event.stopPropagation(); void deletePrompt(prompt); }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {isCreateFolderOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={requestCloseCreateFolder}>
          <form
            className={styles.createFolderDialog}
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void saveFolder();
            }}
          >
            <div className={styles.dialogHeader}>
              <div><p>{editingFolder ? 'Edit folder' : 'Create folder'}</p><span>Organise related prompts together.</span></div>
              <button type="button" onClick={requestCloseCreateFolder} aria-label="Close create folder dialog">×</button>
            </div>
            <label className={styles.formField}>
              <span>Folder name <b className={styles.required}>*</b></span>
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="For example, Support" autoFocus minLength={minimumFolderNameLength} maxLength={18} required />
              <span className={styles.formFieldMeta}>{folderNameLength} / 18 <em>min. {minimumFolderNameLength}</em></span>
            </label>
            <label className={styles.formField}>
              <span>Description <b className={styles.required}>*</b></span>
              <textarea value={folderDescription} onChange={(event) => setFolderDescription(event.target.value)} placeholder="What prompts will live here?" rows={3} minLength={minimumFolderDescriptionLength} maxLength={350} required />
              <span className={styles.formFieldMeta}>{folderDescriptionLength} / 350 <em>min. {minimumFolderDescriptionLength}</em></span>
            </label>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancelButton} onClick={requestCloseCreateFolder}>Cancel</button>
              <button type="submit" className={styles.confirmButton} disabled={!canCreateFolder || isSavingFolder}>{isSavingFolder ? 'Saving...' : editingFolder ? 'Save folder' : 'Create folder'}</button>
            </div>
            {folderError ? <p className={styles.formError} role="alert">{folderError}</p> : null}
            {isDiscardConfirmOpen ? (
              <DiscardNotice
                onKeepEditing={() => setIsDiscardConfirmOpen(false)}
                onDiscard={discardFolderDraft}
              />
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
