import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../api/client';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ level: '', source: '' });

  useEffect(() => { loadLogs(); }, [filter]);

  const loadLogs = async () => {
    const params = {};
    if (filter.level) params.level = filter.level;
    if (filter.source) params.source = filter.source;
    const res = await api.get('/logs', { params });
    setLogs(res.data);
  };

  const levelColors = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-gray-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agent Logs</h1>
        <div className="flex items-center gap-3">
          <select value={filter.level} onChange={e => setFilter({ ...filter, level: e.target.value })}
            className="bg-dark-50 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
          <select value={filter.source} onChange={e => setFilter({ ...filter, source: e.target.value })}
            className="bg-dark-50 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All sources</option>
            <option value="pipeline">Pipeline</option>
            <option value="browser">Browser</option>
            <option value="claude">Claude</option>
            <option value="youtube">YouTube</option>
          </select>
          <button onClick={loadLogs} className="p-2 hover:bg-dark-300 rounded-lg text-gray-400">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="bg-dark-50 rounded-xl border border-dark-400 overflow-hidden">
        <div className="divide-y divide-dark-400/50">
          {logs.map(log => (
            <div key={log.id} className="px-4 py-3 hover:bg-dark-300/30 font-mono text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-xs w-40 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <span className={`w-12 shrink-0 ${levelColors[log.level] || 'text-gray-400'}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-gray-500 w-20 shrink-0">[{log.source}]</span>
                <span className="text-gray-300 truncate">{log.message}</span>
              </div>
              {log.details && (
                <pre className="text-xs text-gray-600 mt-1 ml-72 truncate">
                  {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                </pre>
              )}
            </div>
          ))}
        </div>
        {logs.length === 0 && <p className="p-8 text-center text-gray-500">No logs found</p>}
      </div>
    </div>
  );
}
