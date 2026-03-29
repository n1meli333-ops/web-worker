import { useState, useEffect } from 'react';
import { Plus, Trash2, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const PROFILE_TYPES = ['YOUTUBE', 'CLAUDE', 'FLOW', 'ELEVENLABS', 'ASSEMBLYAI', 'GENERAL'];

export default function Profiles() {
  const [profiles, setProfiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'GENERAL', adspowerSerial: '', description: '' });

  useEffect(() => { loadProfiles(); }, []);

  const loadProfiles = async () => {
    const res = await api.get('/profiles');
    setProfiles(res.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/profiles', form);
      toast.success('Profile added');
      setShowForm(false);
      setForm({ name: '', type: 'GENERAL', adspowerSerial: '', description: '' });
      loadProfiles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this profile?')) return;
    await api.delete(`/profiles/${id}`);
    toast.success('Deleted');
    loadProfiles();
  };

  const typeColors = {
    YOUTUBE: 'bg-red-500/20 text-red-400',
    CLAUDE: 'bg-orange-500/20 text-orange-400',
    FLOW: 'bg-blue-500/20 text-blue-400',
    ELEVENLABS: 'bg-purple-500/20 text-purple-400',
    ASSEMBLYAI: 'bg-green-500/20 text-green-400',
    GENERAL: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Monitor size={24} /> Browser Profiles</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark px-4 py-2 rounded-lg text-white text-sm">
          <Plus size={16} /> Add Profile
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        AdsPower browser profiles used by the agent. Each service needs its own profile with the required accounts logged in.
      </p>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-dark-50 rounded-xl p-6 border border-dark-400 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Profile Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white">
              {PROFILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">AdsPower Serial Number</label>
            <input value={form.adspowerSerial} onChange={e => setForm({ ...form, adspowerSerial: e.target.value })}
              placeholder="e.g., 1, 2, 3..."
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg text-white text-sm">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-dark-400 px-6 py-2 rounded-lg text-gray-300 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(p => (
          <div key={p.id} className="bg-dark-50 rounded-xl p-5 border border-dark-400">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[p.type] || ''}`}>{p.type}</span>
              </div>
              <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Serial: <span className="text-gray-300 font-mono">{p.adspowerSerial}</span></p>
              {p.description && <p>{p.description}</p>}
              <p className={p.isActive ? 'text-success' : 'text-gray-500'}>{p.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
