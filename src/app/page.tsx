import Link from 'next/link';
import { Icons } from '@/components/Icons';
import { newsService } from '@/lib/news';
import { logsService } from '@/lib/logs';

export default async function Home() {
  const trends = await newsService.getTrends();
  const logs = await logsService.getLogs(5);

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
            <Link
              href="/profiles"
              className="col-span-2 md:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors group cursor-pointer"
            >
              <div className="p-3 rounded-full bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors mb-3">
                <Icons.Users />
              </div>
              <span className="font-medium text-neutral-300 group-hover:text-white">Manage Profiles</span>
            </Link>
            <Link
              href="/comments"
              className="col-span-2 md:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors group cursor-pointer"
            >
              <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white transition-colors mb-3">
                <Icons.MessageSquare />
              </div>
              <span className="font-medium text-neutral-300 group-hover:text-white">Comments</span>
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

      {/* Recent Activity Logs */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h3 className="text-xl font-semibold mb-4 text-white">Recent Activity</h3>
        <div className="space-y-4">
          {logs.length > 0 ? (
            logs.map(log => (
              <div key={log.id} className="p-4 bg-neutral-950/50 rounded-lg border border-neutral-800 flex justify-between items-center">
                <div>
                  <p className="text-neutral-300 font-medium">{log.title}</p>
                  <p className="text-sm text-neutral-500">{log.description}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${log.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {log.action}
                  </span>
                  <p className="text-xs text-neutral-600 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-neutral-950/50 rounded-lg border border-neutral-800 text-neutral-400 text-sm text-center">
              No activity recorded yet. Start generating content!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
