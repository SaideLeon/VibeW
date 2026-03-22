'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0c10', color: '#e2e8f0', padding: '24px' }}>
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: '420px', background: '#0f1219', border: '1px solid #1e2535', borderRadius: '16px', padding: '28px' }}>
        <h1 style={{ marginTop: 0, marginBottom: '8px', fontSize: '28px' }}>Entrar</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Acede ao teu Copiloto Académico.</p>

        <label style={{ display: 'block', marginBottom: '14px' }}>
          <span style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #1e2535', background: '#161b27', color: '#e2e8f0' }} />
        </label>

        <label style={{ display: 'block', marginBottom: '14px' }}>
          <span style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Palavra-passe</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #1e2535', background: '#161b27', color: '#e2e8f0' }} />
        </label>

        {error && <p style={{ color: '#f87171', fontSize: '14px' }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#1e2535' : '#4f8ef7', color: '#fff', fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'A entrar…' : 'Entrar'}
        </button>

        <p style={{ marginBottom: 0, marginTop: '18px', color: '#94a3b8', fontSize: '14px' }}>
          Ainda não tens conta? <Link href="/register" style={{ color: '#4f8ef7' }}>Criar conta</Link>
        </p>
      </form>
    </main>
  );
}
