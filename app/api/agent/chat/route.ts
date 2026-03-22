import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages = [], trabalho_id } = await req.json();

    const history = Array.isArray(messages)
      ? messages
          .filter((message: ChatMessage) => message?.content)
          .map((message: ChatMessage) => `${message.role.toUpperCase()}: ${message.content}`)
          .join('\n\n')
      : '';

    const prompt = `És um assistente académico especializado em Português europeu.
Ajudas o utilizador a desenvolver um trabalho académico com norma APA.
${trabalho_id ? `\nID DO TRABALHO: ${trabalho_id}` : ''}

HISTÓRICO RECENTE:
${history || '(sem histórico)'}

Responde de forma útil, académica e em Português europeu. Sê conciso mas preciso.
Se o utilizador pedir para gerar índice, estrutura ou organização do trabalho, sugere o agente planificador.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.5, maxOutputTokens: 1024 },
    });

    return NextResponse.json({ content: response.text?.trim() ?? 'Sem resposta.' });
  } catch (err: any) {
    console.error('Agent chat error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao gerar resposta' }, { status: 500 });
  }
}
