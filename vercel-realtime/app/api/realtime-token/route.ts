import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const providerArg = req.nextUrl.searchParams.get('provider') ?? 'openai';
  const { sessionConfig } = await req.json();

  const model = providerArg === 'gemini'
    ? google.experimental_realtime('gemini-3.1-flash-live-preview')
    : openai.experimental_realtime('gpt-realtime');

  const secret = await model.doCreateClientSecret({ sessionConfig });
  return Response.json(secret);
}
