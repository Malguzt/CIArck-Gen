'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from './Icons';

const menuItems = [
    { name: 'Dashboard', href: '/', icon: Icons.Dashboard },
    { name: 'New Post', href: '/new', icon: Icons.Pencil },
    { name: 'Profiles', href: '/profiles', icon: Icons.Users },
    { name: 'Trends', href: '/trends', icon: Icons.Globe },
    { name: 'Settings', href: '/settings', icon: Icons.Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-screen bg-neutral-900 border-r border-neutral-800 text-white fixed left-0 top-0 flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Blog Admin
                </h1>
                <p className="text-xs text-neutral-400 mt-1">AI-Powered WordPress Manager</p>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600/10 text-blue-400'
                                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                        >
                            <item.icon />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-neutral-800">
                <div className="flex items-center space-x-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500"></div>
                    <div>
                        <p className="text-sm font-medium text-white">Admin</p>
                        <p className="text-xs text-neutral-500">Hostinger WP</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
