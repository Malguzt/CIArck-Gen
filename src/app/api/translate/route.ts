import { NextResponse } from 'next/server';
import { openRouterService } from '@/lib/openrouter';
import { wordpressService } from '@/lib/wordpress';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        // Default to the old behavior if no action is provided (for backwards compatibility just in case)
        if (!action || action === 'generate_and_save') {
           // ... not supporting this legacy flow to keep it simple, require action
           return NextResponse.json({ error: 'Missing action parameter ("generate" or "save")' }, { status: 400 });
        }

        if (action === 'generate') {
            const { originalPostId, title, content, targetLanguage, model } = body;

            if (!originalPostId || !title || !content || !targetLanguage) {
                return NextResponse.json(
                    { error: 'Missing required fields for generation (originalPostId, title, content, targetLanguage)' },
                    { status: 400 }
                );
            }

            console.log(`Generating translation for post ${originalPostId} to ${targetLanguage}...`);

            // 1. Ask AI to translate
            const translated = await openRouterService.translateContent(
                title,
                content,
                targetLanguage,
                model || 'openai/gpt-4o'
            );

            return NextResponse.json({
                success: true,
                translated: {
                    title: translated.title,
                    content: translated.content
                }
            });
        }

        if (action === 'save') {
            const { title, content, targetLanguage, translations, authorId } = body;

            if (!title || !content || !targetLanguage) {
                return NextResponse.json(
                    { error: 'Missing required fields for saving (title, content, targetLanguage)' },
                    { status: 400 }
                );
            }

            console.log(`Saving translation for ${targetLanguage} to WordPress...`);

            const polylangTranslationsObject = translations || {};

            // 3. Post to WordPress
            const newPostData = {
                title: title,
                content: content,
                status: 'publish' as const,
                lang: targetLanguage,
                translations: polylangTranslationsObject,
                authorId: authorId,
            };

            const createdPost = await wordpressService.createTranslation(newPostData);

            if (!createdPost) {
                throw new Error('Failed to create post in WordPress');
            }

            return NextResponse.json({
                success: true,
                post: createdPost
            });
        }

        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

    } catch (error: unknown) {
        console.error('Translation process error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error during translation process' },
            { status: 500 }
        );
    }
}
