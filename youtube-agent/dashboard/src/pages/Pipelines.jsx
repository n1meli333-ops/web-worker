import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const STATUS_COLORS = {
  PENDING: 'bg-gray-500/20 text-gray-400',
  GENERATING_IDEA: 'bg-accent/20 text-accent-light',
  WRITING_STORY: 'bg-accent/20 text-accent-light',
  GENERATING_VOICE: 'bg-accent/20 text-accent-light',
  EXTRACTING_TIMESTAMPS: 'bg-accent/20 text-accent-light',
  GENERATING_VIDEO_PROMPTS: 'bg-accent/20 text-accent-light',
  GENERATING_VIDEOS: 'bg-warning/20 text-warning',
  ASSEMBLING_VIDEO: 'bg-warning/20 text-warning',
  GENERATING_THUMBNAIL: 'bg-accent/20 text-accent-light',
  PUBLISHING: 'bg-accent/20 text-accent-light',
  COMPLETED: 'bg-success/20 text-success',
  FAILED: 'bg-danger/20 text-danger',
  PAUSED: 'bg-gray-500/20 text-gray-400',
};

export default function Pipelines() {
  const [pipelines, setPipelines] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadPipelines(); }, [filter]);

  const loadPipelines = async () => {
    const params = filter ? { status: filter } : {};
    const res = await api.get('/pipelines', { params });
    setPipelines(res.data);
  };

  const retry = async (id) => {
    await api.post(`/pipelines/${id}/retry`);
    toast.success('Retrying...');
    loadPipelines();
  };

  const cancel = async (id) => {
    await api.post(`/pipelines/${id}/cancel`);
    toast.success('Cancelled');
    loadPipelines();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity size={24} /> Pipelines</h1>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-dark-50 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="space-y-3">
        {pipelines.map(p => (
          <Link key={p.id} to={`/pipelines/${p.id}`} className="block bg-dark-50 rounded-xl p-4 border border-dark-400 hover:border-accent/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{p.storyTitle || `Pipeline ${p.id.substring(0, 8)}...`}</p>
                <p className="text-sm text-gray-400">{p.channel?.name} | {new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLORS[p.status] || ''}`}>
                  {p.status.replace(/_/g, ' ')}
                </span>
                {p.status === 'FAILED' && (
                  <button onClick={(e) => { e.preventDefault(); retry(p.id); }} className="p-1 hover:bg-accent/20 rounded text-gray-400 hover:text-accent-light">
                    <RotateCcw size={14} />
                  </button>
                )}
                {!['COMPLETED', 'FAILED'].includes(p.status) && (
                  <button onClick={(e) => { e.preventDefault(); cancel(p.id); }} className="p-1 hover:bg-danger/20 rounded text-gray-400 hover:text-danger">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            </div>
            {p.error && <p className="text-xs text-danger mt-2 truncate">{p.error}</p>}
          </Link>
        ))}
        {pipelines.length === 0 && (
          <p className="text-center text-gray-500 py-12">No pipelines found</p>
        )}
      </div>
    </div>
  );
}
