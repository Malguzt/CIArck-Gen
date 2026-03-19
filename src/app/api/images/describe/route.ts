import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';

export async function POST(req: Request) {
    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
        }

        const description = await openRouterService.describeImage(imageUrl);
        return NextResponse.json({ description });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to describe image' }, { status: 500 });
    }
}
