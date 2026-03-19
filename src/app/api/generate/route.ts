import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';
import { profilesService } from '@/lib/profiles';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { topic, model, profileId, context } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        let systemPrompt: string | undefined;
        let profileObj: any = null;

        if (profileId) {
            const profile = await profilesService.getProfile(profileId);
            if (profile) {
                profileObj = profile;
                systemPrompt = `You are a professional blog post writer with the following persona:
           Name: ${profile.name}
           Role: ${profile.role}
           Personality: ${profile.personality}
           Writing Style: ${profile.style}
           
           You have the following memories and knowledge base to draw from:
           ${profile.memories && profile.memories.length > 0 ? profile.memories.join('\n') : "You have no memories yet."}
           
           Your interests include: ${profile.interests.join(', ')}.

           Return the response in JSON format with strict structure: 
           {"title": "The Title", "content": "The full HTML content of the blog post", "newMemories": ["(Optional) Any new important facts or experiences from writing this that you want to remember next time you are called. Include only if necessary."]}
           Do not include markdown code blocks around the JSON.`;
            }
        }

        const result = await openRouterService.generateBlogPost(topic, model, systemPrompt, context);

        // Memory Management: Save any requested new memories
        if (profileObj && result.newMemories && Array.isArray(result.newMemories) && result.newMemories.length > 0) {
            profileObj.memories = [...(profileObj.memories || []), ...result.newMemories];
            await profilesService.saveProfile(profileObj);
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
    }
}
