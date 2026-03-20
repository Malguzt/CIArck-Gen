'use client';

import React, { useState } from 'react';
import { Profile } from '@/lib/types';


interface ProfileFormProps {
    initialData?: Profile;
    onSave: (profile: Profile) => void;
    onCancel: () => void;
}

export default function ProfileForm({ initialData, onSave, onCancel }: ProfileFormProps) {
    const [formData, setFormData] = useState<Partial<Profile>>(initialData || {
        name: '',
        wordpressAuthorId: undefined,
        role: '',
        personality: '',
        style: '',
        interests: [],
        memories: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const url = '/api/profiles';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to save profile');

            const savedProfile = await res.json();
            onSave(savedProfile);
        } catch {
            setError('Error saving profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleArrayInput = (field: 'interests' | 'memories', value: string) => {
        const array = value.split('\n').filter(line => line.trim() !== '');
        setFormData({ ...formData, [field]: array });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900 connection p-6 rounded-2xl border border-neutral-800">
            <h3 className="text-xl font-bold text-white mb-4">
                {initialData ? 'Edit Profile' : 'Create New Profile'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Name</label>
                    <input
                        required
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Tech Guru"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Role</label>
                    <input
                        required
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        placeholder="e.g. Senior Tech Editor"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400">WordPress Author ID (optional)</label>
                <input
                    type="number"
                    min="1"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.wordpressAuthorId ?? ''}
                    onChange={e => setFormData({
                        ...formData,
                        wordpressAuthorId: e.target.value ? parseInt(e.target.value, 10) : undefined
                    })}
                    placeholder="e.g. 7"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400">Personality</label>
                <textarea
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                    value={formData.personality}
                    onChange={e => setFormData({ ...formData, personality: e.target.value })}
                    placeholder="Describe the personality (e.g. witty, professional, cynical...)"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400">Writing Style</label>
                <textarea
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                    value={formData.style}
                    onChange={e => setFormData({ ...formData, style: e.target.value })}
                    placeholder="Describe the writing style (e.g. concise, elaborate, uses metaphors...)"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Interests (one per line)</label>
                    <textarea
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
                        value={formData.interests?.join('\n')}
                        onChange={e => handleArrayInput('interests', e.target.value)}
                        placeholder="AI\nBlockchain\nQuantum Computing"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Memories / Knowledge (one per line)</label>
                    <textarea
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
                        value={formData.memories?.join('\n')}
                        onChange={e => handleArrayInput('memories', e.target.value)}
                        placeholder="Attended CES 2024\nUsed GPT-3 since beta\nExpert in Python"
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
        </form>
    );
}
