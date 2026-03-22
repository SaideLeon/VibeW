import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const encoder = new TextEncoder();

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
Usa Markdown quando isso melhorar a legibilidade da resposta (listas, destaque, subtítulos e blocos de citação).
Se o utilizador pedir para gerar índice, estrutura ou organização do trabalho, sugere o agente planificador.`;

    const stream = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1024,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? '';
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (streamErr: any) {
          controller.error(streamErr);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err: any) {
    console.error('Agent chat error:', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao gerar resposta' }, { status: 500 });
  }
}
