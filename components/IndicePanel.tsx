'use client';

import { useState } from 'react';

export interface EstruturaRow {
  id: string;
  capitulo_index: number;
  seccao_index: number;
  titulo_capitulo: string;
  titulo_seccao: string;
  status: 'pendente' | 'aprovada' | 'a_gerar' | 'escrita' | 'editada';
}

interface Props {
  estrutura: EstruturaRow[];
  selecionadas: string[];
  onToggleSelect: (id: string) => void;
  onGerar: () => void;
  onEditar: (row: EstruturaRow) => void;
  gerando: boolean;
}

const ST: Record<string, { icon: string; cor: string; label: string }> = {
  pendente: { icon: '○', cor: '#4a5568', label: 'Pendente' },
  aprovada: { icon: '✓', cor: '#4f8ef7', label: 'Aprovada' },
  a_gerar:  { icon: '⏳', cor: '#f59e0b', label: 'A gerar…' },
  escrita:  { icon: '●', cor: '#10b981', label: 'Escrita' },
  editada:  { icon: '✏️', cor: '#a78bfa', label: 'Editada' },
};

export default function IndicePanel({ estrutura, selecionadas, onToggleSelect, onGerar, onEditar, gerando }: Props) {
  const [abertos, setAbertos] = useState<Set<number>>(new Set([0]));

  const toggleCap = (i: number) => setAbertos(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });

  const caps = new Map<number, EstruturaRow[]>();
  for (const r of estrutura) {
    if (!caps.has(r.capitulo_index)) caps.set(r.capitulo_index, []);
    caps.get(r.capitulo_index)!.push(r);
  }

  const podeMais = selecionadas.length < 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #1e2535' }}>
        <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '1.5px' }}>ÍNDICE</div>
        <div style={{ fontSize: '12px', color: '#2d3748', marginTop: '3px' }}>
          {estrutura.filter(e => ['escrita','editada'].includes(e.status)).length}/{estrutura.length} secções escritas
        </div>
      </div>

      {selecionadas.length > 0 && (
        <div style={{ padding: '10px 18px', borderBottom: '1px solid #1e2535', background: '#0b0f18' }}>
          <button onClick={onGerar} disabled={gerando} style={{
            width: '100%', padding: '9px', background: gerando ? '#1e2535' : '#4f8ef7',
            border: 'none', borderRadius: '8px', color: '#fff',
            cursor: gerando ? 'default' : 'pointer', fontSize: '13px',
            fontFamily: 'inherit', fontWeight: 600,
          }}>
            {gerando ? '⏳ A gerar…' : `✍️ Gerar ${selecionadas.length} secção(ões)`}
          </button>
          <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '4px', textAlign: 'center' }}>
            Máximo 2 por vez
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {estrutura.length === 0
          ? <div style={{ padding: '24px 18px', color: '#2d3748', fontSize: '13px' }}>Nenhuma estrutura ainda.</div>
          : Array.from(caps.entries()).sort(([a],[b]) => a - b).map(([ci, secs]) => {
              const open = abertos.has(ci);
              const escritas = secs.filter(s => ['escrita','editada'].includes(s.status)).length;
              return (
                <div key={ci}>
                  <div onClick={() => toggleCap(ci)} style={{
                    padding: '9px 18px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '8px', color: '#94a3b8',
                    fontSize: '13px', fontWeight: 600, userSelect: 'none',
                  }}>
                    <span style={{ color: '#2d3748', fontSize: '10px' }}>{open ? '▼' : '▶'}</span>
                    <span style={{ flex: 1 }}>{ci + 1}. {secs[0].titulo_capitulo}</span>
                    <span style={{ fontSize: '11px', color: '#2d3748' }}>{escritas}/{secs.length}</span>
                  </div>

                  {open && secs.sort((a,b) => a.seccao_index - b.seccao_index).map(row => {
                    const st = ST[row.status] ?? ST.pendente;
                    const sel = selecionadas.includes(row.id);
                    const podeEditar = ['escrita','editada'].includes(row.status);
                    const podeSelecionar = sel || podeMais;

                    return (
                      <div key={row.id} style={{
                        padding: '7px 18px 7px 34px', display: 'flex', alignItems: 'center', gap: '8px',
                        background: sel ? '#4f8ef710' : 'transparent',
                        borderLeft: sel ? '2px solid #4f8ef7' : '2px solid transparent',
                      }}>
                        {/* checkbox manual */}
                        {!podeEditar && row.status !== 'a_gerar' && (
                          <div onClick={() => podeSelecionar && onToggleSelect(row.id)} style={{
                            width: '15px', height: '15px', borderRadius: '4px', flexShrink: 0,
                            border: `1px solid ${sel ? '#4f8ef7' : '#1e2535'}`,
                            background: sel ? '#4f8ef7' : 'transparent',
                            cursor: podeSelecionar ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', color: '#fff',
                          }}>{sel && '✓'}</div>
                        )}

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: sel ? '#cbd5e1' : '#64748b' }}>
                            {ci + 1}.{row.seccao_index + 1} {row.titulo_seccao}
                          </div>
                          <div style={{ fontSize: '11px', color: st.cor, marginTop: '1px' }}>
                            {st.icon} {st.label}
                          </div>
                        </div>

                        {podeEditar && (
                          <button onClick={() => onEditar(row)} title="Editar" style={{
                            background: 'none', border: 'none', color: '#4a5568',
                            cursor: 'pointer', fontSize: '12px', padding: '2px 4px',
                          }}>✏️</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
