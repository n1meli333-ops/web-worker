import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const PROMPT_TYPES = [
  { value: 'story_generation', label: 'Story Generation' },
  { value: 'video_prompts', label: 'Video Prompts' },
  { value: 'thumbnail_prompt', label: 'Thumbnail' },
  { value: 'analysis', label: 'Analysis' },
];

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'story_generation', content: '', description: '', isDefault: false });

  useEffect(() => { loadPrompts(); }, []);

  const loadPrompts = async () => {
    const res = await api.get('/prompts');
    setPrompts(res.data);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/prompts/${editing}`, form);
        toast.success('Updated');
      } else {
        await api.post('/prompts', form);
        toast.success('Created');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', type: 'story_generation', content: '', description: '', isDefault: false });
      loadPrompts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleEdit = (prompt) => {
    setForm({ name: prompt.name, type: prompt.type, content: prompt.content, description: prompt.description || '', isDefault: prompt.isDefault });
    setEditing(prompt.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this prompt?')) return;
    await api.delete(`/prompts/${id}`);
    toast.success('Deleted');
    loadPrompts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prompts</h1>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', type: 'story_generation', content: '', description: '', isDefault: false }); }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark px-4 py-2 rounded-lg text-white text-sm"
        >
          <Plus size={16} /> Add Prompt
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-dark-50 rounded-xl p-6 border border-dark-400 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white">
                {PROMPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Content <span className="text-gray-600">(use {'{{IDEA}}'}, {'{{NICHE}}'}, {'{{LANGUAGE}}'}, {'{{STORY}}'}, {'{{TIMESTAMPS}}'} as variables)</span>
            </label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white h-64 font-mono text-sm" required />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded" />
            Set as default for this type
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg text-white text-sm flex items-center gap-2">
              <Save size={14} /> {editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
              className="bg-dark-400 hover:bg-dark-300 px-6 py-2 rounded-lg text-gray-300 text-sm flex items-center gap-2">
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {prompts.map(p => (
          <div key={p.id} className="bg-dark-50 rounded-xl p-4 border border-dark-400">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-light">{p.type}</span>
                  {p.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Default</span>}
                </div>
                {p.description && <p className="text-sm text-gray-400 mt-1">{p.description}</p>}
                <p className="text-xs text-gray-600 mt-2 font-mono truncate max-w-2xl">{p.content.substring(0, 150)}...</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-accent/20 text-gray-400 hover:text-accent-light rounded">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-danger/20 text-gray-400 hover:text-danger rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
