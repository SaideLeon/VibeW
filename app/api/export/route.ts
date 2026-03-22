import { NextResponse } from 'next/server';
import { generateDocx } from '@/lib/docx';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface CapituloExportacao {
  titulo: string;
  seccoes: string[];
}

function normalizarNomeFicheiro(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { content, filename = 'documento', trabalho_id } = await req.json();

    let markdown: string | undefined = typeof content === 'string' ? content : undefined;
    let resolvedFilename: string = typeof filename === 'string' ? filename : 'documento';

    if (trabalho_id) {
      const { data: trabalho, error: trabalhoError } = await supabase
        .from('trabalhos')
        .select('id, titulo, tema, user_id')
        .eq('id', trabalho_id)
        .eq('user_id', user.id)
        .single();

      if (trabalhoError || !trabalho) {
        return NextResponse.json({ error: 'Trabalho não encontrado' }, { status: 404 });
      }

      const { data: estrutura, error: estruturaError } = await supabase
        .from('estrutura')
        .select('id, capitulo_index, seccao_index, titulo_capitulo, titulo_seccao')
        .eq('trabalho_id', trabalho_id)
        .order('capitulo_index', { ascending: true })
        .order('seccao_index', { ascending: true });

      if (estruturaError) throw estruturaError;

      const { data: seccoes, error: seccoesError } = await supabase
        .from('seccoes')
        .select('capitulo_index, seccao_index, conteudo_markdown')
        .eq('trabalho_id', trabalho_id);

      if (seccoesError) throw seccoesError;

      const seccoesMap = new Map<string, string>(
        (seccoes ?? []).map((sec) => [
          `${sec.capitulo_index}-${sec.seccao_index}`,
          sec.conteudo_markdown ?? '',
        ])
      );

      const capitulos = new Map<number, CapituloExportacao>();

      for (const row of estrutura ?? []) {
        const chaveCapitulo = row.capitulo_index;
        const atual = capitulos.get(chaveCapitulo) ?? {
          titulo: row.titulo_capitulo,
          seccoes: [],
        };

        const conteudo = seccoesMap.get(`${row.capitulo_index}-${row.seccao_index}`)?.trim();
        atual.seccoes.push(
          `## ${row.capitulo_index + 1}.${row.seccao_index + 1} ${row.titulo_seccao}\n\n${conteudo || '_Secção por desenvolver._'}`
        );
        capitulos.set(chaveCapitulo, atual);
      }

      markdown = [
        `# ${trabalho.titulo}`,
        '',
        `**Tema:** ${trabalho.tema}`,
        '',
        ...Array.from(capitulos.entries())
          .sort(([a], [b]) => a - b)
          .flatMap(([indice, capitulo]) => [
            `# ${indice + 1}. ${capitulo.titulo}`,
            '',
            ...capitulo.seccoes,
            '',
          ]),
      ].join('\n');

      resolvedFilename = trabalho.titulo || filename;
    }

    if (!markdown?.trim()) {
      return NextResponse.json({ error: 'Content ou trabalho_id é obrigatório' }, { status: 400 });
    }

    const buffer = await generateDocx(markdown);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${normalizarNomeFicheiro(resolvedFilename) || 'documento'}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating DOCX:', error.stack || error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate DOCX', stack: error.stack },
      { status: 500 }
    );
  }
}
