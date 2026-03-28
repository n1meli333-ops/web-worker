import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Image, CheckCircle, Clock, Eye, X, Loader2 } from 'lucide-react';

export default function PreviewTasks() {
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks?type=PREVIEW_MAKER');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const claimTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/claim`);
      toast.success('Завдання взято в роботу!');
      loadTasks();
    } catch (err) {
      toast.error('Помилка');
    }
  };

  const openTask = (task) => {
    setActiveTask(task);
    setThumbnailUrl(task.thumbnailUrl || '');
    setVideoTitle(task.videoTitle || '');
  };

  const completeTask = async () => {
    if (!thumbnailUrl || !videoTitle) {
      toast.error('Заповніть всі поля');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/tasks/${activeTask.id}/complete-preview`, {
        thumbnailUrl,
        videoTitle
      });
      toast.success("Прев'ю завершено! Завдання передано публікатору.");
      setActiveTask(null);
      setThumbnailUrl('');
      setVideoTitle('');
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
        <h1 className="text-2xl font-bold">Прев'ю завдання</h1>
        <p className="text-brand-gray mt-1">Створюйте обкладинки та назви для відео</p>
      </div>

      {/* Active Tasks */}
      <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-yellow-500" />
          Активні завдання ({pendingTasks.length})
        </h2>

        {pendingTasks.length === 0 ? (
          <p className="text-brand-gray text-center py-6">Немає активних завдань</p>
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
                      Прев'ю #{task.id}
                      {task.niche && <span className="ml-2 text-xs bg-brand-dark-5 px-2 py-0.5 rounded text-brand-gray">{task.niche.name}</span>}
                    </div>
                    <div className="text-sm text-brand-gray mt-0.5">
                      {task.thumbnailText?.substring(0, 60)}...
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

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="bg-brand-dark-2 rounded-xl p-6 border border-brand-dark-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Виконані ({completedTasks.length})
          </h2>
          <div className="space-y-2">
            {completedTasks.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-brand-dark-3 rounded-lg task-completed"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Прев'ю #{task.id} - {task.videoTitle || 'Без назви'}</span>
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
              <h3 className="text-lg font-bold">Прев'ю #{activeTask.id}</h3>
              <button onClick={() => setActiveTask(null)} className="text-brand-gray hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="bg-brand-dark-3 rounded-xl p-4">
                <h4 className="text-sm text-brand-gray mb-2">Текст на обкладинку:</h4>
                <p className="text-white">{activeTask.thumbnailText}</p>
              </div>

              <div className="bg-brand-dark-3 rounded-xl p-4">
                <h4 className="text-sm text-brand-gray mb-2">Опис під відео:</h4>
                <p className="text-white">{activeTask.videoDescription}</p>
              </div>

              <div className="bg-brand-dark-3 rounded-xl p-4">
                <h4 className="text-sm text-brand-gray mb-2">Промпт для генерації обкладинки:</h4>
                <p className="text-white">{activeTask.thumbnailPrompt}</p>
              </div>

              {/* Input Fields */}
              <div>
                <label className="block text-sm text-brand-gray mb-2">Посилання на готове прев'ю (URL)</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm text-brand-gray mb-2">Назва відео</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red transition-colors"
                  placeholder="Введіть назву відео"
                />
              </div>

              <button
                onClick={completeTask}
                disabled={submitting}
                className="w-full bg-brand-red hover:bg-brand-red-light disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {submitting ? 'Збереження...' : 'Завершити та передати публікатору'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
