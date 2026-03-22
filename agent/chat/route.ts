import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { mensagem, tema, historico } = await req.json();

    const prompt = `És um assistente académico especializado em Português europeu.
Ajudas o utilizador a desenvolver um trabalho académico com norma APA.

TEMA DO TRABALHO: ${tema ?? 'Não especificado'}

HISTÓRICO RECENTE:
${historico ?? '(sem histórico)'}

MENSAGEM DO UTILIZADOR: ${mensagem}

Responde de forma útil, académica e em Português europeu. Sê conciso mas preciso.
Se o utilizador pedir para gerar o índice ou estrutura, diz-lhe que pode escrever "Gera o índice" para activar o Agente Planificador.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.5, maxOutputTokens: 1024 },
    });

    return NextResponse.json({ resposta: response.text?.trim() ?? 'Sem resposta.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
