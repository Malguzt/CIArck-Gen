import { wordpressService } from '@/lib/wordpress';
import TranslationsList from './translation-list';

export const revalidate = 0; // Disable static caching for this page

export default async function TranslationsPage() {
    // Fetch all posts — the CIArck Multilang plugin exposes lang & translations fields.
    // We fetch a larger batch to build the translations matrix.
    const allPosts = await wordpressService.getPosts();

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Translations</h2>
                    <p className="text-neutral-400">
                        Manage post translations across multiple languages. Generate missing ones with AI.
                    </p>
                </div>
            </header>

            <TranslationsList initialPosts={allPosts} />
        </div>
    );
}
