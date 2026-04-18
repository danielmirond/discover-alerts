'use client';

import { useState } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(json.error ?? 'No hemos podido guardar tu email.');
        return;
      }
      setStatus('ok');
      setMessage('Listo. Te hemos apuntado.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Error de red. Intenta de nuevo.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        placeholder="tu@email.es"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        aria-label="Email"
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email}
        className="rounded-sm bg-ink px-5 py-2 text-sm font-semibold text-paper hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando...' : 'Suscribirme'}
      </button>
      {message && (
        <p
          className={`mt-2 text-sm sm:absolute sm:mt-12 ${
            status === 'ok' ? 'text-emerald-700' : 'text-accent'
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
