import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API Key is missing' }, { status: 500 });
        }

        const res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'WordPress Blog Manager',
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('OpenRouter API Error:', res.status, errorText);
            throw new Error('Failed to fetch models from OpenRouter');
        }

        const data = await res.json();
        const allModels = data.data || [];

        // Derived from OpenRouter Rankings (March 2026)
        const top10Ids = [
            'openrouter/auto',                     // Hunter Alpha
            'minimax/minimax-m2.5',                // MiniMax M2.5
            'google/gemini-2.5-flash',              // Gemini 2.5 Flash
            'stepfun/step-3.5-flash:free',         // Step 3.5 Flash (free)
            'deepseek/deepseek-v3.2',              // DeepSeek V3.2
            'anthropic/claude-sonnet-4.6',         // Claude Sonnet 4.6
            'anthropic/claude-opus-4.6',           // Claude Opus 4.6
            'moonshotai/kimi-k2.5',                // Kimi K2.5
            'arcee-ai/trinity-large-preview:free', // Trinity Large Preview (free)
            'openai/gpt-4o'                       // GPT-4o
        ];

        return NextResponse.json({
            models: allModels,
            top10Ids
        });
    } catch (error: any) {
        console.error('Error in /api/models:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
