import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export interface SeccaoEstrutura {
  capitulo_index: number;
  seccao_index: number;
  titulo_capitulo: string;
  titulo_seccao: string;
}

export interface PlanoTrabalho {
  titulo_sugerido: string;
  seccoes: SeccaoEstrutura[];
  justificacao: string;
}

export async function executarPlanificador(
  tema: string,
  fichas: { titulo: string; autor: string; ano: number | null; conteudo: string }[]
): Promise<PlanoTrabalho> {
  const fichasCtx = fichas.length > 0
    ? `\n\nFICHAS TÉCNICAS DISPONÍVEIS:\n${fichas
        .map((f, i) => `[${i + 1}] "${f.titulo}" — ${f.autor}${f.ano ? ` (${f.ano})` : ''}\nResumo: ${f.conteudo.slice(0, 300)}`)
        .join('\n\n')}`
    : '';

  const prompt = `És um especialista em estruturação de trabalhos académicos com norma APA.

TEMA: ${tema}${fichasCtx}

Gera um índice académico completo. Deve ter 4 a 6 capítulos com 2 a 4 secções cada.
Segue a estrutura clássica: Introdução, Revisão de Literatura, Metodologia, Desenvolvimento, Conclusão.

Responde APENAS com JSON válido, sem markdown:
{
  "titulo_sugerido": "string",
  "justificacao": "string",
  "seccoes": [
    { "capitulo_index": 0, "seccao_index": 0, "titulo_capitulo": "string", "titulo_seccao": "string" }
  ]
}`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';

  try {
    return JSON.parse(raw) as PlanoTrabalho;
  } catch {
    throw new Error(`Planificador: JSON inválido — ${raw.slice(0, 200)}`);
  }
}
