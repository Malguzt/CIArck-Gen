import { NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
        return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    try {
        const media = await wordpressService.getPostMedia(parseInt(postId));
        return NextResponse.json({ media });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { base64Data, fileName, postId } = await req.json();

        if (!base64Data || !fileName) {
            return NextResponse.json({ error: 'base64Data and fileName are required' }, { status: 400 });
        }

        const media = await wordpressService.uploadMedia(base64Data, fileName, postId ? parseInt(postId) : undefined);
        
        if (!media) {
            return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
        }

        return NextResponse.json({ media });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { postId, mediaId } = await req.json();

        if (!postId || !mediaId) {
            return NextResponse.json({ error: 'postId and mediaId are required' }, { status: 400 });
        }

        const ok = await wordpressService.setFeaturedImage(parseInt(postId), parseInt(mediaId));
        if (!ok) {
            return NextResponse.json({ error: 'Failed to set featured image' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
