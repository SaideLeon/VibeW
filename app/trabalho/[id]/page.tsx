'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import IndicePanel, { EstruturaRow } from '@/components/IndicePanel';
import FichaUploader from '@/components/FichaUploader';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Bot, FileDown, FileText, PencilLine, SendHorizontal, Sparkles, UserRound } from 'lucide-react';
import { MarkdownContent } from '@/components/MarkdownContent';

interface Mensagem { id: string; role: 'user' | 'assistant'; agent_type?: string | null; content: string; isStreaming?: boolean; }
interface Trabalho { id: string; titulo: string; tema: string; norma: string; }
const uid = () => Math.random().toString(36).slice(2, 10);
const BADGE: Record<string, { cor: string; label: string; icon: typeof FileText }> = {
  planificador: { cor: '#4f8ef7', label: 'Planificador', icon: FileText },
  desenvolvedor: { cor: '#10b981', label: 'Desenvolvedor', icon: Sparkles },
  editor: { cor: '#a78bfa', label: 'Editor', icon: PencilLine },
};
const btnSec: React.CSSProperties = {
  padding: '6px 12px', background: '#161b27', border: '1px solid #1e2535',
  borderRadius: '7px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', fontFamily: "'Georgia', serif",
};

export default function TrabalhoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const sb = createClient();

  const [trabalho, setTrabalho] = useState<Trabalho | null>(null);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [estrutura, setEstrutura] = useState<EstruturaRow[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [showFichas, setShowFichas] = useState(false);
  const [tab, setTab] = useState<'indice'|'seccao'>('indice');
  const [seccaoAberta, setSeccaoAberta] = useState<{titulo:string;conteudo:string}|null>(null);
  const [editando, setEditando] = useState<EstruturaRow|null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const r = await fetch('/api/trabalhos');
      const d = await r.json();
      const t = (d.trabalhos ?? []).find((x: Trabalho) => x.id === id);
      if (!t) { router.push('/dashboard'); return; }
      setTrabalho(t);
      const { data: m } = await sb.from('mensagens').select('id,role,agent_type,content').eq('trabalho_id', id).order('created_at');
      setMsgs(m ?? []);
      await reloadEstrutura();
    })();
  }, [id]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const reloadEstrutura = useCallback(async () => {
    const { data } = await sb.from('estrutura').select('*').eq('trabalho_id', id).order('capitulo_index').order('seccao_index');
    setEstrutura(data ?? []);
  }, [id]);

  const addMsg = (content: string, role: 'user'|'assistant', agent_type?: string, isStreaming = false) =>
    setMsgs(prev => [...prev, { id: uid(), role, agent_type, content, isStreaming }]);

  const saveMsg = async (role: 'user'|'assistant', content: string, agent_type?: string|null) => {
    const { data: { user } } = await sb.auth.getUser();
    await sb.from('mensagens').insert({ trabalho_id: id, user_id: user!.id, role, agent_type: agent_type ?? null, content });
  };

  const enviar = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim(); setInput(''); setLoading(true);
    addMsg(txt, 'user');
    await saveMsg('user', txt);

    const lower = txt.toLowerCase();
    const querPlan = lower.includes('planific') || lower.includes('estrutura') || lower.includes('índice') || lower.includes('organiz') || lower.startsWith('tema:');

    try {
      let resposta = '';
      let agType: string|null = null;

      if (querPlan) {
        agType = 'planificador';
        addMsg('A gerar estrutura...', 'assistant', 'planificador');
        const r = await fetch('/api/agent/planificador', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ trabalho_id: id, tema: txt }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        await reloadEstrutura();
        resposta = `## Estrutura gerada\n\n**${d.plano?.titulo_sugerido}**\n\n${d.plano?.justificacao ?? ''}\n\n**${d.estrutura?.length ?? 0} secções** criadas. Selecciona no índice à direita e clica em **Gerar**.`;

      } else if (editando) {
        agType = 'editor';
        addMsg('A rever a secção...', 'assistant', 'editor');
        const r = await fetch('/api/agent/editor', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ trabalho_id: id, capitulo_index: editando.capitulo_index, seccao_index: editando.seccao_index, instrucao: txt }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        await reloadEstrutura();
        resposta = `## Secção atualizada\n\n**${editando.titulo_seccao}** foi editada com sucesso.\n\n${d.resultado?.resumo_alteracoes ?? ''}`;
        setEditando(null);

      } else {
        agType = 'assistant';
        const streamingId = uid();
        setMsgs(prev => {
          const s = prev.filter(m => m.content !== 'A gerar estrutura...' && m.content !== 'A rever a secção...' && !m.content.startsWith('A escrever '));
          return [...s, { id: streamingId, role: 'assistant', agent_type: null, content: '', isStreaming: true }];
        });

        const r = await fetch('/api/agent/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages: msgs.slice(-10).map(m=>({role:m.role,content:m.content})).concat([{role:'user',content:txt}]), trabalho_id: id }) });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error);
        }
        if (!r.body) throw new Error('Streaming indisponível nesta resposta.');

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const result = await reader.read();
          done = result.done;
          const chunkValue = result.value ? decoder.decode(result.value, { stream: !done }) : '';
          if (chunkValue) {
            resposta += chunkValue;
            setMsgs(prev => prev.map(m => m.id === streamingId ? { ...m, content: resposta, isStreaming: !done } : m));
          }
        }

        setMsgs(prev => prev.map(m => m.id === streamingId ? { ...m, content: resposta || 'Sem resposta.', isStreaming: false } : m));
        resposta = resposta || 'Sem resposta.';
      }

      if (agType !== 'assistant') {
        setMsgs(prev => { const s = prev.filter(m => m.content !== 'A gerar estrutura...' && m.content !== 'A rever a secção...' && !m.content.startsWith('A escrever ')); return [...s, { id: uid(), role: 'assistant', agent_type: agType, content: resposta }]; });
      }
      await saveMsg('assistant', resposta, agType === 'assistant' ? null : agType);
    } catch (e: any) {
      setMsgs(prev => prev.filter(m => m.content !== 'A gerar estrutura...' && m.content !== 'A rever a secção...' && !m.content.startsWith('A escrever ')));
      addMsg(`Erro: ${e.message}`, 'assistant');
    } finally { setLoading(false); }
  };

  const gerar = async () => {
    if (!selecionadas.length || gerando) return;
    setGerando(true);
    addMsg(`A escrever ${selecionadas.length} secção(ões)...`, 'assistant', 'desenvolvedor');
    try {
      const r = await fetch('/api/agent/desenvolvedor', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ trabalho_id: id, seccoes_ids: selecionadas }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await reloadEstrutura();
      const nomes = estrutura.filter(e => selecionadas.includes(e.id)).map(e => `${e.capitulo_index+1}.${e.seccao_index+1} ${e.titulo_seccao}`).join(', ');
      setSelecionadas([]);
      setMsgs(prev => { const s = prev.filter(m => m.content !== 'A gerar estrutura...' && m.content !== 'A rever a secção...' && !m.content.startsWith('A escrever ' )); return [...s, { id: uid(), role: 'assistant', agent_type: 'desenvolvedor', content: `## Secções geradas\n\n**${nomes}**\n\nVê o conteúdo no painel **Secção** à direita, ou pede edições via chat.` }]; });
      await saveMsg('assistant', `Secções geradas: ${nomes}`, 'desenvolvedor');
    } catch (e: any) {
      setMsgs(prev => prev.filter(m => m.content !== 'A gerar estrutura...' && m.content !== 'A rever a secção...' && !m.content.startsWith('A escrever ')));
      addMsg(`Erro: ${e.message}`, 'assistant');
    } finally { setGerando(false); }
  };

  const verSeccao = async (row: EstruturaRow) => {
    const { data } = await sb.from('seccoes').select('conteudo_markdown').eq('trabalho_id', id).eq('capitulo_index', row.capitulo_index).eq('seccao_index', row.seccao_index).single();
    if (data) { setSeccaoAberta({ titulo: `${row.capitulo_index+1}.${row.seccao_index+1} ${row.titulo_seccao}`, conteudo: data.conteudo_markdown }); setTab('seccao'); }
  };

  const pedirEdicao = (row: EstruturaRow) => {
    setEditando(row);
    addMsg(`## Modo de edição\n\n**${row.capitulo_index+1}.${row.seccao_index+1} ${row.titulo_seccao}**\n\nDescreve no chat o que queres alterar.`, 'assistant', 'editor');
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const r = await fetch('/api/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ trabalho_id: id }) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${trabalho?.titulo ?? 'trabalho'}.docx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { alert(`Erro: ${e.message}`); }
    finally { setExportando(false); }
  };

  if (!trabalho) return <div style={{ minHeight:'100vh', background:'#0a0c10', display:'flex', alignItems:'center', justifyContent:'center', color:'#4a5568', fontFamily:"'Georgia',serif" }}>A carregar…</div>;

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0a0c10', fontFamily:"'Georgia',serif", color:'#e2e8f0', overflow:'hidden' }}>

      {/* CHAT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid #1e2535', background:'#0f1219', gap:'12px' }}>
          <Link href="/dashboard" style={{ color:'#4a5568', textDecoration:'none', display:'inline-flex', alignItems:'center' }} aria-label="Voltar ao dashboard"><ArrowLeft size={18} /></Link>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'15px', color:'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{trabalho.titulo}</div>
            <div style={{ fontSize:'11px', color:'#4a5568' }}>{trabalho.norma} · {trabalho.tema.slice(0,60)}{trabalho.tema.length>60?'…':''}</div>
          </div>
          <button onClick={() => setShowFichas(true)} style={{ ...btnSec, display:'inline-flex', alignItems:'center', gap:'6px' }}><BookOpen size={14} /> Fichas</button>
          <button onClick={exportar} disabled={exportando} style={{ ...btnSec, color: exportando?'#4a5568':'#4f8ef7', display:'inline-flex', alignItems:'center', gap:'6px' }}><FileDown size={14} /> {exportando?'A exportar':'DOCX'}</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {msgs.length === 0 && (
            <div style={{ color:'#2d3748', fontSize:'14px', padding:'40px 0', lineHeight:'1.9' }}>
              <div style={{ marginBottom:'12px', color:'#4a5568' }}><Sparkles size={28} /></div>
              <strong style={{ color:'#4a5568' }}>Como começar:</strong><br/>
              1. Descreve o tema — o <span style={{ color:'#4f8ef7' }}>Planificador</span> gera o índice automaticamente.<br/>
              2. Selecciona secções no painel à direita e clica &quot;Gerar&quot;.<br/>
              3. Pede edições específicas via chat a qualquer momento.<br/>
              4. Exporta o trabalho completo em DOCX quando estiver pronto.
            </div>
          )}
          {msgs.map(m => {
            const isUser = m.role === 'user';
            const badge = m.agent_type ? BADGE[m.agent_type] : null;
            return (
              <div key={m.id} style={{ marginBottom:'16px', display:'flex', flexDirection: isUser?'row-reverse':'row', gap:'10px', alignItems:'flex-start' }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background: isUser?'#1e2535':(badge?`${badge.cor}20`:'#161b27'), border:`1px solid ${isUser?'#2d3748':(badge?.cor??'#1e2535')}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>
                  {isUser ? <UserRound size={14} /> : <Bot size={14} />}
                </div>
                <div style={{ maxWidth:'78%' }}>
                  {badge && <div style={{ fontSize:'11px', color:badge.cor, marginBottom:'4px', display:'flex', alignItems:'center', gap:'4px' }}><badge.icon size={12} /> {badge.label}</div>}
                  <div style={{ padding:'10px 14px', borderRadius:'10px', background: isUser?'#161b27':'#0f1520', border:`1px solid ${isUser?'#1e2535':(badge?.cor?badge.cor+'20':'#1e2535')}`, fontSize:'13px', lineHeight:'1.7', color:'#cbd5e1' }}>
                    <MarkdownContent content={m.content} compact />
                    {m.isStreaming && <span style={{ display:'inline-block', width:'8px', height:'1.2em', marginLeft:'2px', verticalAlign:'bottom', background:'#60a5fa', borderRadius:'999px', animation:'pulseCursor 1s ease-in-out infinite' }} />}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && <div style={{ display:'flex', gap:'8px', alignItems:'center', padding:'10px 0', color:'#4a5568', fontSize:'13px' }}>
            <div style={{ display:'flex', gap:'4px' }}>{[0,1,2].map(i=><div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4f8ef7', animation:`bounce 1.2s ${i*0.2}s infinite ease-in-out` }}/>)}</div>
            A processar…
            <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1}} @keyframes pulseCursor{0%,100%{opacity:0.35}50%{opacity:1}}`}</style>
          </div>}
          <div ref={chatEnd}/>
        </div>

        {/* Edição banner */}
        {editando && (
          <div style={{ padding:'8px 20px', background:'#a78bfa15', borderTop:'1px solid #a78bfa30', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'12px', color:'#a78bfa', display:'inline-flex', alignItems:'center', gap:'6px' }}><PencilLine size={12} /> Modo de edição: <strong>{editando.titulo_seccao}</strong></span>
            <button onClick={() => setEditando(null)} style={{ background:'none', border:'none', color:'#a78bfa', cursor:'pointer', fontSize:'12px' }}>Cancelar</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid #1e2535', background:'#0f1219' }}>
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar();}}} placeholder={editando?`Alterações para ${editando.titulo_seccao}…`:'Descreve o tema, pede planificação ou alterações…'} disabled={loading||gerando} rows={3}
              style={{ flex:1, background:'#161b27', border:`1px solid ${editando?'#a78bfa60':'#1e2535'}`, borderRadius:'8px', padding:'10px 13px', color:'#e2e8f0', fontSize:'14px', fontFamily:'inherit', resize:'none', outline:'none' }}/>
            <button onClick={enviar} disabled={loading||gerando||!input.trim()} style={{ padding:'10px 16px', borderRadius:'8px', border:'none', background:loading||gerando||!input.trim()?'#1e2535':(editando?'#a78bfa':'#4f8ef7'), color:'#fff', cursor:loading||gerando||!input.trim()?'default':'pointer', fontSize:'18px', alignSelf:'flex-end', display:'inline-flex', alignItems:'center', justifyContent:'center' }} aria-label="Enviar mensagem"><SendHorizontal size={18} /></button>
          </div>
          <div style={{ fontSize:'11px', color:'#2d3748', marginTop:'5px' }}>Enter envia · Shift+Enter nova linha · Começa com &quot;planifica o tema:&quot; para gerar estrutura</div>
        </div>
      </div>

      {/* PAINEL DIREITO */}
      <div style={{ width:'320px', borderLeft:'1px solid #1e2535', display:'flex', flexDirection:'column', background:'#0b0d12' }}>
        <div style={{ display:'flex', borderBottom:'1px solid #1e2535' }}>
          {(['indice','seccao'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'12px 8px', background:'transparent', border:'none', borderBottom:`2px solid ${tab===t?'#4f8ef7':'transparent'}`, color:tab===t?'#4f8ef7':'#4a5568', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>
              {t==='indice'?'Índice':'Secção'}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {tab === 'indice' ? (
            <IndicePanel estrutura={estrutura} selecionadas={selecionadas}
              onToggleSelect={id=>setSelecionadas(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<2?[...prev,id]:prev)}
              onGerar={gerar} onEditar={pedirEdicao} gerando={gerando}/>
          ) : (
            <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
              {seccaoAberta ? (
                <>
                  <div style={{ fontWeight:700, color:'#cbd5e1', fontSize:'13px', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid #1e2535' }}>{seccaoAberta.titulo}</div>
                  <div style={{ fontSize:'13px', lineHeight:'1.8', color:'#94a3b8' }}><MarkdownContent content={seccaoAberta.conteudo} /></div>
                </>
              ) : (
                <div style={{ color:'#2d3748', fontSize:'13px', padding:'20px 0' }}>Abre uma secção escrita para ver o conteúdo.</div>
              )}
            </div>
          )}
        </div>

        {/* Quick access to written sections */}
        {tab==='indice' && estrutura.some(e=>['escrita','editada'].includes(e.status)) && (
          <div style={{ padding:'10px 18px', borderTop:'1px solid #1e2535' }}>
            <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'5px' }}>VER CONTEÚDO</div>
            <div style={{ maxHeight:'120px', overflowY:'auto' }}>
              {estrutura.filter(e=>['escrita','editada'].includes(e.status)).map(row=>(
                <button key={row.id} onClick={()=>verSeccao(row)} style={{ display:'block', width:'100%', textAlign:'left', padding:'4px 8px', background:'transparent', border:'none', color:'#4f8ef7', cursor:'pointer', fontSize:'11px', fontFamily:'inherit', borderRadius:'4px' }}>
                  {row.capitulo_index+1}.{row.seccao_index+1} {row.titulo_seccao.slice(0,28)}{row.titulo_seccao.length>28?'…':''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showFichas && <FichaUploader trabalhoId={id} onClose={()=>setShowFichas(false)}/>}
    </div>
  );
}
