import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executarPlanificador } from '@/lib/agents/planificador';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { trabalho_id, tema } = await req.json();
    if (!trabalho_id || !tema) {
      return NextResponse.json({ error: 'trabalho_id e tema são obrigatórios' }, { status: 400 });
    }

    // Verificar ownership
    const { data: trabalho, error: tErr } = await supabase
      .from('trabalhos')
      .select('id, tema')
      .eq('id', trabalho_id)
      .eq('user_id', user.id)
      .single();
    if (tErr || !trabalho) return NextResponse.json({ error: 'Trabalho não encontrado' }, { status: 404 });

    // Buscar fichas do trabalho
    const { data: fichas } = await supabase
      .from('fichas_tecnicas')
      .select('titulo, autor, ano, conteudo')
      .eq('trabalho_id', trabalho_id);

    // Executar Planificador (Gemini)
    const plano = await executarPlanificador(tema, fichas ?? []);

    // Limpar estrutura anterior (re-planificação)
    await supabase.from('estrutura').delete().eq('trabalho_id', trabalho_id);

    // Inserir nova estrutura
    const rows = plano.seccoes.map(s => ({
      trabalho_id,
      capitulo_index: s.capitulo_index,
      seccao_index: s.seccao_index,
      titulo_capitulo: s.titulo_capitulo,
      titulo_seccao: s.titulo_seccao,
      status: 'pendente' as const,
    }));

    const { error: insErr } = await supabase.from('estrutura').insert(rows);
    if (insErr) throw new Error(insErr.message);

    // Actualizar título do trabalho se sugerido
    if (plano.titulo_sugerido) {
      await supabase
        .from('trabalhos')
        .update({ titulo: plano.titulo_sugerido })
        .eq('id', trabalho_id);
    }

    // Guardar mensagem do agente
    await supabase.from('mensagens').insert({
      trabalho_id,
      user_id: user.id,
      role: 'assistant',
      agent_type: 'planificador',
      content: `📋 Estrutura gerada para **${plano.titulo_sugerido}**\n\n${plano.justificacao}`,
      metadata: { plano },
    });

    return NextResponse.json({ plano, estrutura: rows });
  } catch (err: any) {
    console.error('Planificador error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
