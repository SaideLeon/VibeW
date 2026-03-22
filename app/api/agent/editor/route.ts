import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executarEditor } from '@/lib/agents/editor';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { trabalho_id, capitulo_index, seccao_index, instrucao } = await req.json();
    if (!trabalho_id || capitulo_index == null || seccao_index == null || !instrucao) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    // Verificar ownership
    const { data: trabalho } = await supabase
      .from('trabalhos')
      .select('id')
      .eq('id', trabalho_id)
      .eq('user_id', user.id)
      .single();
    if (!trabalho) return NextResponse.json({ error: 'Trabalho não encontrado' }, { status: 404 });

    // Buscar secção actual
    const { data: seccao, error: sErr } = await supabase
      .from('seccoes')
      .select('*')
      .eq('trabalho_id', trabalho_id)
      .eq('capitulo_index', capitulo_index)
      .eq('seccao_index', seccao_index)
      .single();
    if (sErr || !seccao) {
      return NextResponse.json({ error: 'Secção não encontrada — deve ser gerada primeiro' }, { status: 404 });
    }

    // Buscar título da secção
    const { data: estrutura } = await supabase
      .from('estrutura')
      .select('titulo_seccao')
      .eq('trabalho_id', trabalho_id)
      .eq('capitulo_index', capitulo_index)
      .eq('seccao_index', seccao_index)
      .single();

    // Buscar fichas do trabalho
    const { data: fichas } = await supabase
      .from('fichas_tecnicas')
      .select('titulo, autor, ano, conteudo, fonte_apa')
      .eq('trabalho_id', trabalho_id);

    // Executar Editor (Gemini)
    const resultado = await executarEditor({
      titulo_seccao: estrutura?.titulo_seccao ?? `Secção ${capitulo_index}.${seccao_index}`,
      conteudo_atual: seccao.conteudo_markdown,
      instrucao_edicao: instrucao,
      fichas: fichas ?? [],
    });

    // Actualizar secção com novo conteúdo + incrementar versão
    await supabase
      .from('seccoes')
      .update({
        conteudo_markdown: resultado.conteudo_markdown,
        referencias_apa: resultado.referencias_apa,
        versao: (seccao.versao ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seccao.id);

    // Actualizar status na estrutura
    await supabase
      .from('estrutura')
      .update({ status: 'editada' })
      .eq('trabalho_id', trabalho_id)
      .eq('capitulo_index', capitulo_index)
      .eq('seccao_index', seccao_index);

    // Guardar mensagem do agente
    await supabase.from('mensagens').insert({
      trabalho_id,
      user_id: user.id,
      role: 'assistant',
      agent_type: 'editor',
      content: `✏️ Secção **${estrutura?.titulo_seccao}** editada (v${(seccao.versao ?? 1) + 1})\n\n${resultado.resumo_alteracoes}`,
      metadata: { capitulo_index, seccao_index },
    });

    return NextResponse.json({ resultado });
  } catch (err: any) {
    console.error('Editor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
