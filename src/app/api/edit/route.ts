import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';
import { profilesService } from '@/lib/profiles';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, validationReport, profileId } = body;

        if (!content || !profileId) {
            return NextResponse.json({ error: 'Content and profileId are required.' }, { status: 400 });
        }

        const profileObj = await profilesService.getProfile(profileId);
        
        if (!profileObj) {
            return NextResponse.json({ error: 'Editor profile not found.' }, { status: 404 });
        }

        const result = await openRouterService.editContent(profileObj, content, validationReport || {}, 'openai/gpt-4o');

        // Memory Management: Save any requested new memories for the Editor
        if (result.newMemories && Array.isArray(result.newMemories) && result.newMemories.length > 0) {
            profileObj.memories = [...(profileObj.memories || []), ...result.newMemories];
            await profilesService.saveProfile(profileObj);
        }

        return NextResponse.json({ suggestions: result.suggestions });
    } catch (error: any) {
        console.error('Editing API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process editor review' }, { status: 500 });
    }
}
