import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { temperature: 0.3, maxOutputTokens: 3000 },
  });

  const raw = response.text?.trim() ?? '';
  const json = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(json) as EdicaoOutput;
  } catch {
    throw new Error(`Editor: JSON inválido — ${raw.slice(0, 200)}`);
  }
}
