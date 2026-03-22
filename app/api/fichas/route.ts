import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const trabalho_id = searchParams.get('trabalho_id');
    if (!trabalho_id) {
      return NextResponse.json({ error: 'trabalho_id é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fichas_tecnicas')
      .select('id, titulo, autor, ano, conteudo, fonte_apa, created_at')
      .eq('trabalho_id', trabalho_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ fichas: data ?? [] });
  } catch (err: any) {
    console.error('GET /api/fichas error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao listar fichas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { trabalho_id, titulo, autor, ano, conteudo, fonte_apa } = await req.json();
    if (!trabalho_id || !titulo?.trim() || !autor?.trim() || !conteudo?.trim() || !fonte_apa?.trim()) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fichas_tecnicas')
      .insert({
        trabalho_id,
        user_id: user.id,
        titulo: titulo.trim(),
        autor: autor.trim(),
        ano: typeof ano === 'number' ? ano : null,
        conteudo: conteudo.trim(),
        fonte_apa: fonte_apa.trim(),
      })
      .select('id, titulo, autor, ano, conteudo, fonte_apa, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ ficha: data }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/fichas error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao criar ficha' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const { error } = await supabase
      .from('fichas_tecnicas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/fichas error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao eliminar ficha' }, { status: 500 });
  }
}
