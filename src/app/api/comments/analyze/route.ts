import { NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress';
import { analysisService } from '@/lib/analysis';
import { openRouterService } from '@/lib/openrouter';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { force = false, offset = 0 } = body;

        // 1. Fetch pending comments from WordPress
        const pendingComments = await wordpressService.getComments('hold', offset);

        if (pendingComments.length === 0) {
            return NextResponse.json({ message: 'No pending comments to analyze', results: [] });
        }

        // 2. Filter out already analyzed ones (unless forced)
        const analyzedIds = await analysisService.getAnalyzedIds();
        const commentsToAnalyze = force
            ? pendingComments
            : pendingComments.filter(c => !analyzedIds.includes(c.id));

        if (commentsToAnalyze.length === 0) {
            return NextResponse.json({
                message: 'All pending comments have already been analyzed',
                results: await analysisService.getAnalyses(pendingComments.map(c => c.id))
            });
        }

        // 3. Analyze in parallel (limit concurrency if needed, but for now allow all)
        const results = await Promise.all(commentsToAnalyze.map(async (comment) => {
            const analysis = await openRouterService.classifyComment(comment.content.rendered);

            const result = {
                commentId: comment.id,
                classification: analysis.classification,
                reason: analysis.reason,
                tags: analysis.tags,
                timestamp: new Date().toISOString(),
                model: 'arcee-ai/trinity-large-preview:free'
            };

            await analysisService.saveAnalysis(result);
            return result;
        }));

        // 4. Return all current analyses for the pending list
        const allAnalyses = await analysisService.getAnalyses(pendingComments.map(c => c.id));

        return NextResponse.json({
            message: `Analyzed ${results.length} new comments`,
            results: allAnalyses
        });

    } catch (error) {
        console.error('Analysis failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
