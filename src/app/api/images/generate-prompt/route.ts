import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';

export async function POST(req: Request) {
    try {
        const { topic, content } = await req.json();

        if (!topic || !content) {
            return NextResponse.json({ error: 'topic and content are required' }, { status: 400 });
        }

        const promptValue = await openRouterService.generateImagePrompt(topic, content);
        return NextResponse.json({ prompt: promptValue });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }
}
