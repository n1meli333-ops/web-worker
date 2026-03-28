import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StoryGenerator from './pages/StoryGenerator';
import PreviewTasks from './pages/PreviewTasks';
import PublisherTasks from './pages/PublisherTasks';
import AdminPanel from './pages/AdminPanel';

function ProtectedRoute({ children, tab }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-brand-gray">Завантаження...</div>;
  if (!user) return <Navigate to="/login" />;
  if (tab && user.role !== 'ADMIN' && !user.tabs.includes(tab)) {
    return <Navigate to="/" />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-dark">
        <div className="animate-pulse text-brand-red text-2xl font-bold">YT Worker</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="stories"
          element={
            <ProtectedRoute tab="stories">
              <StoryGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="preview"
          element={
            <ProtectedRoute tab="preview">
              <PreviewTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="publisher"
          element={
            <ProtectedRoute tab="publisher">
              <PublisherTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute tab="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
