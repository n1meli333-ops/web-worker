import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Sparkles, Film, Image, Send, ChevronDown, Loader2 } from 'lucide-react';

export default function StoryGenerator() {
  const [niches, setNiches] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [story, setStory] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingStocks, setGeneratingStocks] = useState(false);
  const [sending, setSending] = useState(false);
  const [promptCount, setPromptCount] = useState(100);
  const [histories, setHistories] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/niches'),
      api.get('/languages'),
      api.get('/stories')
    ]).then(([n, l, s]) => {
      setNiches(n.data);
      setLanguages(l.data);
      setHistories(s.data);
    });
  }, []);

  const generateStory = async () => {
    if (!selectedNiche || !selectedLanguage) {
      toast.error('Виберіть нішу та мову');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/stories/generate', {
        nicheId: parseInt(selectedNiche),
        languageId: parseInt(selectedLanguage)
      });
      setStory(res.data);
      toast.success('Історію згенеровано!');
    } catch (err) {
      toast.error('Помилка генерації');
    } finally {
      setGenerating(false);
    }
  };

  const generateVideoPrompts = async () => {
    if (!story) return;
    setGeneratingPrompts(true);
    try {
      const res = await api.post(`/stories/${story.id}/video-prompts`, { count: promptCount });
      setStory({ ...story, videoPrompts: res.data.videoPrompts });
      toast.success(`Згенеровано ${promptCount} промптів!`);
    } catch (err) {
      toast.error('Помилка генерації промптів');
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const findStocks = async () => {
    if (!story) return;
    setGeneratingStocks(true);
    try {
      const res = await api.post(`/stories/${story.id}/stock-keywords`);
      setStory({ ...story, stockKeywords: res.data.stockKeywords });
      toast.success('Знайдено стоки!');
    } catch (err) {
      toast.error('Помилка пошуку стоків');
    } finally {
      setGeneratingStocks(false);
    }
  };

  const sendToPreview = async () => {
    if (!story) return;
    setSending(true);
    try {
      await api.post(`/stories/${story.id}/send-to-preview`, {
        thumbnailText: story.title,
        videoDescription: story.content.substring(0, 200),
        thumbnailPrompt: `Thumbnail for: ${story.title}`
      });
      toast.success("Завдання передано прев'юверу!");
      setStory(null);
      setSelectedNiche('');
      setSelectedLanguage('');
    } catch (err) {
      toast.error('Помилка відправки');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Генератор історій</h1>
        <p className="text-brand-gray mt-1">Створюйте контент для YouTube відео</p>
      </div>

      {/* Step 1: Select niche and language */}
      <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-brand-red rounded-full flex items-center justify-center text-xs font-bold">1</span>
          Виберіть нішу та мову
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-brand-gray mb-2">Ніша</label>
            <div className="relative">
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-red transition-colors"
              >
                <option value="">Оберіть нішу...</option>
                {niches.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-brand-gray mb-2">Мова</label>
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-red transition-colors"
              >
                <option value="">Оберіть мову...</option>
                {languages.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray pointer-events-none" />
            </div>
          </div>
        </div>
        <button
          onClick={generateStory}
          disabled={generating || !selectedNiche || !selectedLanguage}
          className="mt-4 bg-brand-red hover:bg-brand-red-light disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {generating ? 'Генерація...' : 'Згенерувати історію'}
        </button>
      </div>

      {/* Step 2: Generated Story */}
      {story && (
        <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-brand-red rounded-full flex items-center justify-center text-xs font-bold">2</span>
            Згенерована історія
          </h2>
          <div className="bg-brand-dark-3 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-brand-red mb-2">{story.title}</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{story.content}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={generateVideoPrompts}
                disabled={generatingPrompts}
                className="bg-brand-dark-4 hover:bg-brand-dark-5 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                {generatingPrompts ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                Промпти для відео
              </button>
              <select
                value={promptCount}
                onChange={(e) => setPromptCount(parseInt(e.target.value))}
                className="bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-3 py-2.5 text-sm text-white appearance-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={200}>200</option>
                <option value={300}>300</option>
              </select>
            </div>

            <button
              onClick={findStocks}
              disabled={generatingStocks}
              className="bg-brand-dark-4 hover:bg-brand-dark-5 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              {generatingStocks ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
              Знайти стоки
            </button>
          </div>

          {/* Video Prompts */}
          {story.videoPrompts && (
            <div className="mt-4 bg-brand-dark-3 rounded-xl p-4">
              <h4 className="font-medium text-sm text-brand-gray mb-2">Промпти для відео (Veo 3.1):</h4>
              <div className="max-h-60 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap">
                {story.videoPrompts}
              </div>
            </div>
          )}

          {/* Stock Keywords */}
          {story.stockKeywords && (
            <div className="mt-4 bg-brand-dark-3 rounded-xl p-4">
              <h4 className="font-medium text-sm text-brand-gray mb-2">Ключові слова для стоків:</h4>
              <div className="flex flex-wrap gap-2">
                {story.stockKeywords.split(',').map((kw, i) => (
                  <span key={i} className="bg-brand-dark-5 px-3 py-1 rounded-full text-sm text-gray-300">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Send to Preview Worker */}
      {story && (story.videoPrompts || story.stockKeywords) && (
        <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-brand-red rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Передати роботу
          </h2>
          <button
            onClick={sendToPreview}
            disabled={sending}
            className="bg-brand-red hover:bg-brand-red-light disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {sending ? 'Відправка...' : "Дати роботу прев'юверу"}
          </button>
        </div>
      )}

      {/* History */}
      {histories.length > 0 && (
        <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
          <h2 className="text-lg font-semibold mb-4">Останні історії</h2>
          <div className="space-y-2">
            {histories.slice(0, 10).map(h => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-brand-dark-3 rounded-lg">
                <div>
                  <span className="font-medium">{h.title}</span>
                  <span className="ml-2 text-xs text-brand-gray">{h.niche?.name}</span>
                </div>
                <span className="text-xs text-brand-gray">
                  {new Date(h.createdAt).toLocaleDateString('uk-UA')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
