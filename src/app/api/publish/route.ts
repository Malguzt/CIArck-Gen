import { NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content, status } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const result = await wordpressService.createPost({
            title,
            content,
            status: status || 'draft',
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Publishing Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to publish post' }, { status: 500 });
    }
}
