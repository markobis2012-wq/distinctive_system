'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Menu, Bell, Search, LayoutDashboard, Gavel, FolderKanban, 
  Truck, Users, CalendarDays, Settings, Paperclip, ShieldCheck, 
  LogOut
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState('User');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_type_id');
    const storedUsername = localStorage.getItem('username');
    
    if (!token || userRole !== '1') {
      router.push('/login');
    } else if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: false, href: '/admin/dashboard' },
    { name: 'Directory', icon: Users, active: false, href: '/admin/directory' },
    { name: 'Bidding', icon: Gavel, active: false, href: '/admin/bidding' },
    { name: 'Projects', icon: FolderKanban, active: false, href: '#' },
    { name: 'Delivery', icon: Truck, active: false, href: '#' },
    { name: 'Site Staff', icon: Users, active: false, href: '#' },
    { name: 'Schedules', icon: CalendarDays, active: false, href: '#' },
    { name: 'Admin Controls', icon: Settings, active: false, href: '#' },
    { name: 'Attachments', icon: Paperclip, active: false, href: '#' },
    { name: 'User Maintenance', icon: ShieldCheck, active: false, href: '#' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className={`flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex h-16 items-center justify-center border-b border-slate-800 bg-slate-950">
          <span className={`font-bold text-white transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 text-xl' : 'opacity-0 hidden'}`}>DISTINCTIVE</span>
          {!isSidebarOpen && <span className="text-xl font-bold text-white tracking-widest">D</span>}
        </div>
        <div className={`flex items-center gap-3 border-b border-slate-800 p-4 ${!isSidebarOpen && 'justify-center'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white capitalize">{username}</span>
              <span className="flex items-center text-xs text-emerald-400">
                <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400"></span> Online
              </span>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href || '#'}
                  className={`flex items-center rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800 hover:text-white ${!isSidebarOpen && 'justify-center'}`}
                  title={!isSidebarOpen ? item.name : ''}
                >
                  <item.icon className="h-5 w-5 shrink-0 text-slate-400 hover:text-white" />
                  {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search records..." className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm focus:border-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>
        
        {/* THIS IS WHERE YOUR PAGES RENDER */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}