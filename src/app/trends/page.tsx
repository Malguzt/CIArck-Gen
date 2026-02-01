import { newsService } from '@/lib/news';
import Link from 'next/link';

export default async function TrendsPage() {
    const trends = await newsService.getTrends();

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold">Trending Topics</h2>
                <p className="text-neutral-400 mt-2">Discover what's popular right now to inspire your next post.</p>
            </header>

            <div className="grid gap-4">
                {trends.map((trend, i) => (
                    <div key={i} className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center group">
                        <div>
                            <a href={trend.link} target="_blank" rel="noopener noreferrer" className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
                                {trend.title}
                            </a>
                            {trend.description && (
                                <p className="text-neutral-400 text-sm mt-1 line-clamp-1">{trend.description}</p>
                            )}
                            <p className="text-xs text-neutral-500 mt-2">{trend.source} • {new Date(trend.pubDate).toLocaleDateString()}</p>
                        </div>
                        <Link
                            href={`/new?topic=${encodeURIComponent(trend.title)}`}
                            className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors text-sm font-medium"
                        >
                            Create Post
                        </Link>
                    </div>
                ))}
                {trends.length === 0 && (
                    <p className="text-neutral-500">No trends available. Check your internet connection or try again later.</p>
                )}
            </div>
        </div>
    );
}
