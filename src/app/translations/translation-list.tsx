'use client';

import { useState } from 'react';
import { BlogPost } from '@/lib/types';
import { Icons } from '@/components/Icons';

interface TranslationsListProps {
    initialPosts: BlogPost[];
}

const SUPPORTED_LANGUAGES = [
    { code: 'es', label: 'Spanish' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: 'Chinese' },
    { code: 'fr', label: 'French' }
];

function detectLanguageLocal(title: string, content: string): string {
    const text = (title + ' ' + content).toLowerCase();
    
    // Chinese characters
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';

    const words = text.match(/\b[a-záéíóúñ]+\b/g) || [];
    let enScore = 0, esScore = 0, frScore = 0;

    const enWords = new Set(['the', 'is', 'in', 'and', 'to', 'of', 'a', 'that', 'for', 'with', 'on', 'this']);
    const esWords = new Set(['el', 'la', 'los', 'las', 'en', 'y', 'de', 'un', 'una', 'que', 'por', 'con', 'para']);
    const frWords = new Set(['le', 'la', 'les', 'en', 'et', 'de', 'un', 'une', 'qui', 'que', 'pour', 'avec', 'dans']);

    for (const w of words) {
        if (enWords.has(w)) enScore++;
        if (esWords.has(w)) esScore++;
        if (frWords.has(w)) frScore++;
    }

    if (enScore > esScore && enScore > frScore) return 'en';
    if (frScore > esScore && frScore > enScore) return 'fr';
    
    return 'es'; // Default fallback
}

interface PreviewData {
    originalPost: BlogPost;
    existingTranslations: Record<string, number>;
    targetLang: string;
    translatedTitle: string;
    translatedContent: string;
}

export default function TranslationsList({ initialPosts }: TranslationsListProps) {
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
    const [translatingId, setTranslatingId] = useState<string | null>(null); // "postId-langCode"
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const getGroupedPosts = () => {
        const grouped: { [key: number]: { post: BlogPost, langs: Record<string, number> } } = {};
        const undefinedPostsList: BlogPost[] = [];
        const processedIds = new Set<number>();

        // Sort by ID ascending so the oldest (original) post becomes the group representative
        const sortedPosts = [...posts].sort((a, b) => (a.id || 0) - (b.id || 0));

        sortedPosts.forEach(p => {
            // Skip if already grouped as a sibling of a previously seen post
            if (processedIds.has(p.id!)) return;

            // Posts without a language go to the undefined list
            if (!p.lang) {
                undefinedPostsList.push(p);
                return;
            }

            const langsMap = p.translations && Object.keys(p.translations).length > 0
                ? { ...p.translations }
                : { [p.lang]: p.id! };

            // Mark all posts in this translation group as processed
            Object.values(langsMap).forEach(id => processedIds.add(id));

            grouped[p.id!] = { post: p, langs: langsMap };
        });

        return { groupedPosts: Object.values(grouped), undefinedPostsList };
    };

    const { groupedPosts, undefinedPostsList } = getGroupedPosts();

    const handleDetectLanguage = (post: BlogPost) => {
        const detected = detectLanguageLocal(post.title, post.content);
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, lang: detected } : p));
    };

    const handleGenerateTranslation = async (originalPost: BlogPost, existingTranslations: Record<string, number>, targetLang: string) => {
        setTranslatingId(`${originalPost.id}-${targetLang}`);
        setError(null);

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    originalPostId: originalPost.id,
                    title: originalPost.title,
                    content: originalPost.content,
                    targetLanguage: targetLang,
                    model: 'openai/gpt-4o'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate translation');
            }

            // Open the preview modal
            setPreviewData({
                originalPost,
                existingTranslations,
                targetLang,
                translatedTitle: data.translated.title,
                translatedContent: data.translated.content,
            });

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setTranslatingId(null);
        }
    };

    const handleSaveTranslation = async () => {
        if (!previewData) return;
        
        setIsSaving(true);
        setError(null);

        try {
            const currentTranslations = { ...previewData.existingTranslations };
            if (previewData.originalPost.lang && !currentTranslations[previewData.originalPost.lang]) {
                currentTranslations[previewData.originalPost.lang] = previewData.originalPost.id!;
            }

            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    title: previewData.translatedTitle,
                    content: previewData.translatedContent,
                    targetLanguage: previewData.targetLang,
                    translations: currentTranslations,
                    authorId: previewData.originalPost.authorId,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save translated post');
            }

            // Successfully translated. Update UI
            setPosts(prev => {
                const newPost = data.post as BlogPost;
                const updatedPosts = [...prev, newPost];

                // Update original post's translation map
                const originalIndex = updatedPosts.findIndex(p => p.id === previewData.originalPost.id);
                if (originalIndex !== -1) {
                    updatedPosts[originalIndex] = {
                        ...updatedPosts[originalIndex],
                        translations: {
                            ...updatedPosts[originalIndex].translations,
                            ...currentTranslations,
                            [previewData.targetLang]: newPost.id!
                        }
                    };
                }
                return updatedPosts;
            });

            setPreviewData(null);
            alert(`Translation to ${previewData.targetLang} published successfully.`);

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden relative">
            {error && (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-500 text-sm">
                    {error}
                </div>
            )}
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-950/50 border-b border-neutral-800">
                            <th className="p-4 font-medium text-neutral-400">Original Post</th>
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <th key={lang.code} className="p-4 font-medium text-neutral-400 text-center">
                                    {lang.label} ({lang.code})
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {/* Grouped (Language Linked) Posts */}
                        {groupedPosts.map(({ post, langs }) => (
                            <tr key={post.id} className="hover:bg-neutral-800/50 transition-colors">
                                <td className="p-4 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate max-w-sm" dangerouslySetInnerHTML={{ __html: post.title }} />
                                        <div className="text-xs text-neutral-500 mt-1">
                                            Status: <span className="capitalize">{post.status}</span> • ID: {post.id} • Lang: <span className="uppercase text-blue-400 font-bold">{post.lang}</span>
                                        </div>
                                    </div>
                                </td>
                                
                                {SUPPORTED_LANGUAGES.map(lang => {
                                    const isTranslated = !!langs[lang.code];
                                    const isTranslating = translatingId === `${post.id}-${lang.code}`;

                                    return (
                                        <td key={lang.code} className="p-4 text-center">
                                            {isTranslated ? (
                                                <div className="inline-flex items-center justify-center p-2 rounded-lg bg-green-500/10 text-green-400" title={`ID: ${langs[lang.code]}`}>
                                                    <Icons.Check className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleGenerateTranslation(post, langs, lang.code)}
                                                    disabled={isTranslating}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                        isTranslating 
                                                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                                                            : 'bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white'
                                                    }`}
                                                >
                                                    {isTranslating ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                            Translating...
                                                        </>
                                                    ) : (
                                                        <>Translate</>
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Undefined Language Posts */}
                        {undefinedPostsList.map((post) => (
                            <tr key={post.id} className="bg-neutral-900/30 hover:bg-neutral-800/50 transition-colors border-t border-neutral-800 border-dashed">
                                <td className="p-4 flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate max-w-sm" dangerouslySetInnerHTML={{ __html: post.title }} />
                                        <div className="text-xs text-neutral-500 mt-1">
                                            Status: <span className="capitalize">{post.status}</span> • ID: {post.id} • <span className="text-yellow-500">Unlinked</span>
                                        </div>
                                    </div>
                                </td>
                                <td colSpan={SUPPORTED_LANGUAGES.length} className="p-4 text-center">
                                    <div className="inline-flex items-center gap-3 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
                                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Undefined Language</span>
                                        <button
                                            onClick={() => handleDetectLanguage(post)}
                                            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 leading-none"
                                        >
                                            <Icons.Globe className="w-3.5 h-3.5" />
                                            Detect
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {groupedPosts.length === 0 && undefinedPostsList.length === 0 && (
                            <tr>
                                <td colSpan={SUPPORTED_LANGUAGES.length + 1} className="p-8 text-center text-neutral-500">
                                    No posts found. Create a post first.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/30 text-xs text-neutral-500">
                Note: The <strong>CIArck Multilang</strong> plugin must be active on your WordPress site to manage languages and link translations.
            </div>

            {/* Preview Modal */}
            {previewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Icons.Languages className="w-5 h-5 text-blue-400" />
                                    Translation Preview
                                </h3>
                                <p className="text-sm text-neutral-400 mt-0.5">
                                    Review and edit the AI-generated translation for <span className="uppercase text-white font-bold">{previewData.targetLang}</span> before saving.
                                </p>
                            </div>
                            <button 
                                onClick={() => setPreviewData(null)}
                                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                            >
                                <Icons.X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Split View */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-800 bg-neutral-950">
                            
                            {/* Left: Original Post */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-3 bg-neutral-900/50 border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-widest flex justify-between">
                                    <span>Original ({previewData.originalPost.lang})</span>
                                    <span>Read-only</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Title</h4>
                                        <div className="text-xl font-bold text-white bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/50" dangerouslySetInnerHTML={{ __html: previewData.originalPost.title }} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">HTML Content</h4>
                                        <div className="text-neutral-300 prose prose-invert prose-neutral max-w-none bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/50 break-words" dangerouslySetInnerHTML={{ __html: previewData.originalPost.content }} />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Translated Post (Editable) */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-blue-950/10">
                                <div className="p-3 bg-blue-900/20 border-b border-neutral-800 text-xs font-bold text-blue-400 uppercase tracking-widest flex justify-between">
                                    <span>Translation ({previewData.targetLang})</span>
                                    <span>Editable</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-blue-400/70 uppercase tracking-wider mb-2">Translated Title</h4>
                                        <input 
                                            type="text"
                                            value={previewData.translatedTitle}
                                            onChange={(e) => setPreviewData(prev => prev ? { ...prev, translatedTitle: e.target.value } : null)}
                                            className="w-full text-xl font-bold text-white bg-neutral-900/80 p-4 rounded-xl border border-blue-500/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col min-h-[300px]">
                                        <h4 className="text-xs font-semibold text-blue-400/70 uppercase tracking-wider mb-2">Translated HTML Content</h4>
                                        <textarea 
                                            value={previewData.translatedContent}
                                            onChange={(e) => setPreviewData(prev => prev ? { ...prev, translatedContent: e.target.value } : null)}
                                            className="flex-1 w-full text-neutral-300 font-mono text-sm bg-neutral-900/80 p-4 rounded-xl border border-blue-500/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setPreviewData(null)}
                                disabled={isSaving}
                                className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleSaveTranslation}
                                disabled={isSaving}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving to WordPress...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Check className="w-4 h-4" />
                                        Approve & Save Draft
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
