import { NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || '';

    try {
        const posts = await wordpressService.getPosts(lang);
        return NextResponse.json(posts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}
