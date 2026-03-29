import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Tv, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [niches, setNiches] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [voices, setVoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', url: '', nicheId: '', languageId: '', voiceId: '',
    uploadFrequency: 1, videoMinLength: 20, videoMaxLength: 40,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ch, ni, la, vo] = await Promise.all([
      api.get('/channels'),
      api.get('/niches'),
      api.get('/languages'),
      api.get('/voices'),
    ]);
    setChannels(ch.data);
    setNiches(ni.data);
    setLanguages(la.data);
    setVoices(vo.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/channels', form);
      toast.success('Channel created');
      setShowForm(false);
      setForm({ name: '', url: '', nicheId: '', languageId: '', voiceId: '', uploadFrequency: 1, videoMinLength: 20, videoMaxLength: 40 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this channel?')) return;
    try {
      await api.delete(`/channels/${id}`);
      toast.success('Deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const triggerPipeline = async (channelId) => {
    try {
      await api.post('/pipelines/trigger', { channelId });
      toast.success('Pipeline triggered!');
    } catch (err) {
      toast.error('Failed to trigger pipeline');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Channels</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark px-4 py-2 rounded-lg text-white text-sm transition-colors"
        >
          <Plus size={16} /> Add Channel
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-dark-50 rounded-xl p-6 border border-dark-400 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">YouTube URL</label>
            <input
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Niche</label>
            <select
              value={form.nicheId}
              onChange={e => setForm({ ...form, nicheId: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
              required
            >
              <option value="">Select niche</option>
              {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Language</label>
            <select
              value={form.languageId}
              onChange={e => setForm({ ...form, languageId: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
              required
            >
              <option value="">Select language</option>
              {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Voice</label>
            <select
              value={form.voiceId}
              onChange={e => setForm({ ...form, voiceId: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Select voice</option>
              {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Videos per day</label>
            <input
              type="number" min="1" max="10"
              value={form.uploadFrequency}
              onChange={e => setForm({ ...form, uploadFrequency: parseInt(e.target.value) })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min video length (min)</label>
            <input
              type="number"
              value={form.videoMinLength}
              onChange={e => setForm({ ...form, videoMinLength: parseInt(e.target.value) })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max video length (min)</label>
            <input
              type="number"
              value={form.videoMaxLength}
              onChange={e => setForm({ ...form, videoMaxLength: parseInt(e.target.value) })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg text-white text-sm">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-dark-400 hover:bg-dark-300 px-6 py-2 rounded-lg text-gray-300 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(ch => (
          <div key={ch.id} className="bg-dark-50 rounded-xl p-5 border border-dark-400 hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tv size={18} className="text-accent-light" />
                <Link to={`/channels/${ch.id}`} className="font-semibold hover:text-accent-light transition-colors">
                  {ch.name}
                </Link>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${ch.isActive ? 'bg-success/20 text-success' : 'bg-gray-600/20 text-gray-500'}`}>
                {ch.isActive ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="text-sm text-gray-400 space-y-1 mb-4">
              <p>Niche: <span className="text-gray-300">{ch.niche?.name}</span></p>
              <p>Language: <span className="text-gray-300">{ch.language?.name}</span></p>
              <p>Voice: <span className="text-gray-300">{ch.voice?.name || 'Not set'}</span></p>
              <p>Frequency: <span className="text-gray-300">{ch.uploadFrequency}/day</span></p>
              <p>Videos: <span className="text-gray-300">{ch._count?.videos || 0}</span></p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => triggerPipeline(ch.id)}
                className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent-light px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                Create Video
              </button>
              <button
                onClick={() => handleDelete(ch.id)}
                className="p-1.5 hover:bg-danger/20 text-gray-400 hover:text-danger rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <p className="text-center text-gray-500 py-12">No channels yet. Click "Add Channel" to get started.</p>
      )}
    </div>
  );
}
