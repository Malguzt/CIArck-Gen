'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Comment } from '@/lib/types';

export default function CommentsPage() {
    const [comments, setComments] = useState<Comment[]>([]);
    const [status, setStatus] = useState<string>('hold');
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAutoRunning, setIsAutoRunning] = useState(false);

    const fetchComments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/comments?status=${status}`);
            if (res.ok) {
                let data = await res.json();

                // If pending, also fetch analysis results
                if (status === 'hold') {
                    const analyzeRes = await fetch('/api/comments/analyze', {
                        method: 'POST',
                        body: JSON.stringify({ force: false }) // Check for existing analyses
                    });
                    if (analyzeRes.ok) {
                        const { results } = await analyzeRes.json();
                        data = data.map((c: Comment) => ({
                            ...c,
                            analysis: results[c.id]
                        }));
                    }
                }
                setComments(data);
            }
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [status]);

    const handleAction = async (id: number, newStatus: string) => {
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });

            if (res.ok) {
                fetchComments();
            } else {
                alert('Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment', error);
            alert('Error updating comment');
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            // Force analysis of all pending
            const res = await fetch('/api/comments/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: true })
            });
            if (res.ok) {
                fetchComments();
            }
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAutoRun = async () => {
        if (!confirm('Are you sure you want to Auto Run? This will analyze ALL pending comments and automatically trash Spam/Trash.')) return;

        setIsAutoRunning(true);
        try {
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const analyzeRes = await fetch('/api/comments/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force: false, offset })
                });

                if (!analyzeRes.ok) {
                    alert('Analysis failed during auto run');
                    break;
                }

                // Also need to fetch the exact same comments to get their IDs and see if we have more
                const res = await fetch(`/api/comments?status=hold&offset=${offset}`);
                if (!res.ok) break;
                const currentComments = await res.json();

                if (currentComments.length === 0) {
                    hasMore = false;
                    break;
                }

                const { results } = await analyzeRes.json();

                const toTrashIds = currentComments
                    .map((c: any) => c.id)
                    .filter((id: number) => {
                        const analysis = results[id];
                        return analysis && ['trash', 'spam'].includes(analysis.classification);
                    });

                let trashedCount = 0;
                for (const id of toTrashIds) {
                    const trashRes = await fetch('/api/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status: 'trash' }),
                    });
                    if (trashRes.ok) trashedCount++;
                }

                // Adjust offset by the amount of comments we left in the queue.
                // The ones we trashed are removed from the queue, so the queue shifts left.
                const leftInQueue = currentComments.length - trashedCount;
                offset += leftInQueue;

                if (currentComments.length < 20) {
                    hasMore = false;
                }
            }

            await fetchComments();
        } catch (error) {
            console.error('Auto run failed', error);
            alert('Auto run failed');
        } finally {
            setIsAutoRunning(false);
        }
    };

    const handleBulkTrash = async () => {
        if (!confirm('Are you sure you want to trash all comments identified as Spam/Trash?')) return;

        const toTrash = comments.filter(c => c.analysis && ['trash', 'spam'].includes(c.analysis.classification));

        for (const comment of toTrash) {
            await handleAction(comment.id, 'trash');
        }
    };

    const trashCount = comments.filter(c => c.analysis && ['trash', 'spam'].includes(c.analysis.classification)).length;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Comments
                    </h2>
                    <p className="text-neutral-400 mt-2">Moderate your community discussions</p>
                </div>
                <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
                    ← Back to Dashboard
                </Link>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Tabs */}
                <div className="flex space-x-1 bg-neutral-900 p-1 rounded-xl">
                    {['hold', 'approve', 'spam'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${status === s
                                ? 'bg-neutral-800 text-white shadow-sm'
                                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                                }`}
                        >
                            {s === 'hold' ? 'Pending' : s}
                        </button>
                    ))}
                </div>

                {/* AI Actions */}
                {status === 'hold' && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || isAutoRunning || comments.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    ✨ Analyze with AI
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleAutoRun}
                            disabled={isAnalyzing || isAutoRunning || comments.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {isAutoRunning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    🤖 Auto Run
                                </>
                            )}
                        </button>

                        {trashCount > 0 && (
                            <button
                                onClick={handleBulkTrash}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/20"
                            >
                                Trash {trashCount} Detected
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-neutral-500">Loading comments...</div>
                ) : comments.length > 0 ? (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className={`p-6 rounded-2xl border flex flex-col gap-4 transition-colors ${comment.analysis?.classification === 'trash' || comment.analysis?.classification === 'spam'
                                ? 'bg-red-950/10 border-red-500/20'
                                : comment.analysis?.classification === 'approve'
                                    ? 'bg-green-950/10 border-green-500/20'
                                    : 'bg-neutral-900 border-neutral-800'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-white">{comment.author_name}</h4>
                                        {comment.analysis && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${comment.analysis.classification === 'approve'
                                                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                                                : 'border-red-500/30 text-red-400 bg-red-500/10'
                                                }`}>
                                                AI: {comment.analysis.classification}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        on Post #{comment.post} • {new Date(comment.date).toLocaleString()}
                                    </p>

                                    {comment.analysis?.tags && comment.analysis.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {comment.analysis.tags.map((tag, i) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-400">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {comment.analysis?.reason && (
                                        <p className="text-xs text-neutral-400 mt-2 italic border-l-2 border-neutral-800 pl-2">
                                            "{comment.analysis.reason}"
                                        </p>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    {status === 'hold' && (
                                        <button
                                            onClick={() => handleAction(comment.id, 'approve')}
                                            className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded hover:bg-green-500/20 transition-colors"
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {status !== 'spam' && (
                                        <button
                                            onClick={() => handleAction(comment.id, 'spam')}
                                            className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded hover:bg-yellow-500/20 transition-colors"
                                        >
                                            Spam
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleAction(comment.id, 'trash')}
                                        className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded hover:bg-red-500/20 transition-colors"
                                    >
                                        Trash
                                    </button>
                                </div>
                            </div>
                            <div
                                className="text-neutral-300 text-sm prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: comment.content.rendered }}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
                        <p className="text-neutral-500">No {status} comments found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
