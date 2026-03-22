'use client';

import { useState, useEffect } from 'react';

interface Ficha {
  id: string;
  titulo: string;
  autor: string;
  ano: number | null;
  conteudo: string;
  fonte_apa: string;
}

interface Props {
  trabalhoId: string;
  onClose: () => void;
}

const inp: React.CSSProperties = {
  padding: '10px 13px', background: '#161b27', border: '1px solid #1e2535',
  borderRadius: '8px', color: '#e2e8f0', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
};

export default function FichaUploader({ trabalhoId, onClose }: Props) {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: '', autor: '', ano: '', conteudo: '', fonte_apa: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const res = await fetch(`/api/fichas?trabalho_id=${trabalhoId}`);
    const data = await res.json();
    setFichas(data.fichas ?? []);
    setLoading(false);
  };

  const guardar = async () => {
    setError('');
    if (!form.titulo || !form.autor || !form.conteudo || !form.fonte_apa) {
      setError('Preenche todos os campos obrigatórios.'); return;
    }
    setSaving(true);
    const res = await fetch('/api/fichas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trabalho_id: trabalhoId,
        titulo: form.titulo, autor: form.autor,
        ano: form.ano ? parseInt(form.ano) : null,
        conteudo: form.conteudo, fonte_apa: form.fonte_apa,
      }),
    });
    const data = await res.json();
    if (data.ficha) {
      setFichas(prev => [data.ficha, ...prev]);
      setForm({ titulo: '', autor: '', ano: '', conteudo: '', fonte_apa: '' });
      setShowForm(false);
    } else {
      setError(data.error ?? 'Erro ao guardar');
    }
    setSaving(false);
  };

  const eliminar = async (id: string) => {
    await fetch(`/api/fichas?id=${id}`, { method: 'DELETE' });
    setFichas(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, fontFamily: "'Georgia', serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '620px', maxHeight: '85vh',
        background: '#0f1219', border: '1px solid #1e2535', borderRadius: '14px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e2535', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f1f5f9' }}>📚 Fichas Técnicas</h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#4a5568' }}>
              Pesquisas qualitativas que os agentes usarão como fontes APA
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Add button */}
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{
              width: '100%', padding: '10px', background: 'transparent',
              border: '1px dashed #1e2535', borderRadius: '8px',
              color: '#4a5568', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'inherit', marginBottom: '16px',
            }}>
              + Adicionar ficha técnica
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div style={{ background: '#161b27', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #1e2535' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#4a5568', display: 'block', marginBottom: '4px' }}>Título *</label>
                  <input value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#4a5568', display: 'block', marginBottom: '4px' }}>Autor *</label>
                  <input value={form.autor} onChange={e => setForm(p => ({...p, autor: e.target.value}))} style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: '#4a5568', display: 'block', marginBottom: '4px' }}>Ano de publicação</label>
                <input type="number" value={form.ano} onChange={e => setForm(p => ({...p, ano: e.target.value}))} style={{ ...inp, width: '120px' }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: '#4a5568', display: 'block', marginBottom: '4px' }}>
                  Conteúdo da ficha * <span style={{ color: '#2d3748' }}>(notas, citações, resumo)</span>
                </label>
                <textarea value={form.conteudo} onChange={e => setForm(p => ({...p, conteudo: e.target.value}))} rows={5} style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#4a5568', display: 'block', marginBottom: '4px' }}>
                  Referência APA completa * <span style={{ color: '#2d3748' }}>ex: Silva, J. (2020). Título. Editora.</span>
                </label>
                <input value={form.fonte_apa} onChange={e => setForm(p => ({...p, fonte_apa: e.target.value}))} style={inp} />
              </div>

              {error && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={guardar} disabled={saving} style={{
                  padding: '8px 18px', background: saving ? '#1e2535' : '#4f8ef7',
                  border: 'none', borderRadius: '7px', color: '#fff',
                  cursor: saving ? 'default' : 'pointer', fontSize: '13px', fontFamily: 'inherit',
                }}>
                  {saving ? 'A guardar…' : 'Guardar ficha'}
                </button>
                <button onClick={() => { setShowForm(false); setError(''); }} style={{
                  padding: '8px 18px', background: 'transparent', border: '1px solid #1e2535',
                  borderRadius: '7px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading
            ? <div style={{ color: '#4a5568', fontSize: '13px' }}>A carregar…</div>
            : fichas.length === 0
              ? <div style={{ color: '#2d3748', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>Nenhuma ficha adicionada ainda.</div>
              : fichas.map(f => (
                <div key={f.id} style={{
                  padding: '14px 16px', background: '#161b27',
                  border: '1px solid #1e2535', borderRadius: '10px', marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '14px' }}>{f.titulo}</div>
                      <div style={{ color: '#4a5568', fontSize: '12px', marginTop: '2px' }}>
                        {f.autor}{f.ano ? ` · ${f.ano}` : ''}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px', lineHeight: '1.5' }}>
                        {f.conteudo.slice(0, 200)}{f.conteudo.length > 200 ? '…' : ''}
                      </div>
                      <div style={{ color: '#4f8ef780', fontSize: '11px', marginTop: '6px', fontStyle: 'italic' }}>
                        {f.fonte_apa}
                      </div>
                    </div>
                    <button onClick={() => eliminar(f.id)} style={{
                      background: 'none', border: 'none', color: '#2d3748',
                      cursor: 'pointer', fontSize: '14px', padding: '2px 6px', marginLeft: '10px',
                    }}>🗑️</button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
