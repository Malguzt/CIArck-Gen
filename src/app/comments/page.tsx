'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Comment } from '@/lib/types';

export default function CommentsPage() {
    const [comments, setComments] = useState<Comment[]>([]);
    const [status, setStatus] = useState<string>('hold');
    const [isLoading, setIsLoading] = useState(true);

    const fetchComments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/comments?status=${status}`);
            if (res.ok) {
                const data = await res.json();
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
                // Refresh list
                fetchComments();
            } else {
                alert('Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment', error);
            alert('Error updating comment');
        }
    };

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

            {/* Tabs */}
            <div className="flex space-x-1 bg-neutral-900 p-1 rounded-xl w-fit">
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

            {/* List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-neutral-500">Loading comments...</div>
                ) : comments.length > 0 ? (
                    comments.map((comment) => (
                        <div key={comment.id} className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-white">{comment.author_name}</h4>
                                    <p className="text-xs text-neutral-500">
                                        on Post #{comment.post} • {new Date(comment.date).toLocaleString()}
                                    </p>
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
