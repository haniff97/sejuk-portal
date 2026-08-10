import { RoleProvider, useRole } from './context/RoleContext';
import RoleSwitcher from './components/RoleSwitcher';
import AdminPage from './pages/AdminPage';
import TechnicianPage from './pages/TechnicianPage';
import ManagerPage from './pages/ManagerPage';

function RoleRouter() {
  const { role } = useRole();
  if (role === 'Admin') return <AdminPage />;
  if (role === 'Technician') return <TechnicianPage />;
  return <ManagerPage />;
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-slate-100">Sejuk Sejuk Ops</span>
        <RoleSwitcher />
      </header>
      <RoleRouter />
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <AppShell />
    </RoleProvider>
  );
}
