import { newsService } from '@/lib/news';
import { openRouterService } from '@/lib/openrouter';
import Link from 'next/link';

export default async function TrendsPage() {
    const trends = await newsService.getTrends();

    if (trends.length > 0) {
        try {
            const titles = trends.slice(0, 15).map(t => t.title); // Context for first 15 to keep it fast
            const contextMap = await openRouterService.getTrendsContext(titles);
            trends.forEach(t => {
                if (contextMap[t.title]) {
                    t.context = contextMap[t.title];
                }
            });
        } catch (err) {
            console.error("Failed to enrich trends with context", err);
        }
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold">Trending Topics</h2>
                <p className="text-neutral-400 mt-2">Discover what's popular right now and understand why it matter.</p>
            </header>

            <div className="grid gap-4">
                {trends.map((trend, i) => (
                    <div key={i} className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col space-y-4 group">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <a href={trend.link} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {trend.title}
                                </a>
                                <p className="text-xs text-neutral-500 mt-1">{trend.source} • {new Date(trend.pubDate).toLocaleDateString()}</p>
                            </div>
                            <Link
                                href={`/new?topic=${encodeURIComponent(trend.title)}`}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-bold shadow-lg shadow-blue-500/10"
                            >
                                Create Post
                            </Link>
                        </div>

                        {trend.context && (
                            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 animate-in fade-in slide-in-from-left-2 duration-500">
                                <p className="text-sm text-blue-100/80 leading-relaxed">
                                    <span className="text-blue-400 font-semibold mr-2">Why it's trending:</span>
                                    {trend.context}
                                </p>
                            </div>
                        )}

                        {trend.description && !trend.context && (
                            <p className="text-neutral-400 text-sm italic">{trend.description}</p>
                        )}
                    </div>
                ))}
                {trends.length === 0 && (
                    <p className="text-neutral-500">No trends available. Check your internet connection or try again later.</p>
                )}
            </div>
        </div>
    );
}
