import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data, error } = await supabase
      .from('trabalhos')
      .select('id, titulo, tema, norma, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ trabalhos: data ?? [] });
  } catch (err: any) {
    console.error('GET /api/trabalhos error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao listar trabalhos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { tema, titulo, norma = 'APA' } = await req.json();
    if (!tema?.trim()) {
      return NextResponse.json({ error: 'tema é obrigatório' }, { status: 400 });
    }

    const temaLimpo = tema.trim();
    const tituloInferido = titulo?.trim() || temaLimpo.slice(0, 80);

    const { data, error } = await supabase
      .from('trabalhos')
      .insert({
        user_id: user.id,
        tema: temaLimpo,
        titulo: tituloInferido,
        norma,
      })
      .select('id, titulo, tema, norma, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ trabalho: data }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/trabalhos error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao criar trabalho' }, { status: 500 });
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
      .from('trabalhos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/trabalhos error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao eliminar trabalho' }, { status: 500 });
  }
}
