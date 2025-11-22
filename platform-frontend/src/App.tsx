import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import DashboardOverview from './pages/DashboardOverview';
import SettingsPage from './pages/SettingsPage';
import ChatPage_v2 from './pages/ChatPage_v2';
import OrdersPage_v2 from './pages/OrdersPage_v2';
import UsersPage_v2 from './pages/UsersPage_v2';
import AreasPage_v2 from './pages/AreasPage_v2';
import ContactsPage from './pages/ContactsPage';
import FlowBuilder from './views/FlowBuilder/FlowBuilder';
import BotsPage from './pages/BotsPage';
import StatsPage from './pages/StatsPage';
import RemindersCalendar from './pages/RemindersCalendar';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="chat" element={<ChatPage_v2 />} />
          <Route path="orders" element={<OrdersPage_v2 />} />
          <Route path="stats" element={<StatsPage />} />
          {/* Flows y Flow Builder eliminados, ahora solo desde Bots */}
          <Route path="bots" element={<BotsPage />} />
          <Route path="users" element={<UsersPage_v2 />} />
          <Route path="areas" element={<AreasPage_v2 />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="reminders" element={<RemindersCalendar />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
