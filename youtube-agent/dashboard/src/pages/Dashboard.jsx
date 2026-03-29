import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Tv, Video, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../api/client';

function StatCard({ icon: Icon, label, value, color = 'text-accent-light' }) {
  return (
    <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className={color} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (!stats) return <div className="text-gray-400">Failed to load stats</div>;

  const { overview, channels } = stats;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Video} label="Total Videos" value={overview.totalVideos} />
        <StatCard icon={CheckCircle} label="Today" value={overview.todayVideos} color="text-success" />
        <StatCard icon={Clock} label="This Week" value={overview.weekVideos} color="text-warning" />
        <StatCard icon={Activity} label="Active Pipelines" value={overview.activePipelines} color="text-accent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Tv} label="Active Channels" value={`${overview.activeChannels}/${overview.totalChannels}`} />
        <StatCard icon={CheckCircle} label="Completed Today" value={overview.completedToday} color="text-success" />
        <StatCard icon={AlertCircle} label="Failed Today" value={overview.failedToday} color="text-danger" />
        <StatCard icon={Video} label="Weekly Avg" value={Math.round(overview.weekVideos / 7)} />
      </div>

      {/* Channels Table */}
      <h2 className="text-lg font-semibold mb-4">Channels</h2>
      <div className="bg-dark-50 rounded-xl border border-dark-400 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-400 text-sm text-gray-400">
              <th className="text-left p-4">Channel</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Videos</th>
              <th className="text-left p-4">Last Video</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.map(ch => (
              <tr key={ch.id} className="border-b border-dark-400/50 hover:bg-dark-300/30">
                <td className="p-4 font-medium">{ch.name}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 text-sm ${ch.isActive ? 'text-success' : 'text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${ch.isActive ? 'bg-success' : 'bg-gray-500'}`} />
                    {ch.isActive ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="p-4 text-gray-300">{ch.totalVideos}</td>
                <td className="p-4 text-gray-400 text-sm">
                  {ch.lastVideoAt ? new Date(ch.lastVideoAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="p-4">
                  <Link
                    to={`/channels/${ch.id}`}
                    className="text-sm text-accent hover:text-accent-light transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {channels.length === 0 && (
          <p className="p-8 text-center text-gray-500">No channels yet. Add one to get started.</p>
        )}
      </div>
    </div>
  );
}
