'use client';

import { useState, useEffect } from 'react';
import { Profile } from '@/lib/types';
import { Icons } from '@/components/Icons';
import ProfileForm from '@/components/profile-form';

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/profiles');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProfiles(data);
            }
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (profile: Profile) => {
        setEditingProfile(profile);
        setIsEditing(true);
    };

    const handleCreate = () => {
        setEditingProfile(undefined);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this profile?')) return;

        try {
            await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' });
            setProfiles(profiles.filter(p => p.id !== id));
        } catch (error) {
            console.error('Failed to delete profile', error);
        }
    };

    const handleSave = (savedProfile: Profile) => {
        if (editingProfile) {
            setProfiles(profiles.map(p => p.id === savedProfile.id ? savedProfile : p));
        } else {
            setProfiles([...profiles, savedProfile]);
        }
        setIsEditing(false);
        setEditingProfile(undefined);
    };

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
                        AI Profiles
                    </h2>
                    <p className="text-neutral-400 mt-2">Manage your AI writer personas.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                    >
                        <span>+ Create Profile</span>
                    </button>
                )}
            </header>

            {isEditing ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <ProfileForm
                        initialData={editingProfile}
                        onSave={handleSave}
                        onCancel={() => setIsEditing(false)}
                    />
                </div>
            ) : (
                <>
                    {isLoading ? (
                        <div className="text-neutral-500">Loading profiles...</div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-900 rounded-2xl border border-neutral-800">
                            <div className="inline-flex items-center justify-center p-4 bg-neutral-800 rounded-full mb-4 text-neutral-400">
                                <Icons.Users />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">No Profiles Yet</h3>
                            <p className="text-neutral-400 max-w-sm mx-auto mb-6">
                                Create a custom AI personality to write your blog posts with a specific voice and style.
                            </p>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Create Your First Profile
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {profiles.map(profile => (
                                <div key={profile.id} className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{profile.name}</h3>
                                            <div className="text-sm text-blue-400 font-medium">{profile.role}</div>
                                        </div>
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(profile)}
                                                className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
                                                title="Edit"
                                            >
                                                <Icons.Pencil />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(profile.id)}
                                                className="p-2 text-red-400 hover:text-red-300 bg-neutral-800 rounded-lg"
                                                title="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm">
                                            <span className="text-neutral-500 uppercase text-xs font-semibold tracking-wider">Personality</span>
                                            <p className="text-neutral-300 line-clamp-2">{profile.personality}</p>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-neutral-500 uppercase text-xs font-semibold tracking-wider">Style</span>
                                            <p className="text-neutral-300 line-clamp-2">{profile.style}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
