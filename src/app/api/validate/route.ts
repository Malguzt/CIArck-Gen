import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content to validate is required.' }, { status: 400 });
        }

        const report = await openRouterService.validateContent(content);

        return NextResponse.json({ report });
    } catch (error: any) {
        console.error('Validation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to validate content' }, { status: 500 });
    }
}
