'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Trabalho {
  id: string;
  titulo: string;
  tema: string;
  norma: string;
  created_at: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoTema, setNovoTema] = useState('');
  const [criando, setCriando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const carregarTrabalhos = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/trabalhos');
    const data = await res.json();
    setTrabalhos(data.trabalhos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email ?? '');
      await carregarTrabalhos();
    };
    void init();
  }, [carregarTrabalhos, router, supabase]);

  const criarTrabalho = async () => {
    if (!novoTema.trim()) return;
    setCriando(true);
    const res = await fetch('/api/trabalhos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: novoTema.trim() }),
    });
    const data = await res.json();
    if (data.trabalho) {
      router.push(`/trabalho/${data.trabalho.id}`);
    }
    setCriando(false);
  };

  const eliminarTrabalho = async (id: string) => {
    if (!confirm('Eliminar este trabalho permanentemente?')) return;
    await fetch(`/api/trabalhos?id=${id}`, { method: 'DELETE' });
    setTrabalhos(prev => prev.filter(t => t.id !== id));
  };

  const sairSessao = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c10',
      fontFamily: "'Georgia', serif", color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid #1e2535',
        background: '#0f1219',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📄</span>
          <span style={{ fontWeight: 700, fontSize: '17px', color: '#f1f5f9' }}>
            Copiloto Académico
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#4a5568' }}>{userEmail}</span>
          <button onClick={sairSessao} style={{
            padding: '6px 14px', background: 'transparent',
            border: '1px solid #1e2535', borderRadius: '6px',
            color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
            fontFamily: 'inherit',
          }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Title + new button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Os meus trabalhos
            </h2>
            <p style={{ color: '#4a5568', fontSize: '13px', marginTop: '4px' }}>
              {trabalhos.length} trabalho(s) guardado(s)
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 20px', background: '#4f8ef7', border: 'none',
              borderRadius: '8px', color: '#fff', cursor: 'pointer',
              fontSize: '14px', fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            + Novo trabalho
          </button>
        </div>

        {/* New work form */}
        {showForm && (
          <div style={{
            padding: '24px', background: '#0f1219', border: '1px solid #1e2535',
            borderRadius: '12px', marginBottom: '28px',
          }}>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px', marginTop: 0 }}>
              Descreve o tema do trabalho académico e o Agente Planificador gerará a estrutura automaticamente.
            </p>
            <textarea
              value={novoTema}
              onChange={e => setNovoTema(e.target.value)}
              placeholder="Ex: O impacto das redes sociais no desempenho académico dos estudantes universitários em Moçambique"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', background: '#161b27',
                border: '1px solid #1e2535', borderRadius: '8px',
                color: '#e2e8f0', fontSize: '14px',
                fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={criarTrabalho}
                disabled={criando || !novoTema.trim()}
                style={{
                  padding: '10px 20px', background: criando || !novoTema.trim() ? '#1e2535' : '#4f8ef7',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  cursor: criando || !novoTema.trim() ? 'default' : 'pointer',
                  fontSize: '14px', fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                {criando ? 'A criar…' : 'Criar e planificar'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNovoTema(''); }}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '1px solid #1e2535', borderRadius: '8px',
                  color: '#94a3b8', cursor: 'pointer',
                  fontSize: '14px', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: '60px 0' }}>
            A carregar…
          </div>
        ) : trabalhos.length === 0 ? (
          <div style={{
            textAlign: 'center', color: '#2d3748', padding: '80px 20px',
            border: '1px dashed #1e2535', borderRadius: '12px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <div style={{ fontSize: '15px' }}>Ainda não tens trabalhos.</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              Clica em &quot;Novo trabalho&quot; para começar.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trabalhos.map(t => (
              <div key={t.id} style={{
                padding: '20px 24px', background: '#0f1219',
                border: '1px solid #1e2535', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'border-color 0.2s',
              }}>
                <Link href={`/trabalho/${t.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '16px' }}>
                    {t.titulo}
                  </div>
                  <div style={{ color: '#4a5568', fontSize: '13px', marginTop: '4px' }}>
                    {t.tema.slice(0, 100)}{t.tema.length > 100 ? '…' : ''}
                  </div>
                  <div style={{ color: '#2d3748', fontSize: '12px', marginTop: '6px' }}>
                    {t.norma} · {new Date(t.created_at).toLocaleDateString('pt-PT')}
                  </div>
                </Link>
                <button
                  onClick={() => eliminarTrabalho(t.id)}
                  style={{
                    background: 'none', border: 'none', color: '#2d3748',
                    cursor: 'pointer', fontSize: '16px', padding: '4px 8px',
                    marginLeft: '16px',
                  }}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
