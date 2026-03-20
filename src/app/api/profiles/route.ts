import { NextResponse } from 'next/server';
import { profilesService } from '@/lib/profiles';
import { Profile } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
        const profile = await profilesService.getProfile(id);
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        return NextResponse.json(profile);
    }

    const profiles = await profilesService.getProfiles();
    return NextResponse.json(profiles);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.name || !body.role) {
            return NextResponse.json({ error: 'Name and Role are required' }, { status: 400 });
        }

        const newProfile: Profile = {
            id: uuidv4(),
            name: body.name,
            wordpressAuthorId: body.wordpressAuthorId ? parseInt(body.wordpressAuthorId) : undefined,
            role: body.role,
            personality: body.personality || '',
            style: body.style || '',
            interests: body.interests || [],
            memories: body.memories || [],
        };

        const saved = await profilesService.saveProfile(newProfile);
        return NextResponse.json(saved);
    } catch (error) {
        console.error('Failed to create profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Profile ID is required for update' }, { status: 400 });
        }

        // Ensure we keep existing ID
        const updatedProfile: Profile = {
            id: body.id,
            name: body.name,
            wordpressAuthorId: body.wordpressAuthorId ? parseInt(body.wordpressAuthorId) : undefined,
            role: body.role,
            personality: body.personality,
            style: body.style,
            interests: body.interests,
            memories: body.memories,
        };

        const saved = await profilesService.saveProfile(updatedProfile);
        return NextResponse.json(saved);
    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await profilesService.deleteProfile(id);
    return NextResponse.json({ success: true });
}
