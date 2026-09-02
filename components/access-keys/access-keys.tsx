'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './access-keys.module.css';

type AccessKey = {
  id: string;
  name: string;
  description: string;
  token: string;
  createdAt: string;
  lastUsed: string;
  requests: string;
};

const initialKeys: AccessKey[] = [];

const activityByRange = {
  '7d': { label: 'Last 7 days', values: [], days: [] },
  '30d': { label: 'Last 30 days', values: [], days: [] },
  '90d': { label: 'Last 90 days', values: [], days: [] },
};

function generateToken() {
  const values = crypto.getRandomValues(new Uint8Array(28));
  return `pk_live_${Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function maskToken(token: string) {
  return `${token.slice(0, 11)}********${token.slice(-4)}`;
}

type AccessKeysProps = {
  initialKeyId?: string;
};

export function AccessKeys({ initialKeyId }: AccessKeysProps) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [selectedKey, setSelectedKey] = useState<AccessKey | null>(() => initialKeys.find((key) => key.id === initialKeyId) ?? null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newToken, setNewToken] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [activityRange, setActivityRange] = useState<keyof typeof activityByRange>('7d');

  async function copyAndSaveKey() {
    if (name.trim().length < 3 || description.trim().length < 10 || isSavingKey) return;

    setIsSavingKey(true);
    try {
      await copyToken(newToken);
      const key: AccessKey = { id: `key_${Date.now()}`, name: name.trim(), description: description.trim(), token: newToken, createdAt: 'Just now', lastUsed: 'Never', requests: '0' };
      setKeys((current) => [key, ...current]);
      window.setTimeout(closeCreate, 500);
    } catch {
      setIsSavingKey(false);
    }
  }

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(token);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  }

  function closeCreate() {
    setIsCreateOpen(false);
    setName('');
    setDescription('');
    setNewToken('');
    setIsSavingKey(false);
  }

  function openCreate() {
    setNewToken(generateToken());
    setIsCopied(false);
    setIsSavingKey(false);
    setIsCreateOpen(true);
  }

  function saveKeyDetails() {
    if (!selectedKey || editName.trim().length < 3) return;
    const updatedKey = { ...selectedKey, name: editName.trim(), description: editDescription.trim() };
    setKeys((current) => current.map((key) => key.id === updatedKey.id ? updatedKey : key));
    setSelectedKey(updatedKey);
    setIsEditingDetails(false);
  }

  if (selectedKey) {
    const activity = activityByRange[activityRange];

    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <div><p>Access key</p>{isEditingDetails ? <><span className={styles.editingHint}>Editing details</span><input className={`${styles.titleInput} ${styles.editingField}`} value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Access key name" /><input className={`${styles.descriptionInput} ${styles.editingField}`} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} aria-label="Access key description" /></> : <><h1>{selectedKey.name}</h1><span>{selectedKey.description}</span></>}</div>
          <div className={styles.detailActions}>{isEditingDetails ? <><button type="button" className={styles.secondaryButton} onClick={() => { setEditName(selectedKey.name); setEditDescription(selectedKey.description); setIsEditingDetails(false); }}>Cancel</button><button type="button" className={styles.saveDetails} onClick={saveKeyDetails} disabled={editName.trim().length < 3}>Save details</button></> : <button type="button" className={styles.secondaryButton} onClick={() => setIsEditingDetails(true)}>Edit details</button>}<button type="button" className={styles.secondaryButton} onClick={() => router.push('/access-keys')}>All keys</button></div>
        </header>
        <div className={styles.keyDetails}>
          <div className={styles.metricGrid}>
            <div><span>Requests</span><strong>{selectedKey.requests}</strong><small>total requests</small></div>
            <div><span>Last used</span><strong>{selectedKey.lastUsed}</strong><small>production trigger</small></div>
            <div><span>Created</span><strong>{selectedKey.createdAt}</strong><small>active key</small></div>
          </div>
          <div className={styles.chartPanel}>
            <div className={styles.chartHeader}><div><strong>Request activity</strong><span>{activity.label}</span></div><label>Period<select value={activityRange} onChange={(event) => setActivityRange(event.target.value as keyof typeof activityByRange)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option></select></label></div>
            <div className={styles.chart}>{activity.values.map((value, index) => <span key={`${activityRange}-${index}`} style={{ height: `${value}%` }}><small>{activity.days[index]}</small></span>)}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div><p>Workspace security</p><h1>Access keys</h1><span>Create scoped keys for your services and production workflows.</span></div>
        <button type="button" className={styles.createButton} onClick={openCreate}><b>+</b> Create key</button>
      </header>
      <div className={styles.keyList}>
        <div className={styles.listHeader}><span>Name</span><span>Key</span><span>Last used</span><span>Requests</span><span>Created</span></div>
        {keys.length === 0 ? <p className={styles.emptyState}>No access keys yet. Create one when a service needs access.</p> : keys.map((key) => <button type="button" className={styles.keyRow} key={key.id} onClick={() => router.push(`/access-keys/${key.id}`)}><span><strong>{key.name}</strong><small>{key.description}</small></span><code className={styles.maskedKey}>{maskToken(key.token)}</code><span>{key.lastUsed}</span><span>{key.requests}</span><span>{key.createdAt}</span></button>)}
      </div>
      {isCreateOpen ? <div className={styles.backdrop} onMouseDown={closeCreate}><form className={styles.dialog} onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); copyAndSaveKey(); }}>
        <div className={styles.dialogHeader}><div><strong>Create access key</strong><span>The key is only saved once you copy it.</span></div><button type="button" onClick={closeCreate}>×</button></div><label>Name <b>*</b><input value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, Production API" maxLength={32} autoFocus /></label><label>Description <b>*</b><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will this key be used for?" maxLength={160} rows={3} /></label><div className={styles.keyPreview}><span>Generated access key · 64 characters</span><code>{newToken}</code></div><div className={styles.dialogActions}><button type="button" onClick={closeCreate}>Cancel</button><button type="submit" disabled={name.trim().length < 3 || description.trim().length < 10 || isSavingKey}>{isCopied ? 'Copied and saved' : 'Copy key and save'}</button></div>
      </form></div> : null}
    </section>
  );
}
