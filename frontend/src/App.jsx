import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Package,
  Download,
  Trash2,
  RefreshCcw,
  Settings,
  AlertTriangle,
  Info,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_BASE = 'http://localhost:8300/api';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [packages, setPackages] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [installQuery, setInstallQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'slate');
  const [activeTab, setActiveTab] = useState('installed');

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgs, upds] = await Promise.all([
        axios.get(`${API_BASE}/packages`),
        axios.get(`${API_BASE}/updates`)
      ]);
      setPackages(pkgs.data);
      setUpdates(upds.data);
    } catch (err) {
      notify('error', 'Failed to fetch system data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notify = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: '', message: '' }), 5000);
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/search?q=${q}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const performAction = async (endpoint, data, successMsg) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/${endpoint}`, data);
      notify('success', successMsg || res.data.message);
      await fetchData();
    } catch (err) {
      notify('error', err.response?.data?.details || `Action failed: ${endpoint}`);
    } finally {
      setLoading(false);
    }
  };

  const checkRelease = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/release-check`);
      notify('info', res.data.status);
    } catch (err) {
      notify('error', 'Release check failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <header className={cn(
        "h-16 flex items-center justify-between px-6 border-b",
        theme === 'slate' ? "bg-slate-950 border-slate-800" :
        theme === 'dark' ? "bg-black border-zinc-800" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Package size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Debian Manager</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/10">
            <button onClick={() => setTheme('light')} className={cn("p-2 rounded-full", theme === 'light' && "bg-white text-black")}>
              <Sun size={18} />
            </button>
            <button onClick={() => setTheme('dark')} className={cn("p-2 rounded-full", theme === 'dark' && "bg-zinc-700 text-white")}>
              <Moon size={18} />
            </button>
            <button onClick={() => setTheme('slate')} className={cn("p-2 rounded-full", theme === 'slate' && "bg-slate-700 text-white")}>
              <Monitor size={18} />
            </button>
          </div>
          {loading && <Loader2 className="animate-spin text-indigo-500" size={20} />}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className={cn(
          "w-64 border-r flex flex-col p-4 gap-2",
          theme === 'slate' ? "bg-slate-950 border-slate-800" :
          theme === 'dark' ? "bg-black border-zinc-800" : "bg-gray-50 border-gray-200"
        )}>
          <NavItem icon={<Package size={18} />} label="Installed" active={activeTab === 'installed'} onClick={() => setActiveTab('installed')} badge={packages.length} />
          <NavItem icon={<Download size={18} />} label="Updates" active={activeTab === 'updates'} onClick={() => setActiveTab('updates')} badge={updates.length} />
          <NavItem icon={<Search size={18} />} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />

          <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => performAction('fix', {}, 'Repaired system dependencies')}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-amber-500/10 text-amber-500 text-sm transition-colors"
            >
              <AlertTriangle size={16} /> Fix Broken
            </button>
            <button
              onClick={checkRelease}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-indigo-500/10 text-indigo-500 text-sm transition-colors"
            >
              <RefreshCcw size={16} /> Release Upgrade
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-auto p-8 max-w-6xl mx-auto w-full">
          {status.message && (
            <div className={cn(
              "mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
              status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" :
              status.type === 'error' ? "bg-rose-500/10 border-rose-500/50 text-rose-400" :
              "bg-indigo-500/10 border-indigo-500/50 text-indigo-400"
            )}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> :
               status.type === 'error' ? <XCircle size={20} /> : <Info size={20} />}
              <span className="font-medium">{status.message}</span>
            </div>
          )}

          {activeTab === 'installed' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Installed Packages</h2>
                  <p className="text-slate-400 mt-1">Manage software currently on your system</p>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Filter packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
                      theme === 'slate' ? "bg-slate-900 border-slate-700 text-white" :
                      theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200"
                    )}
                  />
                </div>
              </div>

              <div className={cn(
                "rounded-xl border overflow-hidden",
                theme === 'slate' ? "border-slate-800 bg-slate-950/50" :
                theme === 'dark' ? "border-zinc-800 bg-zinc-900/50" : "border-gray-200 bg-white"
              )}>
                <table className="w-full text-left">
                  <thead className={cn(
                    "text-xs uppercase font-semibold",
                    theme === 'light' ? "bg-gray-50 text-gray-500" : "bg-white/5 text-slate-400"
                  )}>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Version</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPackages.map(pkg => (
                      <tr key={pkg.name} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-medium">{pkg.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{pkg.version}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                            {pkg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => performAction('remove', { name: pkg.name }, `Removed ${pkg.name}`)}
                            className="p-2 text-slate-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'updates' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Available Updates</h2>
                  <p className="text-slate-400 mt-1">{updates.length} packages can be upgraded</p>
                </div>
                <button
                  disabled={updates.length === 0}
                  onClick={() => performAction('upgrade', {}, 'Full system upgrade completed')}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-lg shadow-indigo-600/20"
                >
                  <RefreshCcw size={18} /> Upgrade All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {updates.map(pkg => (
                  <div key={pkg.name} className={cn(
                    "p-6 rounded-xl border flex items-center justify-between",
                    theme === 'slate' ? "bg-slate-950 border-slate-800" :
                    theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                  )}>
                    <div>
                      <h4 className="font-bold text-lg">{pkg.name}</h4>
                      <p className="text-sm text-slate-400">New Version: <span className="text-indigo-400 font-mono">{pkg.newVersion}</span></p>
                    </div>
                    <button
                      onClick={() => performAction('install', { name: pkg.name }, `Updated ${pkg.name}`)}
                      className="p-3 bg-white/5 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-all"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'discover' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Discover Software</h2>
                <p className="text-slate-400 mt-1">Search and install new packages from repositories</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Search packages (e.g. docker, nginx, git)..."
                  onChange={(e) => handleSearch(e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 rounded-xl border-2 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg",
                    theme === 'slate' ? "bg-slate-900 border-slate-800 text-white" :
                    theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200"
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {searchResults.map(pkg => (
                  <div key={pkg.name} className={cn(
                    "p-4 rounded-xl border flex items-center justify-between group",
                    theme === 'slate' ? "bg-slate-950 border-slate-800" :
                    theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                  )}>
                    <div className="flex-1">
                      <h4 className="font-bold">{pkg.name}</h4>
                      <p className="text-sm text-slate-400 line-clamp-1">{pkg.description}</p>
                    </div>
                    <button
                      onClick={() => performAction('install', { name: pkg.name }, `Installed ${pkg.name}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all font-semibold"
                    >
                      Install
                    </button>
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery.length > 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Action Bar (Quick Install) */}
      <footer className={cn(
        "p-4 border-t",
        theme === 'slate' ? "bg-slate-950 border-slate-800" :
        theme === 'dark' ? "bg-black border-zinc-800" : "bg-white border-gray-200"
      )}>
        <div className="max-w-4xl mx-auto flex gap-4">
          <input
            type="text"
            placeholder="Quick Install/Remove (exact name)..."
            value={installQuery}
            onChange={(e) => setInstallQuery(e.target.value)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg border outline-none",
              theme === 'slate' ? "bg-slate-900 border-slate-700 text-white" :
              theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-gray-50 border-gray-200"
            )}
          />
          <button
            onClick={() => { performAction('install', { name: installQuery }, `Installed ${installQuery}`); setInstallQuery(''); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => { performAction('remove', { name: installQuery }, `Removed ${installQuery}`); setInstallQuery(''); }}
            className="px-6 py-2 border border-rose-500/50 text-rose-500 rounded-lg font-bold hover:bg-rose-500 hover:text-white transition-colors"
          >
            Remove
          </button>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all font-medium",
        active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge > 0 && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-bold",
          active ? "bg-white text-indigo-600" : "bg-indigo-500/20 text-indigo-400"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}
