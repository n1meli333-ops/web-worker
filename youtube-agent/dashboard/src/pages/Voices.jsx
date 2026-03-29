import { useState, useEffect } from 'react';
import { Plus, Trash2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function Voices() {
  const [voices, setVoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', language: '', description: '' });

  useEffect(() => { loadVoices(); }, []);

  const loadVoices = async () => {
    const res = await api.get('/voices');
    setVoices(res.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/voices', form);
      toast.success('Voice added');
      setShowForm(false);
      setForm({ name: '', language: '', description: '' });
      loadVoices();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/voices/${id}`);
    loadVoices();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Mic size={24} /> Voices</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark px-4 py-2 rounded-lg text-white text-sm">
          <Plus size={16} /> Add Voice
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-dark-50 rounded-xl p-6 border border-dark-400 mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Voice Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Deep Male, Soft Female"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Language</label>
            <input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
              placeholder="e.g., Ukrainian, English"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" />
          </div>
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg text-white text-sm">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-dark-400 px-6 py-2 rounded-lg text-gray-300 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {voices.map(v => (
          <div key={v.id} className="bg-dark-50 rounded-xl p-5 border border-dark-400">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium flex items-center gap-2"><Mic size={16} className="text-accent-light" /> {v.name}</p>
                <p className="text-sm text-gray-400 mt-1">{v.language || 'No language set'}</p>
                {v.description && <p className="text-sm text-gray-500 mt-1">{v.description}</p>}
              </div>
              <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {voices.length === 0 && <p className="text-center text-gray-500 py-12">No voices. Add the voice names you use in ElevenLabs.</p>}
    </div>
  );
}
