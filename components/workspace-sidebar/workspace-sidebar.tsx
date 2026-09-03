'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '../logo';
import { DiscardNotice } from '../discard-notice';
import { Skeleton } from '../skeleton';
import styles from './workspace-sidebar.module.css';

type Workspace = {
  id: string;
  name: string;
  description: string;
};

type ApiError = { detail?: string };

const defaultWorkspace: Workspace = {
  id: 'default',
  name: 'Default',
  description: 'The default workspace created for this fresh Promptv environment.',
};

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const createPopoverRef = useRef<HTMLDivElement | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([defaultWorkspace]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(defaultWorkspace);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const titleLength = workspaceName.length;
  const descriptionLength = workspaceDescription.length;
  const isTitleValid = titleLength >= 5 && titleLength <= 18;
  const isDescriptionValid = descriptionLength >= 50 && descriptionLength <= 300;
  const isCreateDisabled = !isTitleValid || !isDescriptionValid;
  const isWorkspaceFormDirty = workspaceName.trim().length > 0 || workspaceDescription.trim().length > 0;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const sidebar = sidebarRef.current;
      const createPopover = createPopoverRef.current;
      const target = event.target as Node;

      if (isCreateOpen && createPopover && !createPopover.contains(target)) {
        setIsWorkspaceMenuOpen(false);
        if (isWorkspaceFormDirty) {
          setIsDiscardConfirmOpen(true);
        } else {
          setIsCreateOpen(false);
        }
      } else if (sidebar && !sidebar.contains(target)) {
        setIsWorkspaceMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsWorkspaceMenuOpen(false);
        if (isCreateOpen && isWorkspaceFormDirty) {
          setIsDiscardConfirmOpen(true);
        } else {
          setIsCreateOpen(false);
        }
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateOpen, isWorkspaceFormDirty]);

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = String(isCollapsed);
  }, [isCollapsed]);

  async function loadWorkspaces() {
    setIsLoadingWorkspaces(true);
    const response = await fetch('/api/workspaces', { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) {
      setWorkspaceError('Unable to load workspaces. Start the API service and try again.');
      setIsLoadingWorkspaces(false);
      return;
    }

    const [loadedWorkspaces, activeResponse] = await Promise.all([
      response.json() as Promise<Workspace[]>,
      fetch('/api/workspaces/active', { cache: 'no-store' }).catch(() => null),
    ]);
    const activePayload = activeResponse?.ok ? await activeResponse.json() as { workspaceId: string | null } : null;
    const availableWorkspaces = loadedWorkspaces.length > 0 ? loadedWorkspaces : [defaultWorkspace];
    setWorkspaces(availableWorkspaces);
    setActiveWorkspace((current) => availableWorkspaces.find((workspace) => workspace.id === activePayload?.workspaceId || workspace.id === current.id) ?? availableWorkspaces[0]);
    setIsLoadingWorkspaces(false);
  }

  async function selectWorkspace(workspace: Workspace) {
    setActiveWorkspace(workspace);
    setIsWorkspaceMenuOpen(false);
    const response = await fetch('/api/workspaces/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id }),
    }).catch(() => null);

    if (!response?.ok) {
      setWorkspaceError('Unable to switch workspaces. Try again.');
      return;
    }

    window.dispatchEvent(new CustomEvent('promptv:workspace-change'));
  }

  function resetWorkspaceForm() {
    setWorkspaceName('');
    setWorkspaceDescription('');
    setEditingWorkspace(null);
    setWorkspaceError('');
  }

  function openCreateWorkspace() {
    resetWorkspaceForm();
    setIsCreateOpen(true);
  }

  function openEditWorkspace(workspace: Workspace) {
    setEditingWorkspace(workspace);
    setWorkspaceName(workspace.name);
    setWorkspaceDescription(workspace.description);
    setWorkspaceError('');
    setIsCreateOpen(true);
  }

  async function handleSaveWorkspace() {
    if (isCreateDisabled) {
      return;
    }

    setIsSavingWorkspace(true);
    setWorkspaceError('');
    const response = await fetch(editingWorkspace ? `/api/workspaces/${editingWorkspace.id}` : '/api/workspaces', {
      method: editingWorkspace ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workspaceName.trim(), description: workspaceDescription.trim() }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as Workspace | ApiError : null;

    if (!response?.ok) {
      setWorkspaceError((payload as ApiError | null)?.detail ?? 'Unable to save this workspace. Try again.');
      setIsSavingWorkspace(false);
      return;
    }

    const savedWorkspace = payload as Workspace;
    setWorkspaces((current) => editingWorkspace
      ? current.map((workspace) => workspace.id === savedWorkspace.id ? savedWorkspace : workspace)
      : [savedWorkspace, ...current]);
    void selectWorkspace(savedWorkspace);
    resetWorkspaceForm();
    setIsCreateOpen(false);
    setIsWorkspaceMenuOpen(false);
    setIsSavingWorkspace(false);
  }

  async function handleDeleteWorkspace(workspace: Workspace) {
    if (!window.confirm(`Delete ${workspace.name}? This cannot be undone.`)) {
      return;
    }

    setWorkspaceError('');
    const response = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as ApiError : null;
      setWorkspaceError(payload?.detail ?? 'Unable to delete this workspace. Try again.');
      return;
    }

    const remainingWorkspaces = workspaces.filter((item) => item.id !== workspace.id);
    setWorkspaces(remainingWorkspaces);
    if (activeWorkspace.id === workspace.id) {
      void selectWorkspace(remainingWorkspaces[0] ?? defaultWorkspace);
    }
  }

  function requestCloseCreateWorkspace() {
    if (isWorkspaceFormDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    setIsCreateOpen(false);
    resetWorkspaceForm();
  }

  function discardWorkspaceDraft() {
    resetWorkspaceForm();
    setIsDiscardConfirmOpen(false);
    setIsCreateOpen(false);
    setIsWorkspaceMenuOpen(false);
  }

  return (
    <div className={styles.shell} data-collapsed={isCollapsed ? 'true' : 'false'}>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={() => {
          setIsCollapsed((value) => {
            const nextValue = !value;

            if (nextValue) {
              setIsWorkspaceMenuOpen(false);
              setIsCreateOpen(false);
            }

            return nextValue;
          });
        }}
        aria-label={isCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
        aria-pressed={isCollapsed}
      >
        <svg
          className={styles.toggleIcon}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 2.75v10.5" />
          <path d={isCollapsed ? 'M6 5.25 8.75 8 6 10.75' : 'M10 5.25 7.25 8 10 10.75'} />
        </svg>
      </button>

      <aside ref={sidebarRef} className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.brandRow}>
            <Logo />
          </div>

          <div className={styles.workspaceSection}>
            <span className={styles.workspaceLabel}>Workspace</span>
            <button
              type="button"
              className={styles.workspaceButton}
              onClick={() => setIsWorkspaceMenuOpen((value) => !value)}
              disabled={isLoadingWorkspaces}
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="menu"
            >
              {isLoadingWorkspaces ? <Skeleton className={styles.workspaceSkeleton} /> : <span className={styles.workspaceName}>{activeWorkspace.name}</span>}
              <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
              </svg>
            </button>

            {isWorkspaceMenuOpen ? (
              <div className={styles.dropdown} role="menu" aria-label="Workspaces">
                <div className={styles.dropdownToolbar}>
                  <span className={styles.dropdownHeaderLabel}>Workspace</span>
                  <div className={styles.dropdownActions}>
                    <button
                      type="button"
                      className={styles.dropdownCreate}
                      onClick={openCreateWorkspace}
                      aria-label="Add workspace"
                    >
                      <span className={styles.dropdownCreateText}>Add workspace</span>
                      <span className={styles.dropdownCreateArrow} aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                </div>

                {isLoadingWorkspaces ? <div className={styles.workspaceListSkeleton} aria-hidden="true"><Skeleton /><Skeleton /><Skeleton /></div> : workspaces.length === 0 ? <p className={styles.emptyWorkspaces}>No workspaces yet.</p> : workspaces.map((workspace) => (
                  <div className={styles.dropdownWorkspace} key={workspace.id}>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${workspace.id === activeWorkspace.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => {
                        void selectWorkspace(workspace);
                      }}
                    >
                      <span className={styles.dropdownItemName}>{workspace.name}</span>
                    </button>
                    <div className={styles.workspaceItemActions}>
                      {workspace.name !== 'Default' ? <><button type="button" onClick={() => openEditWorkspace(workspace)} aria-label={`Edit ${workspace.name}`}>Edit</button><button type="button" onClick={() => void handleDeleteWorkspace(workspace)} aria-label={`Delete ${workspace.name}`}>Delete</button></> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {isCreateOpen ? (
              <div
                ref={createPopoverRef}
                className={styles.popover}
                role="dialog"
                aria-modal="true"
                aria-label="Create workspace"
              >
                <div className={styles.popoverHeader}>
                  <span className={styles.popoverTitle}>{editingWorkspace ? 'Edit workspace' : 'Create workspace'}</span>
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={requestCloseCreateWorkspace}
                    aria-label="Close create workspace popup"
                  >
                    ×
                  </button>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Title</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder="Workspace title"
                    maxLength={18}
                    minLength={5}
                    aria-describedby="workspace-title-help"
                  />
                  <div id="workspace-title-help" className={styles.fieldMetaRow}>
                    <span className={styles.fieldHint}>5 to 18 characters</span>
                    <span className={styles.fieldCount}>{titleLength} / 18</span>
                  </div>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Description</span>
                  <textarea
                    className={styles.textarea}
                    value={workspaceDescription}
                    onChange={(event) => setWorkspaceDescription(event.target.value)}
                    placeholder="Workspace description"
                    rows={3}
                    maxLength={300}
                    minLength={50}
                    aria-describedby="workspace-description-help"
                  />
                  <div id="workspace-description-help" className={styles.fieldMetaRow}>
                    <span className={styles.fieldHint}>50 to 300 characters</span>
                    <span className={styles.fieldCount}>{descriptionLength} / 300</span>
                  </div>
                </label>

                <div className={styles.nextActionRow}>
                  <p className={styles.nextHelperText}>
                    Create workspace form here and manage it from this panel.
                  </p>
                  <button
                    type="button"
                    className={styles.nextButton}
                    onClick={() => void handleSaveWorkspace()}
                    disabled={isCreateDisabled || isSavingWorkspace}
                  >
                    <span>{isSavingWorkspace ? 'Saving' : editingWorkspace ? 'Save' : 'Create'}</span>
                    <span className={styles.nextButtonArrow} aria-hidden="true">
                      →
                    </span>
                  </button>
                </div>
                {workspaceError ? <p className={styles.workspaceError} role="alert">{workspaceError}</p> : null}
                {isDiscardConfirmOpen ? (
                  <DiscardNotice
                    onKeepEditing={() => setIsDiscardConfirmOpen(false)}
                    onDiscard={discardWorkspaceDraft}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={styles.menuSection}>
            <span className={styles.menuLabel}>MENU</span>
            <nav className={styles.nav}>
              <Link
                href="/prompts"
                className={`${styles.navItem} ${pathname === '/prompts' ? styles.navItemActive : ''}`}
                aria-current={pathname === '/prompts' ? 'page' : undefined}
              >
                <svg className={styles.navIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m3.25 5.25 2.5 2.5-2.5 2.5" />
                  <path d="M7.75 10.25h4.5" />
                </svg>
                <span>Prompts</span>
              </Link>
              <Link
                href="/audit-logs"
                className={`${styles.navItem} ${pathname === '/audit-logs' ? styles.navItemActive : ''}`}
                aria-current={pathname === '/audit-logs' ? 'page' : undefined}
              >
                <svg className={styles.navIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5 2.75h5.25l2 2v8.5H5z" />
                  <path d="M10.25 2.75v2h2" />
                  <path d="M7 8h3.25M7 10.5h3.25" />
                </svg>
                <span>Audit Logs</span>
              </Link>
              <Link
                href="/access-keys"
                className={`${styles.navItem} ${pathname === '/access-keys' ? styles.navItemActive : ''}`}
                aria-current={pathname === '/access-keys' ? 'page' : undefined}
              >
                <svg className={styles.navIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="5.5" cy="8.5" r="2.25" />
                  <path d="m7.25 10.25 5.5-5.5M10.5 7.5l1.75 1.75M11.75 5.25l1.5 1.5" />
                </svg>
                <span>Access Keys</span>
              </Link>
            </nav>
            <nav className={styles.bottomNav} aria-label="Sidebar utilities">
              <Link
                href="/docs"
                className={`${styles.navItem} ${pathname === '/docs' ? styles.navItemActive : ''}`}
                aria-current={pathname === '/docs' ? 'page' : undefined}
              >
                <svg className={styles.navIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2.75 3.5A2.25 2.25 0 0 1 5 1.75h2.5v11.5H5A2.25 2.25 0 0 0 2.75 15z" />
                  <path d="M13.25 3.5A2.25 2.25 0 0 0 11 1.75H8.5v11.5H11A2.25 2.25 0 0 1 13.25 15z" />
                </svg>
                <span>Docs</span>
              </Link>
              <Link
                href="/settings"
                className={`${styles.navItem} ${pathname === '/settings' ? styles.navItemActive : ''}`}
                aria-current={pathname === '/settings' ? 'page' : undefined}
              >
                <svg className={styles.navIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="2.1" />
                  <path d="m8 2.25.55 1.1 1.2.35 1.05-.6.9.9-.6 1.05.35 1.2 1.1.55v1.3l-1.1.55-.35 1.2.6 1.05-.9.9-1.05-.6-1.2.35L8 13.75h-1.3l-.55-1.1-1.2-.35-1.05.6-.9-.9.6-1.05-.35-1.2-1.1-.55v-1.3l1.1-.55.35-1.2-.6-1.05.9-.9 1.05.6 1.2-.35.55-1.1z" />
                </svg>
                <span>Settings</span>
              </Link>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}
