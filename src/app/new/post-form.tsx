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

    const [suggestions, setSuggestions] = useState<Record<string, string>>({});
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const [generatedContent, setGeneratedContent] = useState<{ title: string; content: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationReport, setValidationReport] = useState<{ confirmed: string[]; false: string[]; doubtful: string[] } | null>(null);
    
    // Editor State
    const [isEditing, setIsEditing] = useState(false);
    const [editorSuggestions, setEditorSuggestions] = useState<Record<string, string>>({});
    
    // Revision State
    const [isRevising, setIsRevising] = useState(false);
    
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch profiles and suggestions on mount
        const loadInitialData = async () => {
            try {
                const resProfiles = await fetch('/api/profiles');
                const dataProfiles = await resProfiles.json();
                if (Array.isArray(dataProfiles)) {
                    setProfiles(dataProfiles);
                    if (dataProfiles.length > 0 && !profileId) setProfileId(dataProfiles[0].id);
                }

                // Fetch suggestions
                setIsLoadingSuggestions(true);
                const resSuggestions = await fetch('/api/suggestions');
                const dataSuggestions = await resSuggestions.json();
                if (dataSuggestions?.suggestions) {
                    setSuggestions(dataSuggestions.suggestions);
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        loadInitialData();
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

    const handleValidateSources = async () => {
        if (!generatedContent?.content) return;

        setIsValidating(true);
        setValidationReport(null);
        setError('');

        try {
            const res = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: generatedContent.content }),
            });

            if (!res.ok) throw new Error('Validation failed');

            const data = await res.json();
            setValidationReport(data.report);
        } catch (err) {
            setError('Failed to validate sources. Try again.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleRequestEditing = async () => {
        if (!generatedContent?.content) return;

        const editors = profiles.filter(p => p.role.toLowerCase().includes('editor'));
        if (editors.length === 0) {
            setError('No Editor profiles found. Please create a profile with the word "Editor" in its role.');
            return;
        }

        setIsEditing(true);
        setError('');
        
        try {
            const results: Record<string, string> = {};
            
            // Call edit API for each editor profile
            await Promise.all(editors.map(async (editor) => {
                const res = await fetch('/api/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        content: generatedContent.content,
                        validationReport: validationReport,
                        profileId: editor.id 
                    }),
                });
                
                if (res.ok) {
                    const data = await res.json();
                    results[editor.name] = data.suggestions;
                } else {
                    results[editor.name] = "Failed to get suggestions from this editor.";
                }
            }));
            
            setEditorSuggestions(results);
        } catch (err) {
            setError('Failed to request editing. Try again.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!generatedContent?.content || !profileId) return;

        setIsRevising(true);
        setError('');
        
        try {
            const res = await fetch('/api/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: generatedContent.content,
                    validationReport: validationReport,
                    editorSuggestions: editorSuggestions,
                    profileId: profileId 
                }),
            });
            
            if (!res.ok) throw new Error('Revision failed');
            
            const data = await res.json();
            // Update the main content box with the newly revised HTML
            setGeneratedContent(prev => prev ? { ...prev, content: data.revisedContent } : null);
            // Optionally, we could clear editor suggestions here, but keeping them might be useful for reference.
        } catch (err) {
            setError('Failed to request revision from the original writer. Try again.');
        } finally {
            setIsRevising(false);
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

                {isLoadingSuggestions && (
                    <div className="text-sm text-neutral-500 animate-pulse flex items-center gap-2">
                        <Icons.Spinner className="w-4 h-4 animate-spin" /> Generating trending title suggestions...
                    </div>
                )}

                {Object.keys(suggestions).length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Suggested by Profiles</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(suggestions).map(([profId, suggestedTitle]) => {
                                const profileName = profiles.find(p => p.id === profId)?.name || 'Unknown';
                                return (
                                    <button
                                        key={profId}
                                        onClick={() => {
                                            setTopic(suggestedTitle);
                                            setProfileId(profId);
                                        }}
                                        className="text-left px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-blue-500 rounded-lg text-sm transition-colors group"
                                    >
                                        <span className="text-xs text-blue-400 font-medium block mb-1">{profileName} suggests:</span>
                                        <span className="text-white group-hover:text-blue-300 transition-colors line-clamp-1">{suggestedTitle}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                            <option value="google/gemini-2.5-pro">Gemini Pro</option>
                            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
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
                            className="w-full h-96 bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-neutral-300 focus:border-neutral-700 outline-none resize-none font-mono text-sm leading-relaxed"
                            value={generatedContent.content}
                            onChange={(e) => setGeneratedContent({ ...generatedContent, content: e.target.value })}
                        />
                    </div>

                    {isValidating && (
                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium flex items-center gap-3 animate-pulse">
                            <Icons.Spinner className="w-5 h-5 animate-spin" />
                            Validando fuentes... Realizando búsquedas en internet y comprobando veracidad.
                        </div>
                    )}

                    {validationReport && (
                        <div className="space-y-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                            <h3 className="text-xl font-bold border-b border-neutral-800 pb-3 flex items-center gap-2">
                                <Icons.Settings className="w-5 h-5 text-blue-400" />
                                Reporte de Veracidad de Fuentes
                            </h3>

                            {validationReport.confirmed?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-green-400 font-semibold flex items-center gap-2">
                                        Confirmado
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
                                        {validationReport.confirmed.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}

                            {validationReport.false?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-red-400 font-semibold flex items-center gap-2">
                                        Falso / Contradictorio
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
                                        {validationReport.false.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}

                            {validationReport.doubtful?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-yellow-400 font-semibold flex items-center gap-2">
                                        Dudosa Veracidad / Sin fuentes claras
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
                                        {validationReport.doubtful.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}

                            {validationReport.false?.length === 0 && validationReport.doubtful?.length === 0 && (
                                <p className="text-sm text-green-500 font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                    ¡Excelente! Todos los datos extraídos parecen ser verídicos.
                                </p>
                            )}
                        </div>
                    )}

                    {isEditing && (
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium flex items-center gap-3 animate-pulse">
                            <Icons.Spinner className="w-5 h-5 animate-spin" />
                            Consultando con Editores...
                        </div>
                    )}

                    {Object.keys(editorSuggestions).length > 0 && (
                        <div className="space-y-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                            <h3 className="text-xl font-bold border-b border-neutral-800 pb-3 flex items-center gap-2">
                                <Icons.Pencil className="w-5 h-5 text-purple-400" />
                                Sugerencias de Edición
                            </h3>
                            
                            <div className="space-y-6">
                                {Object.entries(editorSuggestions).map(([editorName, suggestionHtml]) => (
                                    <div key={editorName} className="space-y-2">
                                        <h4 className="text-purple-400 font-semibold flex items-center gap-2">
                                            {editorName}
                                        </h4>
                                        <div 
                                            className="prose prose-invert prose-sm max-w-none text-neutral-300 bg-neutral-950 p-4 rounded-lg border border-neutral-800"
                                            dangerouslySetInnerHTML={{ __html: suggestionHtml }} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isRevising && (
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium flex items-center gap-3 animate-pulse">
                            <Icons.Spinner className="w-5 h-5 animate-spin" />
                            El Autor está revisando y aplicando las correcciones...
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="space-x-4 flex">
                            <button
                                onClick={handleValidateSources}
                                disabled={isValidating || isPublishing || isEditing || isRevising}
                                className="px-6 py-3 rounded-xl bg-orange-600/20 border border-orange-500/30 text-orange-400 font-medium hover:bg-orange-600/30 transition-colors flex items-center gap-2"
                            >
                                <Icons.Globe /> Validar Fuentes
                            </button>
                            <button
                                onClick={handleRequestEditing}
                                disabled={isValidating || isPublishing || isEditing || isRevising || validationReport === null}
                                className="px-6 py-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 font-medium hover:bg-purple-600/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!validationReport ? "Valida las fuentes primero" : "Solicitar revisión de editores"}
                            >
                                <Icons.Pencil /> Solicitar Edición
                            </button>
                            {Object.keys(editorSuggestions).length > 0 && (
                                <button
                                    onClick={handleRequestRevision}
                                    disabled={isValidating || isPublishing || isEditing || isRevising}
                                    className="px-6 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-medium hover:bg-blue-600/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icons.Pencil /> Aplicar Sugerencias (Autor)
                                </button>
                            )}
                        </div>

                        <div className="space-x-4 flex">
                            <button
                                onClick={() => handlePublish('draft')}
                                disabled={isPublishing || isValidating || isEditing || isRevising}
                                className="px-6 py-3 rounded-xl bg-neutral-800 text-white font-medium hover:bg-neutral-700 transition-colors"
                            >
                                Save as Draft
                            </button>
                            <button
                                onClick={() => handlePublish('publish')}
                                disabled={isPublishing || isValidating || isEditing || isRevising}
                                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                            >
                                {isPublishing ? 'Publishing...' : 'Publish Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
