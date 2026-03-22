import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executarDesenvolvedor } from '@/lib/agents/desenvolvedor';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { trabalho_id, seccoes_ids } = await req.json();
    // seccoes_ids: array de IDs da tabela estrutura (máx. 2)
    if (!trabalho_id || !seccoes_ids?.length) {
      return NextResponse.json({ error: 'trabalho_id e seccoes_ids são obrigatórios' }, { status: 400 });
    }
    if (seccoes_ids.length > 2) {
      return NextResponse.json({ error: 'Máximo 2 secções por vez' }, { status: 400 });
    }

    // Verificar ownership + buscar trabalho
    const { data: trabalho } = await supabase
      .from('trabalhos')
      .select('id, tema, titulo')
      .eq('id', trabalho_id)
      .eq('user_id', user.id)
      .single();
    if (!trabalho) return NextResponse.json({ error: 'Trabalho não encontrado' }, { status: 404 });

    // Buscar estrutura das secções solicitadas
    const { data: estruturas } = await supabase
      .from('estrutura')
      .select('*')
      .in('id', seccoes_ids)
      .eq('trabalho_id', trabalho_id);
    if (!estruturas?.length) {
      return NextResponse.json({ error: 'Secções não encontradas' }, { status: 404 });
    }

    // Buscar fichas do trabalho
    const { data: fichas } = await supabase
      .from('fichas_tecnicas')
      .select('titulo, autor, ano, conteudo, fonte_apa')
      .eq('trabalho_id', trabalho_id);

    // Buscar últimas 2 secções já escritas (contexto deslizante)
    const { data: ultimasSeccoes } = await supabase
      .from('seccoes')
      .select('capitulo_index, seccao_index, conteudo_markdown')
      .eq('trabalho_id', trabalho_id)
      .order('capitulo_index', { ascending: true })
      .order('seccao_index', { ascending: true })
      .limit(2);

    // Mapear para estrutura esperada pelo agente
    const ultimasDuas = (ultimasSeccoes ?? []).map(s => {
      const est = estruturas.find(
        e => e.capitulo_index === s.capitulo_index && e.seccao_index === s.seccao_index
      );
      return { titulo: est?.titulo_seccao ?? '', conteudo: s.conteudo_markdown };
    });

    // Marcar secções como "a_gerar"
    await supabase
      .from('estrutura')
      .update({ status: 'a_gerar' })
      .in('id', seccoes_ids);

    // Executar Desenvolvedor (Groq)
    const seccoes_input = estruturas.map(e => ({
      capitulo_index: e.capitulo_index,
      seccao_index: e.seccao_index,
      titulo_capitulo: e.titulo_capitulo,
      titulo_seccao: e.titulo_seccao,
    }));

    const geradas = await executarDesenvolvedor(
      seccoes_input,
      fichas ?? [],
      ultimasDuas,
      trabalho.tema
    );

    // Guardar cada secção gerada
    for (const g of geradas) {
      const est = estruturas.find(
        e => e.capitulo_index === g.capitulo_index && e.seccao_index === g.seccao_index
      );
      if (!est) continue;

      // Upsert na tabela seccoes
      await supabase.from('seccoes').upsert({
        estrutura_id: est.id,
        trabalho_id,
        capitulo_index: g.capitulo_index,
        seccao_index: g.seccao_index,
        conteudo_markdown: g.conteudo_markdown,
        referencias_apa: g.referencias_apa,
        versao: 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'trabalho_id,capitulo_index,seccao_index' });

      // Actualizar status na estrutura
      await supabase
        .from('estrutura')
        .update({ status: 'escrita' })
        .eq('id', est.id);
    }

    // Guardar mensagem do agente no chat
    const titulosSec = estruturas.map(
      e => `${e.capitulo_index + 1}.${e.seccao_index + 1} ${e.titulo_seccao}`
    ).join(', ');

    await supabase.from('mensagens').insert({
      trabalho_id,
      user_id: user.id,
      role: 'assistant',
      agent_type: 'desenvolvedor',
      content: `✅ Secção(ões) desenvolvida(s): **${titulosSec}**`,
      metadata: { seccoes_geradas: geradas.map(g => ({ capitulo_index: g.capitulo_index, seccao_index: g.seccao_index })) },
    });

    return NextResponse.json({ geradas });
  } catch (err: any) {
    console.error('Desenvolvedor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
