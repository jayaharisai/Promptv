'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Skeleton } from '../skeleton';
import styles from './prompt-editor.module.css';

type PromptVersion = {
  id: string;
  number: number;
  note: string;
  created_at: string;
  content: string;
};

const initialVersions: PromptVersion[] = [];

const rephrasedPrompt = `You are Promptv's customer support specialist.\n\nCreate a helpful, thoughtful response that resolves the customer's issue using the available context. Be direct, warm, and specific. When the provided information is incomplete, clearly explain the next detail needed to help.\n\nCustomer name: {{customer_name}}\nIssue: {{issue}}\nPlan: {{plan}}\n\nKeep the response below 180 words. Do not reference internal tools, systems, or policies.`;

type PromptEditorProps = {
  folder: string;
  prompt: string;
  isCreating?: boolean;
};

type PromptStatus = 'draft' | 'published' | 'archived';

type PromptRecord = {
  id: string;
  name: string;
  description: string;
  status: PromptStatus;
  active_version_id: string | null;
};

export function PromptEditor({ folder, prompt, isCreating = false }: PromptEditorProps) {
  const router = useRouter();
  const [versionList, setVersionList] = useState(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [activeVersionId, setActiveVersionId] = useState('');
  const selectedVersion = versionList.find((version) => version.id === selectedVersionId) ?? versionList[0];
  const [content, setContent] = useState(isCreating ? '' : selectedVersion?.content ?? '');
  const [promptName, setPromptName] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [rephrasePhase, setRephrasePhase] = useState<'idle' | 'processing' | 'typing'>('idle');
  const [promptStatus, setPromptStatus] = useState<PromptStatus>('draft');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [promptId, setPromptId] = useState(isCreating ? '' : prompt);
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(!isCreating);
  const variables = Array.from(new Set(content.match(/{{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*}}/g) ?? []));
  const isRephrasing = rephrasePhase !== 'idle';
  const isVersionDirty = content !== (selectedVersion?.content ?? '');
  const isNewPrompt = isCreating;

  useEffect(() => {
    if (isCreating) {
      setIsLoadingPrompt(false);
      return;
    }

    async function loadPrompt() {
      const [promptResponse, versionsResponse] = await Promise.all([
        fetch(`/api/prompts/${prompt}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/prompts/${prompt}/versions`, { cache: 'no-store' }).catch(() => null),
      ]);
      if (!promptResponse?.ok || !versionsResponse?.ok) {
        setEditorError('Unable to load this prompt.');
        setIsLoadingPrompt(false);
        return;
      }
      const loadedPrompt = await promptResponse.json() as PromptRecord;
      const loadedVersions = await versionsResponse.json() as PromptVersion[];
      const selected = loadedVersions.find((version) => version.id === loadedPrompt.active_version_id) ?? loadedVersions[0];
      setPromptId(loadedPrompt.id);
      setPromptName(loadedPrompt.name);
      setPromptDescription(loadedPrompt.description);
      setPromptStatus(loadedPrompt.status);
      setVersionList(loadedVersions);
      setSelectedVersionId(selected?.id ?? '');
      setActiveVersionId(loadedPrompt.active_version_id ?? '');
      setContent(selected?.content ?? '');
      setIsLoadingPrompt(false);
    }

    void loadPrompt();
  }, [isCreating, prompt]);

  useEffect(() => {
    if (!saveMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSaveMessage(''), 2600);

    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  useEffect(() => {
    if (rephrasePhase !== 'processing') {
      return;
    }

    const timeout = window.setTimeout(() => setRephrasePhase('typing'), 850);

    return () => window.clearTimeout(timeout);
  }, [rephrasePhase]);

  useEffect(() => {
    if (rephrasePhase !== 'typing') {
      return;
    }

    let characterIndex = 0;
    setContent('');

    const interval = window.setInterval(() => {
      characterIndex = Math.min(characterIndex + 3, rephrasedPrompt.length);
      setContent(rephrasedPrompt.slice(0, characterIndex));

      if (characterIndex === rephrasedPrompt.length) {
        window.clearInterval(interval);
        setRephrasePhase('idle');
      }
    }, 16);

    return () => window.clearInterval(interval);
  }, [rephrasePhase]);

  function selectVersion(version: PromptVersion) {
    setRephrasePhase('idle');
    setSelectedVersionId(version.id);
    setContent(version.content);
  }

  async function createVersion() {
    if (!isVersionDirty || !promptId || isSaving) return;
    setIsSaving(true);
    const response = await fetch(`/api/prompts/${promptId}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }).catch(() => null);
    if (!response?.ok) {
      setEditorError('Unable to create a version. Try again.');
      setIsSaving(false);
      return;
    }
    const version = await response.json() as PromptVersion;
    setVersionList((current) => [version, ...current]);
    setSelectedVersionId(version.id);
    setContent(version.content);
    setSaveMessage(`Created version v${version.number}.`);
    setIsSaving(false);
  }

  async function savePrompt() {
    if (promptName.trim().length < 3 || content.trim().length === 0 || isSaving) return;
    setIsSaving(true);
    setEditorError('');
    const response = await fetch(isCreating ? `/api/folders/${folder}/prompts` : `/api/prompts/${promptId}`, {
      method: isCreating ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isCreating ? { name: promptName.trim(), description: promptDescription.trim(), content, status: promptStatus } : { name: promptName.trim(), description: promptDescription.trim(), status: promptStatus }),
    }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as { detail?: string } : null;
      setEditorError(payload?.detail ?? 'Unable to save this prompt. Try again.');
      setIsSaving(false);
      return;
    }
    const savedPrompt = await response.json() as PromptRecord;
    if (isCreating) {
      router.replace(`/prompts/${folder}/${savedPrompt.id}`);
      return;
    }
    setPromptName(savedPrompt.name);
    setPromptDescription(savedPrompt.description);
    setPromptStatus(savedPrompt.status);
    setSaveMessage('Prompt details saved.');
    setIsSaving(false);
  }

  async function updateStatus(status: PromptStatus) {
    setPromptStatus(status);
    setIsStatusMenuOpen(false);
    if (!promptId) return;
    const response = await fetch(`/api/prompts/${promptId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).catch(() => null);
    if (!response?.ok) setEditorError('Unable to update status. Try again.');
  }

  async function activateVersion() {
    if (!promptId || !selectedVersion || selectedVersionId === activeVersionId) return;
    const response = await fetch(`/api/prompts/${promptId}/active-version`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version_id: selectedVersionId }) }).catch(() => null);
    if (!response?.ok) {
      setEditorError('Unable to make this version active. Try again.');
      return;
    }
    setActiveVersionId(selectedVersionId);
  }

  async function deletePrompt() {
    if (!promptId || !window.confirm('Delete this prompt? This cannot be undone.')) return;
    const response = await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      setEditorError('Unable to delete this prompt. Try again.');
      return;
    }
    router.push(`/prompts/${folder}`);
  }

  if (isLoadingPrompt) {
    return (
      <section className={styles.page} aria-label="Loading prompt editor">
        <header className={styles.header}>
          <div className={styles.editorSkeletonHeader}><Skeleton className={styles.breadcrumbSkeleton} /><Skeleton className={styles.inputSkeleton} /></div>
          <Skeleton className={styles.editorActionSkeleton} />
        </header>
        <div className={styles.editorLayout} aria-hidden="true">
          <aside className={styles.versionPanel}><div className={styles.versionHeading}><Skeleton className={styles.headingSkeleton} /><Skeleton className={styles.countSkeleton} /></div><div className={styles.skeletonVersions}>{Array.from({ length: 4 }, (_, index) => <Skeleton className={styles.versionSkeleton} key={index} />)}</div></aside>
          <div className={styles.editor}><div className={styles.editorTopbar}><Skeleton className={styles.headingSkeleton} /><Skeleton className={styles.toolbarSkeleton} /></div><div className={styles.editorBodySkeleton}>{Array.from({ length: 9 }, (_, index) => <Skeleton className={styles.codeSkeleton} key={index} />)}</div><div className={styles.editorFooter}><Skeleton className={styles.footerSkeleton} /><Skeleton className={styles.toolbarSkeleton} /></div></div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.breadcrumb}>{folder} <span>/</span> {isNewPrompt ? 'Create prompt' : promptName || prompt}</p>
          {isCreating ? (
            <div className={styles.createMeta}>
              <input value={promptName} onChange={(event) => setPromptName(event.target.value)} placeholder="Prompt name" maxLength={30} autoFocus />
              <input value={promptDescription} onChange={(event) => setPromptDescription(event.target.value)} placeholder="Short description (optional)" maxLength={140} />
            </div>
          ) : <div className={styles.createMeta}><input value={promptName} onChange={(event) => setPromptName(event.target.value)} placeholder="Prompt name" maxLength={30} /><input value={promptDescription} onChange={(event) => setPromptDescription(event.target.value)} placeholder="Short description (optional)" maxLength={140} /></div>}
        </div>
        <div className={styles.headerActions}>
          {isNewPrompt ? (
            <button type="button" className={styles.versionItButton} onClick={() => void savePrompt()} disabled={isSaving}>Create prompt</button>
          ) : <><button type="button" className={styles.createVersion} onClick={() => void savePrompt()} disabled={isSaving}>Save prompt</button><button type="button" className={styles.versionItButton} onClick={() => void createVersion()} disabled={!isVersionDirty || isSaving}>Create version</button></>}
          <div className={styles.statusControl}>
            <button
              type="button"
              className={styles.statusButton}
              onClick={() => setIsStatusMenuOpen((value) => !value)}
              aria-expanded={isStatusMenuOpen}
              aria-haspopup="menu"
            >
              <span className={promptStatus === 'published' ? styles.statusPublished : promptStatus === 'draft' ? styles.statusDraft : styles.statusArchived} />
              {promptStatus[0].toUpperCase() + promptStatus.slice(1)}
              <svg className={styles.statusChevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
              </svg>
            </button>
            {isStatusMenuOpen ? (
              <div className={styles.statusMenu} role="menu">
                <button type="button" role="menuitem" onClick={() => void updateStatus('draft')}>
                  <span className={styles.statusDraft} /> Save as draft
                </button>
                <button type="button" role="menuitem" onClick={() => void updateStatus('published')}>
                  <span className={styles.statusPublished} /> Publish prompt
                </button>
                <button type="button" role="menuitem" className={styles.archiveAction} onClick={() => void updateStatus('archived')}>
                  <span className={styles.statusArchived} /> Archive prompt
                </button>
                {!isCreating ? <button type="button" role="menuitem" className={styles.archiveAction} onClick={() => void deletePrompt()}>Delete prompt</button> : null}
              </div>
            ) : null}
          </div>
          <Link href={`/prompts/${folder}`} className={styles.closeEditor} aria-label="Back to prompts">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m5 5 6 6M11 5l-6 6" /></svg>
          </Link>
        </div>
      </header>
      {saveMessage ? <p className={styles.saveNotice}>{saveMessage}</p> : null}
      {editorError ? <p className={styles.saveNotice}>{editorError}</p> : null}

      <div className={isNewPrompt ? `${styles.editorLayout} ${styles.createLayout}` : styles.editorLayout}>
        {!isNewPrompt ? <aside className={styles.versionPanel}>
          <div className={styles.versionHeading}>
            <span>Versions</span>
            <span>{versionList.length}</span>
          </div>
          <div className={styles.versionList}>
            {versionList.map((version) => (
              <button
                key={version.id}
                type="button"
                className={version.id === selectedVersionId ? styles.versionActive : styles.versionButton}
                onClick={() => selectVersion(version)}
              >
                <span><strong>v{version.number}</strong>{version.id === activeVersionId ? <em>Active</em> : null}</span>
                <small>{version.note}<br />{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(version.created_at))}</small>
              </button>
            ))}
          </div>
          <div className={styles.activation}>
            <p>Production version</p>
            <span>{versionList.find((version) => version.id === activeVersionId) ? `v${versionList.find((version) => version.id === activeVersionId)?.number}` : '--'}</span>
            <button type="button" onClick={() => void activateVersion()} disabled={!selectedVersion || selectedVersionId === activeVersionId}>
              Make {selectedVersion ? `v${selectedVersion.number}` : 'version'} active
            </button>
          </div>
        </aside> : null}

        <div className={styles.editor} aria-busy={isRephrasing}>
          <div className={styles.editorTopbar}>
            <div><span>Prompt</span>{!isNewPrompt ? <small>{selectedVersion ? `v${selectedVersion.number}` : 'Draft'}</small> : null}</div>
            <span>System prompt</span>
          </div>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            spellCheck={false}
            aria-label="Prompt content"
          />
          {rephrasePhase === 'processing' ? (
            <div className={styles.rephraseOverlay} aria-live="polite">
              <span className={styles.rephraseStatus}>Rephrasing your prompt</span>
            </div>
          ) : null}
          <div className={styles.editorFooter}>
            <div className={styles.variableArea}>
              <span className={styles.variableLabel}>Variables <strong>{variables.length}</strong></span>
              {variables.length > 0 ? (
                <div className={styles.variableList}>
                  {variables.map((variable) => (
                    <span className={styles.variableChip} key={variable}>
                      <code>{variable}</code>
                      <small>Text</small>
                    </span>
                  ))}
                </div>
              ) : (
                <span className={styles.emptyVariables}>Add <code>{'{{variable_name}}'}</code> to create a variable.</span>
              )}
            </div>
            <div className={styles.footerActions}>
              <span className={styles.characterCount}>{content.length} characters</span>
              <button
                type="button"
                className={styles.rephraseButton}
                onClick={() => setRephrasePhase('processing')}
                disabled={isRephrasing}
              >
                {rephrasePhase === 'typing' ? 'Writing...' : isRephrasing ? 'Rephrasing...' : 'AI rephrase'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
