import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';

export async function POST(req: Request) {
    try {
        const { description, targetLanguage } = await req.json();

        if (!description || !targetLanguage) {
            return NextResponse.json({ error: 'description and targetLanguage are required' }, { status: 400 });
        }

        const translatedPrompt = await openRouterService.translateImagePrompt(description, targetLanguage);
        return NextResponse.json({ translatedPrompt });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to translate prompt' }, { status: 500 });
    }
}
