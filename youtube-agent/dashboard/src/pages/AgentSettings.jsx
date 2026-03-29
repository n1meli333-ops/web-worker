import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function AgentSettings() {
  const [settings, setSettings] = useState({});
  const [niches, setNiches] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [newNiche, setNewNiche] = useState('');
  const [newLang, setNewLang] = useState({ name: '', code: '' });

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/niches'),
      api.get('/languages'),
    ]).then(([s, n, l]) => {
      setSettings(s.data);
      setNiches(n.data);
      setLanguages(l.data);
    });
  }, []);

  const saveSettings = async () => {
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed');
    }
  };

  const addNiche = async (e) => {
    e.preventDefault();
    if (!newNiche) return;
    await api.post('/niches', { name: newNiche });
    setNewNiche('');
    const res = await api.get('/niches');
    setNiches(res.data);
    toast.success('Niche added');
  };

  const deleteNiche = async (id) => {
    await api.delete(`/niches/${id}`);
    setNiches(niches.filter(n => n.id !== id));
  };

  const addLanguage = async (e) => {
    e.preventDefault();
    if (!newLang.name || !newLang.code) return;
    await api.post('/languages', newLang);
    setNewLang({ name: '', code: '' });
    const res = await api.get('/languages');
    setLanguages(res.data);
    toast.success('Language added');
  };

  const deleteLanguage = async (id) => {
    await api.delete(`/languages/${id}`);
    setLanguages(languages.filter(l => l.id !== id));
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Agent Settings */}
      <div className="bg-dark-50 rounded-xl p-6 border border-dark-400">
        <h2 className="font-semibold mb-4">Agent Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">AdsPower URL</label>
            <input value={settings.adspower_url || ''} onChange={e => updateSetting('adspower_url', e.target.value)}
              placeholder="http://local.adspower.net:50325"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Scheduler Cron</label>
            <input value={settings.scheduler_cron || ''} onChange={e => updateSetting('scheduler_cron', e.target.value)}
              placeholder="0 */1 * * * (every hour)"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Telegram Bot Token</label>
            <input value={settings.telegram_bot_token || ''} onChange={e => updateSetting('telegram_bot_token', e.target.value)}
              type="password" placeholder="Bot token from @BotFather"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Telegram Chat ID</label>
            <input value={settings.telegram_chat_id || ''} onChange={e => updateSetting('telegram_chat_id', e.target.value)}
              placeholder="Your Telegram chat ID"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Flow Script URL</label>
            <input value={settings.flow_script_url || ''} onChange={e => updateSetting('flow_script_url', e.target.value)}
              placeholder="URL to Flow video generation script"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ElevenLabs Site URL</label>
            <input value={settings.elevenlabs_site_url || ''} onChange={e => updateSetting('elevenlabs_site_url', e.target.value)}
              placeholder="URL to ElevenLabs (or third-party)"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">AssemblyAI API Key (optional)</label>
            <input value={settings.assemblyai_api_key || ''} onChange={e => updateSetting('assemblyai_api_key', e.target.value)}
              type="password" placeholder="If empty, will use browser"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Output Directory</label>
            <input value={settings.output_dir || ''} onChange={e => updateSetting('output_dir', e.target.value)}
              placeholder="./output"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
        </div>
        <button onClick={saveSettings} className="mt-4 bg-accent hover:bg-accent-dark px-6 py-2 rounded-lg text-white text-sm flex items-center gap-2">
          <Save size={14} /> Save Settings
        </button>
      </div>

      {/* Niches */}
      <div className="bg-dark-50 rounded-xl p-6 border border-dark-400">
        <h2 className="font-semibold mb-4">Niches</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {niches.map(n => (
            <span key={n.id} className="bg-dark-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              {n.name}
              <button onClick={() => deleteNiche(n.id)} className="text-gray-500 hover:text-danger"><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
        <form onSubmit={addNiche} className="flex gap-2">
          <input value={newNiche} onChange={e => setNewNiche(e.target.value)} placeholder="New niche name"
            className="bg-dark-300 border border-dark-400 rounded-lg px-3 py-1.5 text-sm text-white" />
          <button type="submit" className="bg-accent/20 hover:bg-accent/30 text-accent-light px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} />
          </button>
        </form>
      </div>

      {/* Languages */}
      <div className="bg-dark-50 rounded-xl p-6 border border-dark-400">
        <h2 className="font-semibold mb-4">Languages</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {languages.map(l => (
            <span key={l.id} className="bg-dark-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              {l.name} ({l.code})
              <button onClick={() => deleteLanguage(l.id)} className="text-gray-500 hover:text-danger"><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
        <form onSubmit={addLanguage} className="flex gap-2">
          <input value={newLang.name} onChange={e => setNewLang({ ...newLang, name: e.target.value })} placeholder="Language name"
            className="bg-dark-300 border border-dark-400 rounded-lg px-3 py-1.5 text-sm text-white" />
          <input value={newLang.code} onChange={e => setNewLang({ ...newLang, code: e.target.value })} placeholder="Code (uk, en)"
            className="bg-dark-300 border border-dark-400 rounded-lg px-3 py-1.5 text-sm text-white w-24" />
          <button type="submit" className="bg-accent/20 hover:bg-accent/30 text-accent-light px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
