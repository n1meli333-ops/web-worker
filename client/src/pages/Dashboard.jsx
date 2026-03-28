import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { CheckCircle, Clock, Trophy, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

const periodLabels = { day: 'Сьогодні', week: 'Тиждень', month: 'Місяць', all: 'Весь час' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [workerStats, setWorkerStats] = useState([]);
  const [rankPeriod, setRankPeriod] = useState('all');
  const [todayTasks, setTodayTasks] = useState([]);

  useEffect(() => {
    loadData();
  }, [rankPeriod]);

  const loadData = async () => {
    try {
      const [statsRes, rankRes] = await Promise.all([
        api.get('/stats/my'),
        api.get(`/stats/ranking?period=${rankPeriod}`)
      ]);
      setStats(statsRes.data.stats);
      setTodayTasks(statsRes.data.todayTasks);
      setRanking(rankRes.data);

      if (user.role === 'ADMIN') {
        const wRes = await api.get('/stats/workers');
        setWorkerStats(wRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {user.role === 'ADMIN' ? 'Панель адміністратора' : `Привіт, ${user.nickname}!`}
        </h1>
        <p className="text-brand-gray mt-1">Огляд вашої роботи та статистики</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(periodLabels).map(([key, label]) => (
            <div key={key} className="bg-brand-dark-2 rounded-xl p-5 border border-brand-dark-4">
              <div className="flex items-center gap-2 text-brand-gray mb-3">
                <Calendar size={16} />
                <span className="text-sm">{label}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-brand-red">{stats[key]?.completed || 0}</span>
                <span className="text-brand-gray text-sm mb-1">виконано</span>
              </div>
              {key === 'day' && stats[key]?.pending > 0 && (
                <div className="mt-2 flex items-center gap-1 text-yellow-500 text-sm">
                  <Clock size={14} />
                  <span>{stats[key].pending} в роботі</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ranking */}
      {ranking && (
        <div className="bg-brand-dark-2 rounded-xl p-5 border border-brand-dark-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" />
              <h2 className="text-lg font-bold">Рейтинг воркерів</h2>
            </div>
            <div className="flex gap-1">
              {Object.entries(periodLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRankPeriod(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    rankPeriod === key ? 'bg-brand-red text-white' : 'bg-brand-dark-4 text-brand-gray hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {user.role === 'ADMIN' && ranking.ranking ? (
            <div className="space-y-2">
              {ranking.ranking.map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                    i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                    i === 2 ? 'bg-orange-500/10 border border-orange-500/20' :
                    'bg-brand-dark-3'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-yellow-500 text-black' :
                      i === 1 ? 'bg-gray-400 text-black' :
                      i === 2 ? 'bg-orange-500 text-black' :
                      'bg-brand-dark-5 text-brand-gray'
                    }`}>
                      {w.rank}
                    </span>
                    <span className="font-medium">{w.nickname}</span>
                  </div>
                  <span className="text-brand-red font-bold">{w.completed} завдань</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-brand-red">{ranking.myRank}</div>
              <div className="text-brand-gray mt-1">місце з {ranking.totalWorkers}</div>
              <div className="mt-2 text-sm text-brand-gray">
                Виконано завдань: <span className="text-white font-medium">{ranking.myCompleted}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin: Worker Stats */}
      {user.role === 'ADMIN' && workerStats.length > 0 && (
        <div className="bg-brand-dark-2 rounded-xl p-5 border border-brand-dark-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-brand-red" />
            <h2 className="text-lg font-bold">Статистика воркерів</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-brand-gray border-b border-brand-dark-4">
                  <th className="text-left pb-3 pr-4">Воркер</th>
                  <th className="text-center pb-3 px-3">Сьогодні</th>
                  <th className="text-center pb-3 px-3">Тиждень</th>
                  <th className="text-center pb-3 px-3">Місяць</th>
                  <th className="text-center pb-3 pl-3">Всього</th>
                </tr>
              </thead>
              <tbody>
                {workerStats.map((w) => (
                  <tr key={w.id} className="border-b border-brand-dark-4/50">
                    <td className="py-3 pr-4 font-medium">{w.nickname}</td>
                    <td className="text-center py-3 px-3">{w.stats.day}</td>
                    <td className="text-center py-3 px-3">{w.stats.week}</td>
                    <td className="text-center py-3 px-3">{w.stats.month}</td>
                    <td className="text-center py-3 pl-3 text-brand-red font-bold">{w.stats.all}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="bg-brand-dark-2 rounded-xl p-5 border border-brand-dark-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-brand-red" />
          <h2 className="text-lg font-bold">Завдання на сьогодні</h2>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-brand-gray text-center py-6">Немає завдань на сьогодні</p>
        ) : (
          <div className="space-y-2">
            {todayTasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  task.status === 'COMPLETED' ? 'bg-brand-dark-3 task-completed' : 'bg-brand-dark-3'
                }`}
              >
                <div className="flex items-center gap-3">
                  {task.status === 'COMPLETED' ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : (
                    <Clock size={18} className="text-yellow-500" />
                  )}
                  <div>
                    <span className="font-medium">#{task.id} - {task.type.replace('_', ' ')}</span>
                    {task.niche && (
                      <span className="ml-2 text-xs bg-brand-dark-5 px-2 py-0.5 rounded text-brand-gray">
                        {task.niche.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                  task.status === 'IN_PROGRESS' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-brand-dark-5 text-brand-gray'
                }`}>
                  {task.status === 'COMPLETED' ? 'Виконано' : task.status === 'IN_PROGRESS' ? 'В роботі' : 'Очікує'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
