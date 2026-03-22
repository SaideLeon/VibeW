import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export interface SeccaoInput {
  capitulo_index: number;
  seccao_index: number;
  titulo_capitulo: string;
  titulo_seccao: string;
}

export interface FichaInput {
  titulo: string;
  autor: string;
  ano: number | null;
  conteudo: string;
  fonte_apa: string;
}

export interface SeccaoGerada {
  capitulo_index: number;
  seccao_index: number;
  conteudo_markdown: string;
  referencias_apa: string[];
}

export async function executarDesenvolvedor(
  seccoes: SeccaoInput[],          // máx. 2
  fichas: FichaInput[],
  ultimasDuasSeccoes: { titulo: string; conteudo: string }[],
  temaTrab: string
): Promise<SeccaoGerada[]> {
  if (seccoes.length > 2) {
    throw new Error('O Desenvolvedor só processa no máximo 2 secções por vez.');
  }

  const fichasCtx = fichas.length > 0
    ? `FICHAS TÉCNICAS (citar em APA inline):\n${fichas.map((f, i) =>
        `[F${i + 1}] Autor: ${f.autor} | Ano: ${f.ano ?? 's.d.'} | Título: ${f.titulo}\n` +
        `Conteúdo: ${f.conteudo.slice(0, 500)}\n` +
        `Referência APA: ${f.fonte_apa}`
      ).join('\n\n')}`
    : 'Sem fichas técnicas fornecidas.';

  const contextoPrevio = ultimasDuasSeccoes.length > 0
    ? `CONTEXTO DAS ÚLTIMAS SECÇÕES ESCRITAS (manter coerência):\n${ultimasDuasSeccoes.map(
        s => `## ${s.titulo}\n${s.conteudo.slice(0, 600)}...`
      ).join('\n\n---\n\n')}`
    : 'Primeira(s) secção(ões) do trabalho.';

  const seccoesSolicitadas = seccoes.map(
    s => `- Capítulo ${s.capitulo_index + 1}.${s.seccao_index + 1}: "${s.titulo_capitulo} > ${s.titulo_seccao}"`
  ).join('\n');

  const prompt = `És um académico especialista a escrever trabalhos em Português europeu com norma APA.

TEMA DO TRABALHO: ${temaTrab}

SECÇÕES A DESENVOLVER:
${seccoesSolicitadas}

${contextoPrevio}

${fichasCtx}

INSTRUÇÕES:
1. Escreve cada secção em Markdown académico formal
2. Cada secção com 400 a 700 palavras
3. Cita as fichas técnicas inline no formato APA: (Autor, Ano)
4. Usa linguagem académica em Português europeu (Portugal)
5. Lista as referências usadas no campo "referencias_apa"

Responde APENAS com JSON válido, sem markdown exterior:
{
  "seccoes": [
    {
      "capitulo_index": 0,
      "seccao_index": 0,
      "conteudo_markdown": "string (markdown completo da secção)",
      "referencias_apa": ["string APA completa"]
    }
  ]
}`;

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 4096,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';
  const json = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(json);
    return parsed.seccoes as SeccaoGerada[];
  } catch {
    throw new Error(`Desenvolvedor: JSON inválido — ${raw.slice(0, 200)}`);
  }
}
