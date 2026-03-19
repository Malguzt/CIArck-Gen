import { NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'hold';
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const comments = await wordpressService.getComments(status, offset);
    return NextResponse.json(comments);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
        }

        const success = await wordpressService.updateComment(id, status);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
