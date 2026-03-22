'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setMessage('Conta criada com sucesso. Se a confirmação por email estiver ativa, confirma antes de entrar.');
    setLoading(false);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0c10', color: '#e2e8f0', padding: '24px' }}>
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: '420px', background: '#0f1219', border: '1px solid #1e2535', borderRadius: '16px', padding: '28px' }}>
        <h1 style={{ marginTop: 0, marginBottom: '8px', fontSize: '28px' }}>Criar conta</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Regista-te para guardar trabalhos e fichas técnicas.</p>

        <label style={{ display: 'block', marginBottom: '14px' }}>
          <span style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #1e2535', background: '#161b27', color: '#e2e8f0' }} />
        </label>

        <label style={{ display: 'block', marginBottom: '14px' }}>
          <span style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Palavra-passe</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #1e2535', background: '#161b27', color: '#e2e8f0' }} />
        </label>

        {error && <p style={{ color: '#f87171', fontSize: '14px' }}>{error}</p>}
        {message && <p style={{ color: '#34d399', fontSize: '14px' }}>{message}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#1e2535' : '#4f8ef7', color: '#fff', fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'A criar…' : 'Criar conta'}
        </button>

        <p style={{ marginBottom: 0, marginTop: '18px', color: '#94a3b8', fontSize: '14px' }}>
          Já tens conta? <Link href="/login" style={{ color: '#4f8ef7' }}>Entrar</Link>
        </p>
      </form>
    </main>
  );
}
