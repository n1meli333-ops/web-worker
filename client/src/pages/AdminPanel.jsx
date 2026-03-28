import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Users, FileText, Globe, FolderOpen, Tv, ScrollText, Plus, Trash2, Edit3, Save, X, Loader2 } from 'lucide-react';

const TABS = ['workers', 'prompts', 'niches', 'languages', 'channels', 'logs'];
const TAB_LABELS = {
  workers: 'Воркери',
  prompts: 'Промпти',
  niches: 'Ніші',
  languages: 'Мови',
  channels: 'Канали',
  logs: 'Логи'
};
const TAB_ICONS = {
  workers: Users,
  prompts: FileText,
  niches: FolderOpen,
  languages: Globe,
  channels: Tv,
  logs: ScrollText
};

const AVAILABLE_TABS = [
  { value: 'stories', label: 'Генератор історій' },
  { value: 'preview', label: "Прев'ю" },
  { value: 'publisher', label: 'Публікація' },
  { value: 'admin', label: 'Адмін панель' }
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('workers');

  if (user.role !== 'ADMIN') return <p className="text-brand-gray">Немає доступу</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Адмін панель</h1>
        <p className="text-brand-gray mt-1">Управління воркерами, промптами та налаштуваннями</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-brand-dark-2 rounded-xl p-1 border border-brand-dark-4 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab ? 'bg-brand-red text-white' : 'text-brand-gray hover:text-white hover:bg-brand-dark-4'
              }`}
            >
              <Icon size={16} />
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === 'workers' && <WorkersTab />}
      {activeTab === 'prompts' && <PromptsTab />}
      {activeTab === 'niches' && <NichesTab />}
      {activeTab === 'languages' && <LanguagesTab />}
      {activeTab === 'channels' && <ChannelsTab />}
      {activeTab === 'logs' && <LogsTab />}
    </div>
  );
}

function WorkersTab() {
  const [workers, setWorkers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', nickname: '', role: 'WORKER', tabs: [] });

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => {
    const res = await api.get('/users');
    setWorkers(res.data);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, form);
        toast.success('Воркера оновлено');
      } else {
        await api.post('/users', form);
        toast.success('Воркера створено');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ username: '', password: '', nickname: '', role: 'WORKER', tabs: [] });
      loadWorkers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Помилка');
    }
  };

  const editWorker = (w) => {
    setEditingId(w.id);
    setForm({ username: w.username, password: '', nickname: w.nickname, role: w.role, tabs: w.tabs });
    setShowForm(true);
  };

  const deleteWorker = async (id) => {
    if (!confirm('Видалити воркера?')) return;
    await api.delete(`/users/${id}`);
    toast.success('Видалено');
    loadWorkers();
  };

  const toggleTab = (tabValue) => {
    setForm(prev => ({
      ...prev,
      tabs: prev.tabs.includes(tabValue)
        ? prev.tabs.filter(t => t !== tabValue)
        : [...prev.tabs, tabValue]
    }));
  };

  return (
    <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Воркери ({workers.length})</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ username: '', password: '', nickname: '', role: 'WORKER', tabs: [] }); }}
          className="bg-brand-red hover:bg-brand-red-light text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
        >
          <Plus size={16} /> Додати
        </button>
      </div>

      {/* Workers List */}
      <div className="space-y-2">
        {workers.map(w => (
          <div key={w.id} className="flex items-center justify-between p-4 bg-brand-dark-3 rounded-xl">
            <div>
              <div className="font-medium">{w.nickname} <span className="text-brand-gray text-sm">(@{w.username})</span></div>
              <div className="flex gap-1 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded ${w.role === 'ADMIN' ? 'bg-brand-red/20 text-brand-red' : 'bg-brand-dark-5 text-brand-gray'}`}>
                  {w.role}
                </span>
                {w.tabs.map(t => (
                  <span key={t} className="text-xs bg-brand-dark-5 px-2 py-0.5 rounded text-brand-gray">{t}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => editWorker(w)} className="text-brand-gray hover:text-white"><Edit3 size={16} /></button>
              <button onClick={() => deleteWorker(w.id)} className="text-brand-gray hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-dark-2 rounded-2xl max-w-md w-full border border-brand-dark-4">
            <div className="flex items-center justify-between p-6 border-b border-brand-dark-4">
              <h3 className="font-bold">{editingId ? 'Редагувати' : 'Новий'} воркер</h3>
              <button onClick={() => setShowForm(false)} className="text-brand-gray hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <input
                placeholder="Логін"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                disabled={!!editingId}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red disabled:opacity-50"
              />
              <input
                placeholder={editingId ? 'Новий пароль (залиште порожнім)' : 'Пароль'}
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red"
              />
              <input
                placeholder="Нікнейм"
                value={form.nickname}
                onChange={e => setForm({ ...form, nickname: e.target.value })}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red"
              />
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red"
              >
                <option value="WORKER">Воркер</option>
                <option value="ADMIN">Адмін</option>
              </select>

              <div>
                <label className="text-sm text-brand-gray mb-2 block">Доступні вкладки:</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => toggleTab(tab.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.tabs.includes(tab.value)
                          ? 'bg-brand-red text-white'
                          : 'bg-brand-dark-4 text-brand-gray hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-brand-red hover:bg-brand-red-light text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {editingId ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromptsTab() {
  const [prompts, setPrompts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'story_generation', content: '', description: '' });

  useEffect(() => { loadPrompts(); }, []);

  const loadPrompts = async () => {
    const res = await api.get('/prompts');
    setPrompts(res.data);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await api.put(`/prompts/${editingId}`, form);
      } else {
        await api.post('/prompts', form);
      }
      toast.success(editingId ? 'Оновлено' : 'Створено');
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', type: 'story_generation', content: '', description: '' });
      loadPrompts();
    } catch (err) {
      toast.error('Помилка');
    }
  };

  const editPrompt = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, type: p.type, content: p.content, description: p.description || '' });
    setShowForm(true);
  };

  const deletePrompt = async (id) => {
    if (!confirm('Видалити промпт?')) return;
    await api.delete(`/prompts/${id}`);
    toast.success('Видалено');
    loadPrompts();
  };

  return (
    <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Промпти (воркери не бачать)</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', type: 'story_generation', content: '', description: '' }); }}
          className="bg-brand-red hover:bg-brand-red-light text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
        >
          <Plus size={16} /> Додати
        </button>
      </div>

      <div className="space-y-3">
        {prompts.map(p => (
          <div key={p.id} className="p-4 bg-brand-dark-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs bg-brand-dark-5 px-2 py-0.5 rounded text-brand-gray">{p.type}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => editPrompt(p)} className="text-brand-gray hover:text-white"><Edit3 size={16} /></button>
                <button onClick={() => deletePrompt(p.id)} className="text-brand-gray hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
            {p.description && <p className="text-sm text-brand-gray mb-2">{p.description}</p>}
            <pre className="text-xs text-gray-400 bg-brand-dark-4 p-3 rounded-lg overflow-x-auto max-h-32">{p.content}</pre>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-dark-2 rounded-2xl max-w-lg w-full border border-brand-dark-4">
            <div className="flex items-center justify-between p-6 border-b border-brand-dark-4">
              <h3 className="font-bold">{editingId ? 'Редагувати' : 'Новий'} промпт</h3>
              <button onClick={() => setShowForm(false)} className="text-brand-gray hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <input placeholder="Назва" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red">
                <option value="story_generation">Генерація історій</option>
                <option value="video_prompts">Відео промпти</option>
                <option value="thumbnail_prompt">Промпт обкладинки</option>
                <option value="stock_keywords">Ключові слова стоків</option>
              </select>
              <textarea placeholder="Контент промпта" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                rows={6}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red resize-none" />
              <input placeholder="Опис (необов'язково)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red" />
              <button onClick={handleSubmit}
                className="w-full bg-brand-red hover:bg-brand-red-light text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                <Save size={16} /> {editingId ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NichesTab() {
  const [niches, setNiches] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => { const res = await api.get('/niches'); setNiches(res.data); };

  const add = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/niches', { name: newName });
      setNewName('');
      toast.success('Нішу додано');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Помилка'); }
  };

  const remove = async (id) => {
    if (!confirm('Видалити?')) return;
    await api.delete(`/niches/${id}`);
    toast.success('Видалено');
    load();
  };

  return (
    <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
      <h2 className="text-lg font-semibold mb-4">Ніші</h2>
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Назва ніші"
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-red" />
        <button onClick={add} className="bg-brand-red hover:bg-brand-red-light text-white px-4 py-2.5 rounded-xl font-medium">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {niches.map(n => (
          <div key={n.id} className="flex items-center justify-between p-3 bg-brand-dark-3 rounded-lg">
            <span>{n.name}</span>
            <button onClick={() => remove(n.id)} className="text-brand-gray hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguagesTab() {
  const [languages, setLanguages] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => { const res = await api.get('/languages'); setLanguages(res.data); };

  const add = async () => {
    if (!name.trim() || !code.trim()) return;
    try {
      await api.post('/languages', { name, code });
      setName(''); setCode('');
      toast.success('Мову додано');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Помилка'); }
  };

  const remove = async (id) => {
    if (!confirm('Видалити?')) return;
    await api.delete(`/languages/${id}`);
    toast.success('Видалено');
    load();
  };

  return (
    <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
      <h2 className="text-lg font-semibold mb-4">Мови</h2>
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Назва мови"
          className="flex-1 bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-red" />
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Код (en, uk)"
          className="w-24 bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-red" />
        <button onClick={add} className="bg-brand-red hover:bg-brand-red-light text-white px-4 py-2.5 rounded-xl font-medium">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {languages.map(l => (
          <div key={l.id} className="flex items-center justify-between p-3 bg-brand-dark-3 rounded-lg">
            <span>{l.name} <span className="text-brand-gray text-sm">({l.code})</span></span>
            <button onClick={() => remove(l.id)} className="text-brand-gray hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelsTab() {
  const [channels, setChannels] = useState([]);
  const [niches, setNiches] = useState([]);
  const [name, setName] = useState('');
  const [nicheId, setNicheId] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    load();
    api.get('/niches').then(r => setNiches(r.data));
  }, []);
  const load = async () => { const res = await api.get('/channels'); setChannels(res.data); };

  const add = async () => {
    if (!name.trim() || !nicheId) return;
    try {
      await api.post('/channels', { name, nicheId: parseInt(nicheId), url });
      setName(''); setNicheId(''); setUrl('');
      toast.success('Канал додано');
      load();
    } catch (err) { toast.error('Помилка'); }
  };

  const remove = async (id) => {
    if (!confirm('Видалити?')) return;
    await api.delete(`/channels/${id}`);
    toast.success('Видалено');
    load();
  };

  return (
    <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
      <h2 className="text-lg font-semibold mb-4">YouTube канали</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Назва каналу"
          className="flex-1 min-w-[150px] bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-red" />
        <select value={nicheId} onChange={e => setNicheId(e.target.value)}
          className="bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-red">
          <option value="">Ніша...</option>
          {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (необов'язково)"
          className="flex-1 min-w-[150px] bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-red" />
        <button onClick={add} className="bg-brand-red hover:bg-brand-red-light text-white px-4 py-2.5 rounded-xl font-medium">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {channels.map(ch => (
          <div key={ch.id} className="flex items-center justify-between p-3 bg-brand-dark-3 rounded-lg">
            <span>{ch.name}</span>
            <button onClick={() => remove(ch.id)} className="text-brand-gray hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/logs?limit=200').then(res => {
      setLogs(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
      <h2 className="text-lg font-semibold mb-4">Логи дій</h2>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-red" /></div>
      ) : logs.length === 0 ? (
        <p className="text-brand-gray text-center py-6">Логів поки немає</p>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-brand-dark-3 rounded-lg text-sm">
              <span className="text-brand-gray whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('uk-UA')}
              </span>
              <span className="text-brand-red font-medium whitespace-nowrap">{log.user?.nickname}</span>
              <span className="text-gray-300">{log.action}</span>
              {log.details && <span className="text-brand-gray">{log.details}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
