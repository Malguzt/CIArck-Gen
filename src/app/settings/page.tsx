export default function SettingsPage() {
    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold">Settings</h2>
                <p className="text-neutral-400 mt-2">Manage your application configuration.</p>
            </header>

            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Environment Keys</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-neutral-950 rounded-lg border border-neutral-800">
                            <span className="text-neutral-400">OpenRouter API Key</span>
                            <span className="text-green-500 font-mono text-sm">
                                {process.env.OPENROUTER_API_KEY ? 'Configured' : 'Missing'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-neutral-950 rounded-lg border border-neutral-800">
                            <span className="text-neutral-400">WordPress URL</span>
                            <span className="text-neutral-300 font-mono text-sm truncate max-w-xs">
                                {process.env.WORDPRESS_URL || 'Not Configured'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-neutral-950 rounded-lg border border-neutral-800">
                            <span className="text-neutral-400">WordPress Credentials</span>
                            <span className={process.env.WORDPRESS_APP_PASSWORD ? 'text-green-500' : 'text-red-500'}>
                                {process.env.WORDPRESS_APP_PASSWORD ? 'Configured' : 'Missing'}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-4">
                        Configuration is managed via the <code className="bg-neutral-800 px-1 rounded">.env.local</code> file.
                        Restart the server after making changes.
                    </p>
                </div>
            </div>
        </div>
    );
}
