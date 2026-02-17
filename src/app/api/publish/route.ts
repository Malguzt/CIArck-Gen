import { NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress';
import { logsService } from '@/lib/logs';

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

        // Log the activity
        await logsService.addLog({
            action: status === 'publish' ? 'PUBLISH' : 'DRAFT',
            title: title,
            status: 'success',
            description: `Successfully ${status === 'publish' ? 'published' : 'saved draft'} to WordPress.`
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Publishing Error:', error);

        // Log the error
        const body = await req.json().catch(() => ({ title: 'Unknown' }));
        await logsService.addLog({
            action: 'PUBLISH',
            title: body.title || 'Unknown Title',
            status: 'error',
            description: `Failed to publish: ${error.message}`
        });

        return NextResponse.json({ error: error.message || 'Failed to publish post' }, { status: 500 });
    }
}
