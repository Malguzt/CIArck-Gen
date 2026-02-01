'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/types';

interface ProfileFormProps {
    initialData?: Profile;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<Partial<Profile>>(initialData || {
        name: '',
        role: '',
        personality: '',
        style: '',
        interests: [],
        memories: []
    });

    const [interestInput, setInterestInput] = useState('');
    const [memoryInput, setMemoryInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/profiles', {
                method: initialData ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to save profile');

            router.refresh();
            router.push('/profiles');
        } catch (error) {
            console.error(error);
            alert('Error saving profile');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id || !confirm('Are you sure you want to delete this profile?')) return;

        setLoading(true);
        try {
            await fetch(`/api/profiles?id=${initialData.id}`, { method: 'DELETE' });
            router.refresh();
            router.push('/profiles');
        } catch (error) {
            console.error(error);
            alert('Error deleting profile');
        } finally {
            setLoading(false);
        }
    };

    const addInterest = () => {
        if (interestInput.trim()) {
            setFormData({ ...formData, interests: [...(formData.interests || []), interestInput.trim()] });
            setInterestInput('');
        }
    };

    const removeInterest = (index: number) => {
        const newInterests = [...(formData.interests || [])];
        newInterests.splice(index, 1);
        setFormData({ ...formData, interests: newInterests });
    };

    const addMemory = () => {
        if (memoryInput.trim()) {
            setFormData({ ...formData, memories: [...(formData.memories || []), memoryInput.trim()] });
            setMemoryInput('');
        }
    };

    const removeMemory = (index: number) => {
        const newMemories = [...(formData.memories || [])];
        newMemories.splice(index, 1);
        setFormData({ ...formData, memories: newMemories });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Name</label>
                            <input
                                type="text" required
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Role</label>
                            <input
                                type="text" required placeholder="e.g. Tech Reviewer, Travel Blogger"
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Personality</label>
                        <input
                            type="text" required placeholder="e.g. Witty, Professional, Sarcastic, Enthusiastic"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.personality} onChange={e => setFormData({ ...formData, personality: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Writing Style</label>
                        <textarea
                            required placeholder="Describe the writing style. e.g. Short sentences, uses many metaphors, technical jargon..."
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })}
                        />
                    </div>

                    {/* Interests */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Interests</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text" placeholder="Add interest..."
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={interestInput} onChange={e => setInterestInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                            />
                            <button type="button" onClick={addInterest} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.interests?.map((interest, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-2">
                                    {interest}
                                    <button type="button" onClick={() => removeInterest(i)} className="hover:text-white">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Memories */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Memories / Knowledge Base</label>
                        <p className="text-xs text-neutral-500">Add specific facts, past events, or context this profile should know.</p>
                        <div className="flex gap-2 mb-2">
                            <textarea
                                placeholder="Add memory chunk..."
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none h-20"
                                value={memoryInput} onChange={e => setMemoryInput(e.target.value)}
                            />
                            <button type="button" onClick={addMemory} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white h-fit">Add</button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {formData.memories?.map((memory, i) => (
                                <div key={i} className="p-3 bg-neutral-800 rounded-lg text-sm text-neutral-300 flex justify-between items-start gap-3">
                                    <p>{memory}</p>
                                    <button type="button" onClick={() => removeMemory(i)} className="text-neutral-500 hover:text-white shrink-0">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between">
                    {initialData ? (
                        <button type="button" onClick={handleDelete} disabled={loading} className="px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-colors">
                            Delete Profile
                        </button>
                    ) : <div />}

                    <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors">
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}
