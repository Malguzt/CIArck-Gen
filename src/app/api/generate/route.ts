import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';
import { profilesService } from '@/lib/profiles';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { topic, model, profileId } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        let systemPrompt: string | undefined;

        if (profileId) {
            const profile = await profilesService.getProfile(profileId);
            if (profile) {
                systemPrompt = `You are a professional blog post writer with the following persona:
           Name: ${profile.name}
           Role: ${profile.role}
           Personality: ${profile.personality}
           Writing Style: ${profile.style}
           
           You have the following memories and knowledge base to draw from:
           ${profile.memories.join('\n')}
           
           Your interests include: ${profile.interests.join(', ')}.

           Return the response in JSON format with strict structure: {"title": "The Title", "content": "The full HTML content of the blog post"}.
           Do not include markdown code blocks around the JSON.`;
            }
        }

        const result = await openRouterService.generateBlogPost(topic, model, systemPrompt);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
    }
}
