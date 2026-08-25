import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bots from './pages/Bots';
import BotDetail from './pages/BotDetail';
import Tasks from './pages/Tasks';
import Smarts from './pages/Smarts';
import SmsPage from './pages/Sms';
import Logs from './pages/Logs';
import ConfigPage from './pages/Config';
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/bots" element={<Bots />} />
              <Route path="/bots/:botId" element={<BotDetail />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/smarts" element={<Smarts />} />
              <Route path="/sms" element={<SmsPage />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/config" element={<ConfigPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
