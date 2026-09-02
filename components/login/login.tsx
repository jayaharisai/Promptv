'use client';

import { FormEvent, useState } from 'react';

import styles from './login.module.css';

export function Login() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }).catch(() => null);

    if (!response?.ok) {
      setError('The authentication key is not valid. Try again.');
      setIsSubmitting(false);
      return;
    }

    const requestedPath = new URLSearchParams(window.location.search).get('redirect');
    const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/prompts';
    window.location.assign(destination);
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <p className={styles.eyebrow}>Promptv</p>
        <h1 id="login-title">Enter your workspace</h1>
        <span>Use the authentication key configured for this environment.</span>
        <form onSubmit={handleSubmit}>
          <label htmlFor="auth-key">Authentication key</label>
          <input id="auth-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Enter your key" autoComplete="current-password" autoFocus />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="submit" disabled={!key.trim() || isSubmitting}>{isSubmitting ? 'Checking key...' : 'Continue'}</button>
        </form>
      </section>
    </main>
  );
}
