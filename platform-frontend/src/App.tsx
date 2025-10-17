import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import FlowsPage from './pages/FlowsPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import UsersPage from './pages/UsersPage';
import AreasPage from './pages/AreasPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="flows" element={<FlowsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="areas" element={<AreasPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
