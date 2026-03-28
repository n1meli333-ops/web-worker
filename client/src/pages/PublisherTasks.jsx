import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Upload, CheckCircle, Clock, Eye, X, Loader2, ExternalLink } from 'lucide-react';

export default function PublisherTasks() {
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channels, setChannels] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
    api.get('/channels').then(res => setChannels(res.data)).catch(() => {});
  }, []);

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks?type=PUBLISHER');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const claimTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/claim`);
      toast.success('Завдання взято!');
      loadTasks();
    } catch (err) {
      toast.error('Помилка');
    }
  };

  const openTask = (task) => {
    setActiveTask(task);
    setPublishedUrl(task.publishedUrl || '');
    setChannelName(task.channelName || '');
  };

  const completeTask = async () => {
    if (!publishedUrl || !channelName) {
      toast.error('Заповніть всі поля');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/tasks/${activeTask.id}/complete-publish`, {
        publishedUrl,
        channelName
      });
      toast.success('Відео опубліковано!');
      setActiveTask(null);
      setPublishedUrl('');
      setChannelName('');
      loadTasks();
    } catch (err) {
      toast.error('Помилка');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Публікація відео</h1>
        <p className="text-brand-gray mt-1">Завантажуйте та публікуйте відео на YouTube</p>
      </div>

      {/* Pending Tasks */}
      <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload size={20} className="text-brand-red" />
          До публікації ({pendingTasks.length})
        </h2>

        {pendingTasks.length === 0 ? (
          <p className="text-brand-gray text-center py-6">Немає завдань для публікації</p>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-brand-dark-3 rounded-xl hover:bg-brand-dark-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-brand-red/20 text-brand-red rounded-full flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium">
                      Відео #{task.id}
                      {task.videoTitle && <span className="ml-2 text-brand-red">- {task.videoTitle}</span>}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {task.niche && (
                        <span className="text-xs bg-brand-dark-5 px-2 py-0.5 rounded text-brand-gray">
                          {task.niche.name}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        task.status === 'IN_PROGRESS' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-brand-dark-5 text-brand-gray'
                      }`}>
                        {task.status === 'IN_PROGRESS' ? 'В роботі' : 'Очікує'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === 'PENDING' && (
                    <button
                      onClick={() => claimTask(task.id)}
                      className="bg-brand-dark-5 hover:bg-brand-red/20 text-brand-gray hover:text-brand-red px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Взяти
                    </button>
                  )}
                  <button
                    onClick={() => openTask(task)}
                    className="bg-brand-red hover:bg-brand-red-light text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Eye size={14} />
                    Відкрити
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Опубліковані ({completedTasks.length})
          </h2>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-brand-dark-3 rounded-lg task-completed"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>#{task.id} - {task.videoTitle || 'Без назви'}</span>
                  <span className="text-xs text-brand-gray">{task.channelName}</span>
                </div>
                <span className="text-xs text-brand-gray">
                  {task.completedAt ? new Date(task.completedAt).toLocaleDateString('uk-UA') : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {activeTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-dark-2 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-brand-dark-4">
            <div className="flex items-center justify-between p-6 border-b border-brand-dark-4">
              <h3 className="text-lg font-bold">Публікація #{activeTask.id}</h3>
              <button onClick={() => setActiveTask(null)} className="text-brand-gray hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* All info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-dark-3 rounded-xl p-3">
                  <span className="text-xs text-brand-gray">Ніша</span>
                  <p className="font-medium">{activeTask.niche?.name || '—'}</p>
                </div>
                <div className="bg-brand-dark-3 rounded-xl p-3">
                  <span className="text-xs text-brand-gray">Назва відео</span>
                  <p className="font-medium">{activeTask.videoTitle || '—'}</p>
                </div>
              </div>

              {activeTask.videoDescription && (
                <div className="bg-brand-dark-3 rounded-xl p-4">
                  <h4 className="text-sm text-brand-gray mb-2">Опис відео:</h4>
                  <p className="text-white text-sm">{activeTask.videoDescription}</p>
                </div>
              )}

              {activeTask.thumbnailUrl && (
                <div className="bg-brand-dark-3 rounded-xl p-4">
                  <h4 className="text-sm text-brand-gray mb-2">Обкладинка:</h4>
                  <a href={activeTask.thumbnailUrl} target="_blank" rel="noreferrer"
                    className="text-brand-red hover:underline flex items-center gap-1 text-sm">
                    <ExternalLink size={14} /> Переглянути обкладинку
                  </a>
                </div>
              )}

              {activeTask.thumbnailText && (
                <div className="bg-brand-dark-3 rounded-xl p-4">
                  <h4 className="text-sm text-brand-gray mb-2">Текст обкладинки:</h4>
                  <p className="text-white text-sm">{activeTask.thumbnailText}</p>
                </div>
              )}

              {activeTask.tags && (
                <div className="bg-brand-dark-3 rounded-xl p-4">
                  <h4 className="text-sm text-brand-gray mb-2">Теги:</h4>
                  <p className="text-white text-sm">{activeTask.tags}</p>
                </div>
              )}

              {/* Publish Fields */}
              <div>
                <label className="block text-sm text-brand-gray mb-2">Канал</label>
                <select
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-red transition-colors"
                >
                  <option value="">Оберіть канал...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.name}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-brand-gray mb-2">Посилання на опубліковане відео</label>
                <input
                  type="text"
                  value={publishedUrl}
                  onChange={(e) => setPublishedUrl(e.target.value)}
                  className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red transition-colors"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <button
                onClick={completeTask}
                disabled={submitting}
                className="w-full bg-brand-red hover:bg-brand-red-light disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {submitting ? 'Публікація...' : 'Опубліковано - Готово!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
