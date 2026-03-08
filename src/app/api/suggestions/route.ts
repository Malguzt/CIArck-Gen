import { NextResponse } from 'next/server';
import { profilesService } from '@/lib/profiles';
import { newsService } from '@/lib/news';
import { openRouterService } from '@/lib/openrouter';

export async function GET() {
    try {
        const profiles = await profilesService.getProfiles();
        const trends = await newsService.getTrends();

        if (profiles.length === 0) {
            return NextResponse.json({ suggestions: {} });
        }

        const suggestions: Record<string, string> = {};

        // Run generation in parallel
        await Promise.all(
            profiles.map(async (profile) => {
                const title = await openRouterService.generateTitleSuggestion(profile, trends);
                if (title) {
                    suggestions[profile.id] = title;
                }
            })
        );

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions', suggestions: {} }, { status: 500 });
    }
}
