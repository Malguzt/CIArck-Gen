import Link from 'next/link';
import { profilesService } from '@/lib/profiles';
import { Icons } from '@/components/Icons';

export default async function ProfilesPage() {
    const profiles = await profilesService.getProfiles();

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Writer Profiles</h2>
                    <p className="text-neutral-400 mt-2">Manage the personas that write your content.</p>
                </div>
                <Link href="/profiles/new" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Create Profile</span>
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((profile) => (
                    <Link key={profile.id} href={`/profiles/${profile.id}`}>
                        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors group cursor-pointer h-full flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white">
                                    {profile.name.charAt(0)}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400">
                                    <Icons.Pencil />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-1">{profile.name}</h3>
                            <p className="text-sm text-blue-400 mb-4">{profile.role}</p>
                            <div className="space-y-2 text-sm text-neutral-400 flex-1">
                                <p><span className="text-neutral-500">Personality:</span> {profile.personality}</p>
                                <p><span className="text-neutral-500">Style:</span> {profile.style}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap gap-2">
                                {profile.interests.slice(0, 3).map((tag, i) => (
                                    <span key={i} className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-300">
                                        {tag}
                                    </span>
                                ))}
                                {profile.interests.length > 3 && (
                                    <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-500">
                                        +{profile.interests.length - 3}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
                {profiles.length === 0 && (
                    <div className="col-span-full py-12 text-center text-neutral-500 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
                        <p>No profiles created yet. Create one to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
