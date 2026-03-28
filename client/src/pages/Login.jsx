import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Успішний вхід!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-red rounded-2xl mb-4">
            <span className="text-2xl font-bold">YT</span>
          </div>
          <h1 className="text-3xl font-bold">Worker Dashboard</h1>
          <p className="text-brand-gray mt-2">Увійдіть до свого акаунту</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-brand-dark-2 rounded-2xl p-8 border border-brand-dark-4">
          <div className="mb-5">
            <label className="block text-sm font-medium text-brand-gray mb-2">Логін</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white placeholder-brand-gray/50 focus:outline-none focus:border-brand-red transition-colors"
              placeholder="Введіть логін"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-dark-3 border border-brand-dark-5 rounded-xl px-4 py-3 text-white placeholder-brand-gray/50 focus:outline-none focus:border-brand-red transition-colors pr-12"
                placeholder="Введіть пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red hover:bg-brand-red-light disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  );
}
