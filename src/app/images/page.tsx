'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/Icons';
import { BlogPost, MediaItem } from '@/lib/types';

type PostGroup = {
    representative: BlogPost;
    langs: Record<string, number>;
};

const SUPPORTED_LANGUAGE_OPTIONS = [
    { code: 'es', label: 'Spanish' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French' },
    { code: 'zh', label: 'Chinese' },
];

const LANGUAGE_LABELS: Record<string, string> = SUPPORTED_LANGUAGE_OPTIONS.reduce((acc, option) => {
    acc[option.code] = option.label;
    return acc;
}, {} as Record<string, string>);

export default function ImagesPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [settingFeaturedFor, setSettingFeaturedFor] = useState<number | null>(null);
    const [featuredPickerMedia, setFeaturedPickerMedia] = useState<MediaItem | null>(null);
    const [selectedFeaturedLangs, setSelectedFeaturedLangs] = useState<string[]>([]);
    const [translatePickerMedia, setTranslatePickerMedia] = useState<MediaItem | null>(null);
    const [selectedTranslateLangs, setSelectedTranslateLangs] = useState<string[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoadingPosts(true);
        try {
            const res = await fetch('/api/posts');
            const data = await res.json();
            setPosts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Failed to load posts');
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const fetchMedia = async (postId: number) => {
        setIsLoadingMedia(true);
        setSelectedPostId(postId);
        setGeneratedPrompt('');
        try {
            const res = await fetch(`/api/media?postId=${postId}`);
            const data = await res.json();
            setMedia(data.media || []);
        } catch (err) {
            setError('Failed to load media');
        } finally {
            setIsLoadingMedia(false);
        }
    };

    const getGroupedPosts = (): PostGroup[] => {
        const grouped: PostGroup[] = [];
        const processedIds = new Set<number>();

        const sortedPosts = [...posts].sort((a, b) => (a.id || 0) - (b.id || 0));

        sortedPosts.forEach(post => {
            if (!post.id || processedIds.has(post.id)) return;

            const langs = post.translations && Object.keys(post.translations).length > 0
                ? { ...post.translations }
                : post.lang
                    ? { [post.lang]: post.id }
                    : { undefined: post.id };

            Object.values(langs).forEach(id => processedIds.add(id));
            grouped.push({ representative: post, langs });
        });

        return grouped;
    };

    const groupedPosts = getGroupedPosts();
    const selectedPost = posts.find(p => p.id === selectedPostId) || null;
    const selectedGroup = groupedPosts.find(group =>
        selectedPostId ? Object.values(group.langs).includes(selectedPostId) : false
    ) || null;

    const handleSelectGroup = (group: PostGroup) => {
        const sortedEntries = Object.entries(group.langs).sort(([, a], [, b]) => a - b);
        const defaultPostId = sortedEntries[0]?.[1];
        if (defaultPostId) {
            fetchMedia(defaultPostId);
        }
    };

    const handleSelectLanguage = (postId: number) => {
        fetchMedia(postId);
    };

    const openFeaturedPicker = (mediaItem: MediaItem) => {
        if (!selectedGroup) {
            setError('Select a translated post group first');
            return;
        }
        const validCodes = Object.keys(selectedGroup.langs).filter(code => code !== 'undefined');
        if (validCodes.length === 0) {
            setError('This group has no language-linked posts');
            return;
        }
        setFeaturedPickerMedia(mediaItem);
        setSelectedFeaturedLangs(selectedPost?.lang ? [selectedPost.lang] : [validCodes[0]]);
    };

    const openTranslatePicker = (mediaItem: MediaItem) => {
        if (!selectedGroup || !selectedPost?.lang) {
            setError('Select a post with a valid source language first');
            return;
        }
        const validCodes = Object.keys(selectedGroup.langs).filter(
            code => code !== 'undefined' && code !== selectedPost.lang
        );
        if (validCodes.length === 0) {
            setError('This group has no other language posts to translate into');
            return;
        }
        setTranslatePickerMedia(mediaItem);
        setSelectedTranslateLangs([validCodes[0]]);
    };

    const handleGeneratePrompt = async () => {
        const post = posts.find(p => p.id === selectedPostId);
        if (!post) return;

        setIsGeneratingPrompt(true);
        setError('');
        try {
            const res = await fetch('/api/images/generate-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: post.title, content: post.content }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setGeneratedPrompt(data.prompt);
        } catch (err: any) {
            setError(err.message || 'Failed to generate prompt');
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!generatedPrompt || !selectedPostId) return;

        setIsGeneratingImage(true);
        setError('');
        try {
            const res = await fetch('/api/images/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: generatedPrompt }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            if (data.imageUrl) {
                const uploadRes = await fetch('/api/media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        base64Data: data.imageUrl, 
                        fileName: `ai-gen-${Date.now()}.png`, 
                        postId: selectedPostId 
                    }),
                });
                if (uploadRes.ok) {
                    if (selectedPostId) fetchMedia(selectedPostId);
                    setGeneratedPrompt('');
                } else {
                    throw new Error('Failed to upload generated image to WordPress');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate image');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleTranslateImage = async (mediaItem: MediaItem, targetLanguages: string[]) => {
        const post = posts.find(p => p.id === selectedPostId);
        if (!post || !post.lang || !selectedGroup) {
            setError('Select a translated post group before translating images');
            return;
        }
        if (!targetLanguages || targetLanguages.length === 0) {
            setError('Choose at least one target language');
            return;
        }

        setIsTranslating(true);
        setError('');
        try {
            // 1. Describe
            const descRes = await fetch('/api/images/describe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: mediaItem.source_url }),
            });
            const descData = await descRes.json();
            if (descData.error) throw new Error(descData.error);

            const failures: string[] = [];

            for (const targetLanguage of targetLanguages) {
                if (targetLanguage === post.lang) {
                    continue;
                }
                const targetPostId = selectedGroup.langs[targetLanguage];
                if (!targetPostId) {
                    failures.push(`${targetLanguage} (missing post)`);
                    continue;
                }

                try {
                    // 2. Translate Prompt
                    const transPromptRes = await fetch('/api/images/translate-prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description: descData.description, targetLanguage }),
                    });
                    const transData = await transPromptRes.json();
                    if (transData.error) throw new Error(transData.error);

                    // 3. Generate
                    const genRes = await fetch('/api/images/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: transData.translatedPrompt }),
                    });
                    const genData = await genRes.json();
                    if (genData.error) throw new Error(genData.error);

                    // 4. Upload
                    if (!genData.imageUrl) throw new Error('No generated image payload');
                    const uploadRes = await fetch('/api/media', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            base64Data: genData.imageUrl,
                            fileName: `translated-${mediaItem.id}-${targetLanguage}.png`,
                            postId: targetPostId
                        }),
                    });
                    if (!uploadRes.ok) {
                        throw new Error('Failed to upload translated image');
                    }
                } catch (targetErr: any) {
                    failures.push(`${targetLanguage} (${targetErr?.message || 'failed'})`);
                }
            }

            if (failures.length > 0) {
                throw new Error(`Failed for: ${failures.join(', ')}`);
            }

            if (selectedPostId) {
                fetchMedia(selectedPostId);
            }
            setTranslatePickerMedia(null);
            setSelectedTranslateLangs([]);
        } catch (err: any) {
            setError(err.message || 'Failed to translate image');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSetFeaturedImage = async (mediaItem: MediaItem, targetLanguages: string[]) => {
        if (!selectedGroup) {
            setError('Select a translated post group first');
            return;
        }
        if (!targetLanguages || targetLanguages.length === 0) {
            setError('Choose at least one language');
            return;
        }

        const targetPostIds = targetLanguages
            .map(code => selectedGroup.langs[code])
            .filter((id): id is number => Boolean(id));
        if (targetPostIds.length === 0) return;

        setSettingFeaturedFor(mediaItem.id);
        setError('');
        try {
            const results = await Promise.all(
                targetPostIds.map(async postId => {
                    const res = await fetch('/api/media', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ postId, mediaId: mediaItem.id }),
                    });
                    const data = await res.json();
                    return { postId, ok: res.ok && !data.error, error: data.error as string | undefined };
                })
            );

            const failed = results.filter(r => !r.ok);
            if (failed.length > 0) {
                throw new Error(`Failed to set featured image for ${failed.length} language(s)`);
            }

            setPosts(prev => prev.map(p =>
                targetPostIds.includes(p.id || -1)
                    ? { ...p, featured_media: mediaItem.id, featured_media_url: mediaItem.source_url }
                    : p
            ));
            setFeaturedPickerMedia(null);
            setSelectedFeaturedLangs([]);
        } catch (err: any) {
            setError(err.message || 'Failed to set featured image');
        } finally {
            setSettingFeaturedFor(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Sidebar: Post List */}
            <div className="w-80 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-black/20">
                <div className="p-4 border-b border-neutral-800 bg-neutral-800/30 backdrop-blur-md z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Icons.Pencil className="w-5 h-5 text-blue-400" />
                        Posts Library
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-800">
                    {isLoadingPosts ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-16 bg-neutral-800/50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        groupedPosts.map(group => (
                            <button
                                key={group.representative.id}
                                onClick={() => handleSelectGroup(group)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 group ${selectedGroup?.representative.id === group.representative.id
                                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400' 
                                    : 'hover:bg-neutral-800/50 border border-transparent text-neutral-400'}`}
                            >
                                <div className="font-semibold line-clamp-1 group-hover:text-white transition-colors">
                                    {group.representative.title}
                                </div>
                                <div className="text-[10px] uppercase tracking-widest opacity-50 mt-2 flex justify-between items-center">
                                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                                        ID: {group.representative.id}
                                    </span>
                                    <span className="flex items-center gap-1 text-neutral-300">
                                        <Icons.Languages className="w-3 h-3" />
                                        {Object.keys(group.langs).length} idiomas
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content: Media Library & AI Actions */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800">
                {selectedPostId ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Selected Post Info */}
                        <div className="p-8 bg-neutral-900 border border-neutral-800 rounded-3xl relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 text-neutral-800 group-hover:text-neutral-700 transition-colors pointer-events-none">
                                <Icons.Image className="w-32 h-32" />
                            </div>
                            
                            <div className="relative z-10 space-y-4 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                    Current Selection
                                </div>
                                <h2 className="text-3xl font-extrabold text-white leading-tight">{selectedPost?.title}</h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    {selectedGroup && Object.entries(selectedGroup.langs)
                                        .sort(([, a], [, b]) => a - b)
                                        .map(([langCode, postId]) => {
                                            const groupPost = posts.find(p => p.id === postId);
                                            const isActive = selectedPostId === postId;

                                            return (
                                                <button
                                                    key={postId}
                                                    onClick={() => handleSelectLanguage(postId)}
                                                    className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors ${
                                                        isActive
                                                            ? 'bg-blue-600 border-blue-500 text-white'
                                                            : 'bg-neutral-900/70 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white'
                                                    }`}
                                                    title={groupPost?.title || `Post ${postId}`}
                                                >
                                                    {langCode === 'undefined' ? 'No Lang' : langCode}
                                                </button>
                                            );
                                        })}
                                </div>
                                <div className="flex items-center gap-4">
                                    {selectedPost?.lang && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider">
                                            <Icons.Globe className="w-3 h-3" />
                                            {selectedPost.lang}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleGeneratePrompt}
                                        disabled={isGeneratingPrompt}
                                        className="group px-6 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-2xl text-sm font-bold hover:bg-neutral-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                                    >
                                        {isGeneratingPrompt ? <Icons.Spinner className="w-5 h-5 animate-spin" /> : <Icons.Pencil className="w-5 h-5 group-hover:text-purple-400 transition-colors" />}
                                        Generate Image Prompt
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Prompt Generation UI */}
                        {generatedPrompt && (
                            <div className="p-8 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl shadow-purple-500/5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <Icons.Pencil className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">AI Visual Prompt</h4>
                                            <p className="text-xs text-neutral-500">Edit or refine before generating the visual</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setGeneratedPrompt('')} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500">
                                        <Icons.X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-10 group-focus-within:opacity-20 transition-opacity blur"></div>
                                    <textarea
                                        value={generatedPrompt}
                                        onChange={(e) => setGeneratedPrompt(e.target.value)}
                                        className="relative w-full bg-neutral-900 border border-neutral-800 text-base text-neutral-300 p-6 rounded-2xl outline-none focus:border-purple-500/50 transition-all min-h-[140px] leading-relaxed shadow-inner"
                                        placeholder="Enter image description..."
                                    />
                                </div>
                                <div className="flex justify-end items-center gap-4">
                                   <p className="text-xs text-neutral-500 font-medium">✨ Highly detailed prompts work best</p>
                                    <button
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage}
                                        className="px-8 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] animate-gradient text-white rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                    >
                                        {isGeneratingImage ? <Icons.Spinner className="w-5 h-5 animate-spin" /> : <Icons.Image className="w-5 h-5" />}
                                        Create New Visual
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Media Gallery */}
                        <div className="space-y-4 pb-12">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="font-bold text-lg text-neutral-300 flex items-center gap-2">
                                    <Icons.Image className="w-5 h-5 text-neutral-500" />
                                    Post Assets
                                </h4>
                                <span className="text-xs text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                                    {media.length} items
                                </span>
                            </div>
                            
                            {isLoadingMedia ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="aspect-square bg-neutral-900 border border-neutral-800 rounded-3xl animate-pulse" />
                                    ))}
                                </div>
                            ) : media.length > 0 ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {media.map(item => (
                                        <div key={item.id} className="group relative aspect-square bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500">
                                            <img src={item.source_url} alt={item.alt_text} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            {selectedPost?.featured_media === item.id && (
                                                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                                    Featured
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6 translate-y-4 group-hover:translate-y-0">
                                                <div className="text-xs font-bold text-white mb-1 truncate">{item.title}</div>
                                                <div className="text-[10px] text-neutral-400 mb-4 flex items-center gap-2">
                                                    <span>{item.media_details?.width}x{item.media_details?.height}</span>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                    <span>{item.mime_type.split('/')[1].toUpperCase()}</span>
                                                </div>
                                                <button
                                                    onClick={() => openFeaturedPicker(item)}
                                                    disabled={settingFeaturedFor === item.id}
                                                    className="w-full py-2.5 mb-2 bg-blue-600/80 backdrop-blur-md border border-blue-400/30 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {settingFeaturedFor === item.id ? <Icons.Spinner className="w-4 h-4 animate-spin" /> : <Icons.Check className="w-4 h-4" />}
                                                    Set Featured (Choose Langs)
                                                </button>
                                                <button
                                                    onClick={() => openTranslatePicker(item)}
                                                    disabled={isTranslating}
                                                    className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {isTranslating ? <Icons.Spinner className="w-4 h-4 animate-spin" /> : <Icons.Languages className="w-4 h-4" />}
                                                    Translate (Choose Langs)
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-24 text-center text-neutral-500 bg-neutral-900/30 rounded-[40px] border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-neutral-800/30 flex items-center justify-center mb-4">
                                        <Icons.Image className="w-10 h-10 opacity-20" />
                                    </div>
                                    <h4 className="text-white font-bold mb-1">Galley is Empty</h4>
                                    <p className="max-w-[240px] mx-auto text-sm leading-relaxed">No visuals attached to this entry yet. Start by generating an AI prompt.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/10 rounded-[40px] border border-neutral-800/50">
                        <div className="relative">
                            <Icons.Image className="w-24 h-24 mb-6 text-neutral-800 animate-pulse" />
                            <div className="absolute top-0 right-0 p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-600/40">
                                <Icons.Pencil className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-neutral-400 mb-2">Visual Content Manager</h3>
                        <p className="text-sm max-w-sm text-center text-neutral-500 px-6">Select an entry from the library to view assets, generate prompts, and translate image text with high precision.</p>
                    </div>
                )}
            </div>
            
            {error && (
                <div className="fixed bottom-8 right-8 p-4 bg-red-500 border border-red-600 text-white rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 animate-bounce-short">
                    <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center">!</div>
                    {error}
                    <button onClick={() => setError('')} className="ml-4 opacity-70 hover:opacity-100 transition-opacity">
                        <Icons.X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {featuredPickerMedia && selectedGroup && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4 shadow-2xl">
                        <h4 className="text-base font-bold text-white">Set Featured Image Per Language</h4>
                        <p className="text-xs text-neutral-400">
                            Select one or more languages for this image.
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {Object.keys(selectedGroup.langs)
                                .filter(code => code !== 'undefined')
                                .sort()
                                .map(code => {
                                    const isChecked = selectedFeaturedLangs.includes(code);
                                    return (
                                        <label key={code} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800/70 border border-neutral-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    setSelectedFeaturedLangs(prev =>
                                                        e.target.checked
                                                            ? Array.from(new Set([...prev, code]))
                                                            : prev.filter(item => item !== code)
                                                    );
                                                }}
                                            />
                                            <span className="text-sm text-neutral-200">
                                                {code.toUpperCase()} - {LANGUAGE_LABELS[code] || code}
                                            </span>
                                        </label>
                                    );
                                })}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setFeaturedPickerMedia(null);
                                    setSelectedFeaturedLangs([]);
                                }}
                                className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm font-semibold hover:bg-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSetFeaturedImage(featuredPickerMedia, selectedFeaturedLangs)}
                                disabled={settingFeaturedFor === featuredPickerMedia.id || selectedFeaturedLangs.length === 0}
                                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                            >
                                {settingFeaturedFor === featuredPickerMedia.id ? 'Saving...' : 'Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {translatePickerMedia && selectedGroup && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4 shadow-2xl">
                        <h4 className="text-base font-bold text-white">Generate Translated Alternatives</h4>
                        <p className="text-xs text-neutral-400">
                            Select one or more target languages.
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {Object.keys(selectedGroup.langs)
                                .filter(code => code !== 'undefined' && code !== selectedPost?.lang)
                                .sort()
                                .map(code => {
                                    const isChecked = selectedTranslateLangs.includes(code);
                                    return (
                                        <label key={code} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800/70 border border-neutral-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    setSelectedTranslateLangs(prev =>
                                                        e.target.checked
                                                            ? Array.from(new Set([...prev, code]))
                                                            : prev.filter(item => item !== code)
                                                    );
                                                }}
                                            />
                                            <span className="text-sm text-neutral-200">
                                                {code.toUpperCase()} - {LANGUAGE_LABELS[code] || code}
                                            </span>
                                        </label>
                                    );
                                })}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setTranslatePickerMedia(null);
                                    setSelectedTranslateLangs([]);
                                }}
                                className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm font-semibold hover:bg-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleTranslateImage(translatePickerMedia, selectedTranslateLangs)}
                                disabled={isTranslating || selectedTranslateLangs.length === 0}
                                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                            >
                                {isTranslating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    animation: gradient 6s ease infinite;
                }
                .animate-bounce-short {
                    animation: bounce 1s ease 1;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
}
