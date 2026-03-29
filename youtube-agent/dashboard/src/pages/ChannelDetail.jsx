import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Video, Activity, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function ChannelDetail() {
  const { id } = useParams();
  const [channel, setChannel] = useState(null);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorName, setCompetitorName] = useState('');

  useEffect(() => { loadChannel(); }, [id]);

  const loadChannel = async () => {
    const res = await api.get(`/channels/${id}`);
    setChannel(res.data);
  };

  const addCompetitor = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/channels/${id}/competitors`, {
        name: competitorName,
        url: competitorUrl,
        nicheId: channel.nicheId,
      });
      toast.success('Competitor added');
      setCompetitorUrl('');
      setCompetitorName('');
      loadChannel();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const removeCompetitor = async (competitorId) => {
    await api.delete(`/channels/${id}/competitors/${competitorId}`);
    loadChannel();
  };

  const triggerPipeline = async () => {
    try {
      await api.post('/pipelines/trigger', { channelId: id });
      toast.success('Pipeline triggered!');
      loadChannel();
    } catch (err) {
      toast.error('Failed');
    }
  };

  if (!channel) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <Link to="/channels" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-4">
        <ArrowLeft size={16} /> Back to channels
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{channel.name}</h1>
          <p className="text-gray-400">{channel.niche?.name} | {channel.language?.name}</p>
        </div>
        <button
          onClick={triggerPipeline}
          className="bg-accent hover:bg-accent-dark px-4 py-2 rounded-lg text-white text-sm"
        >
          Create Video Now
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
          <h2 className="font-semibold mb-4">Settings</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Voice</span><span>{channel.voice?.name || 'Not set'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Frequency</span><span>{channel.uploadFrequency}/day</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Video Length</span><span>{channel.videoMinLength}-{channel.videoMaxLength} min</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Story Prompt</span><span>{channel.storyPrompt?.name || 'Default'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Video Prompt</span><span>{channel.videoPromptsPrompt?.name || 'Default'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Thumbnail Prompt</span><span>{channel.thumbnailPrompt?.name || 'Default'}</span></div>
          </div>
        </div>

        {/* Competitors */}
        <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
          <h2 className="font-semibold mb-4">Competitors</h2>
          <div className="space-y-2 mb-4">
            {channel.competitors?.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-dark-300 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{c.url}</p>
                </div>
                <button onClick={() => removeCompetitor(c.id)} className="text-gray-400 hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {channel.competitors?.length === 0 && <p className="text-gray-500 text-sm">No competitors added</p>}
          </div>
          <form onSubmit={addCompetitor} className="flex gap-2">
            <input
              value={competitorName}
              onChange={e => setCompetitorName(e.target.value)}
              placeholder="Name"
              className="flex-1 bg-dark-300 border border-dark-400 rounded-lg px-3 py-1.5 text-sm text-white"
              required
            />
            <input
              value={competitorUrl}
              onChange={e => setCompetitorUrl(e.target.value)}
              placeholder="YouTube URL"
              className="flex-1 bg-dark-300 border border-dark-400 rounded-lg px-3 py-1.5 text-sm text-white"
              required
            />
            <button type="submit" className="bg-accent/20 hover:bg-accent/30 text-accent-light px-3 py-1.5 rounded-lg text-sm">
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* Recent Pipelines */}
        <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Activity size={16} /> Recent Pipelines</h2>
          <div className="space-y-2">
            {channel.pipelines?.map(p => (
              <Link key={p.id} to={`/pipelines/${p.id}`} className="block bg-dark-300 rounded-lg px-3 py-2 hover:bg-dark-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{p.storyTitle || p.id.substring(0, 8)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'COMPLETED' ? 'bg-success/20 text-success' :
                    p.status === 'FAILED' ? 'bg-danger/20 text-danger' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{new Date(p.createdAt).toLocaleString()}</p>
              </Link>
            ))}
            {channel.pipelines?.length === 0 && <p className="text-gray-500 text-sm">No pipelines yet</p>}
          </div>
        </div>

        {/* Recent Videos */}
        <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Video size={16} /> Recent Videos</h2>
          <div className="space-y-2">
            {channel.videos?.map(v => (
              <div key={v.id} className="bg-dark-300 rounded-lg px-3 py-2">
                <p className="text-sm font-medium">{v.title}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    v.status === 'PUBLISHED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                  }`}>
                    {v.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {channel.videos?.length === 0 && <p className="text-gray-500 text-sm">No videos yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
