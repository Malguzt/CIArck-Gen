'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { Profile } from '@/lib/types';

export default function NewPostForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [topic, setTopic] = useState(searchParams.get('topic') || '');
    const [model, setModel] = useState('openai/gpt-3.5-turbo');
    const [profileId, setProfileId] = useState('');
    const [profiles, setProfiles] = useState<Profile[]>([]);

    const [generatedContent, setGeneratedContent] = useState<{ title: string; content: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch profiles on mount
        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setProfiles(data);
                    if (data.length > 0) setProfileId(data[0].id);
                }
            })
            .catch(console.error);
    }, []);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, model, profileId }),
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setGeneratedContent(data);
        } catch (err) {
            setError('Failed to generate content. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePublish = async (status: 'publish' | 'draft') => {
        if (!generatedContent) return;
        setIsPublishing(true);
        try {
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: generatedContent.title,
                    content: generatedContent.content,
                    status
                }),
            });

            if (!res.ok) throw new Error('Publishing failed');

            alert(status === 'publish' ? 'Published successfully!' : 'Saved as draft!');
            router.push('/');
        } catch (err) {
            setError('Failed to publish post.');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">New Post</h2>

            <div className="grid gap-6 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Topic / Title</label>
                    <input
                        type="text"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. The Future of AI in Blogging"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Writer Profile</label>
                        <select
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={profileId}
                            onChange={(e) => setProfileId(e.target.value)}
                        >
                            <option value="">Standard Assistant</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">AI Model</label>
                        <select
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                        >
                            <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="openai/gpt-4o">GPT-4o</option>
                            <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
                            <option value="google/gemini-pro">Gemini Pro</option>
                            <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!topic || isLoading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    {isLoading ? (
                        <span>Generating Magic...</span>
                    ) : (
                        <>
                            <Icons.Pencil /> <span>Generate Content</span>
                        </>
                    )}
                </button>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </div>

            {generatedContent && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                        <input
                            className="w-full bg-transparent text-2xl font-bold outline-none mb-4"
                            value={generatedContent.title}
                            onChange={(e) => setGeneratedContent({ ...generatedContent, title: e.target.value })}
                        />
                        <textarea
                            className="w-full h-96 bg-neutral-950 p-4 rounded-lg border border-neutral-800 focus:border-neutral-700 outline-none resize-none font-mono text-sm leading-relaxed"
                            value={generatedContent.content}
                            onChange={(e) => setGeneratedContent({ ...generatedContent, content: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => handlePublish('draft')}
                            disabled={isPublishing}
                            className="px-6 py-3 rounded-xl bg-neutral-800 text-white font-medium hover:bg-neutral-700 transition-colors"
                        >
                            Save as Draft
                        </button>
                        <button
                            onClick={() => handlePublish('publish')}
                            disabled={isPublishing}
                            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                        >
                            {isPublishing ? 'Publishing...' : 'Publish Post'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
