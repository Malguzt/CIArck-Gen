import Link from 'next/link';
import { Icons } from '@/components/Icons';
import { newsService } from '@/lib/news';

export default async function Home() {
  const trends = await newsService.getTrends();

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Dashboard
        </h2>
        <p className="text-neutral-400 mt-2">Welcome back! What would you like to publish today?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
          <h3 className="text-xl font-semibold mb-4 text-white">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/new"
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors group cursor-pointer"
            >
              <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors mb-3">
                <Icons.Pencil />
              </div>
              <span className="font-medium text-neutral-300 group-hover:text-white">New AI Post</span>
            </Link>
            <Link
              href="/trends"
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors group cursor-pointer"
            >
              <div className="p-3 rounded-full bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors mb-3">
                <Icons.Globe />
              </div>
              <span className="font-medium text-neutral-300 group-hover:text-white">View Trends</span>
            </Link>
          </div>
        </div>

        {/* Recent Trends */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
          <h3 className="text-xl font-semibold mb-4 text-white">Trending Topics</h3>
          <div className="flex flex-col space-y-4">
            {trends.slice(0, 5).map((trend, i) => (
              <div key={i} className="flex items-start justify-between group">
                <div>
                  <a href={trend.link} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-300 group-hover:text-blue-400 transition-colors">
                    {trend.title}
                  </a>
                  <p className="text-xs text-neutral-500">{trend.source} • {new Date(trend.pubDate).toLocaleDateString()}</p>
                </div>
                <Link href={`/new?topic=${encodeURIComponent(trend.title)}`} className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg text-xs transition-opacity">
                  Draft
                </Link>
              </div>
            ))}
            {trends.length === 0 && (
              <p className="text-neutral-500 text-sm">No trends available right now.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Posts - Placeholder for now until we have real API connection verified */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h3 className="text-xl font-semibold mb-4 text-white">Recent Logs</h3>
        <div className="p-4 bg-neutral-950/50 rounded-lg border border-neutral-800 text-neutral-400 text-sm">
          System initialized and ready for deployment.
        </div>
      </div>
    </div>
  );
}
