import { NextResponse } from 'next/server';
import { profilesService } from '@/lib/profiles';
import { newsService } from '@/lib/news';
import { openRouterService } from '@/lib/openrouter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const topic = searchParams.get('topic') || undefined;
        const context = searchParams.get('context') || undefined;

        const profiles = await profilesService.getProfiles();
        const trends = topic ? [] : await newsService.getTrends();

        if (profiles.length === 0) {
            return NextResponse.json({ suggestions: {} });
        }

        const suggestions: Record<string, string> = {};

        // Run generation in parallel
        await Promise.all(
            profiles.map(async (profile) => {
                const result = await openRouterService.generateTitleSuggestion(profile, trends, topic, context);
                if (result.title) {
                    suggestions[profile.id] = result.title;
                    
                    // Memory Management: Save any requested new memories
                    if (result.newMemories && Array.isArray(result.newMemories) && result.newMemories.length > 0) {
                        profile.memories = [...(profile.memories || []), ...result.newMemories];
                        await profilesService.saveProfile(profile);
                    }
                }
            })
        );

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions', suggestions: {} }, { status: 500 });
    }
}
