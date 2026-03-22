import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export interface EdicaoInput {
  titulo_seccao: string;
  conteudo_atual: string;
  instrucao_edicao: string;
  fichas: { titulo: string; autor: string; ano: number | null; fonte_apa: string; conteudo: string }[];
}

export interface EdicaoOutput {
  conteudo_markdown: string;
  referencias_apa: string[];
  resumo_alteracoes: string;
}

export async function executarEditor(input: EdicaoInput): Promise<EdicaoOutput> {
  const fichasCtx = input.fichas.length > 0
    ? `\n\nFICHAS TÉCNICAS DE REFERÊNCIA:\n${input.fichas.map((f, i) =>
        `[F${i + 1}] ${f.autor} (${f.ano ?? 's.d.'}). ${f.titulo}\nResumo: ${f.conteudo.slice(0, 400)}\nAPA: ${f.fonte_apa}`
      ).join('\n\n')}`
    : '';

  const prompt = `És um editor académico especialista em Português europeu e norma APA.

SECÇÃO A EDITAR: "${input.titulo_seccao}"

CONTEÚDO ACTUAL:
${input.conteudo_atual}

INSTRUÇÃO DE EDIÇÃO:
${input.instrucao_edicao}${fichasCtx}

Aplica as melhorias solicitadas mantendo:
- Linguagem académica formal em Português europeu
- Citações APA correctas inline (Autor, Ano)
- Coerência com o tema do trabalho
- Extensão similar ao original (não reduzir drasticamente)

Responde APENAS com JSON válido, sem markdown exterior:
{
  "conteudo_markdown": "string (secção completa editada)",
  "referencias_apa": ["string APA completa"],
  "resumo_alteracoes": "string (2-3 frases descrevendo o que foi alterado)"
}`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';

  try {
    return JSON.parse(raw) as EdicaoOutput;
  } catch {
    throw new Error(`Editor: JSON inválido — ${raw.slice(0, 200)}`);
  }
}
