import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Tv,
  FileText,
  Bot,
  Monitor,
  Mic,
  Settings,
  Activity,
  Image,
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import ChannelDetail from './pages/ChannelDetail';
import Prompts from './pages/Prompts';
import Profiles from './pages/Profiles';
import Voices from './pages/Voices';
import Pipelines from './pages/Pipelines';
import PipelineDetail from './pages/PipelineDetail';
import AgentSettings from './pages/AgentSettings';
import Logs from './pages/Logs';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/channels', icon: Tv, label: 'Channels' },
  { path: '/pipelines', icon: Activity, label: 'Pipelines' },
  { path: '/prompts', icon: FileText, label: 'Prompts' },
  { path: '/profiles', icon: Monitor, label: 'Browser Profiles' },
  { path: '/voices', icon: Mic, label: 'Voices' },
  { path: '/logs', icon: Bot, label: 'Agent Logs' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a2e', color: '#e0e0e0', border: '1px solid #2d3436' },
      }} />

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-dark-50 border-r border-dark-400 flex flex-col">
          <div className="p-5 border-b border-dark-400">
            <h1 className="text-xl font-bold text-accent-light flex items-center gap-2">
              <Bot size={24} />
              YT Agent
            </h1>
            <p className="text-xs text-gray-500 mt-1">Automated Content Pipeline</p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-accent/20 text-accent-light'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-300'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-dark-400 text-xs text-gray-600">
            YouTube Agent v1.0.0
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/channels/:id" element={<ChannelDetail />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/pipelines/:id" element={<PipelineDetail />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/voices" element={<Voices />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<AgentSettings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
