import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';

export async function POST(req: Request) {
    try {
        const { prompt, model } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        }

        const imageUrl = await openRouterService.generateImage(
            prompt,
            model || process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview:free'
        );
        return NextResponse.json({ imageUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate image';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
