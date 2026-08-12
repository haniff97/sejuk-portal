import { RoleProvider, useRole } from './context/RoleContext';
import LoginPage from './pages/LoginPage';
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
  const { role, loginAs, logout } = useRole();
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <span className="font-bold text-base sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight whitespace-nowrap shrink-0">Sejuk Sejuk Ops</span>
        <div className="flex items-center gap-2 sm:gap-4">
          {(role === 'Admin' || role === 'Manager') && (
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
              <button
                onClick={() => loginAs('Admin')}
                className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${role === 'Admin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Admin
              </button>
              <button
                onClick={() => loginAs('Manager')}
                className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${role === 'Manager' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Manager
              </button>
            </div>
          )}
          <button
            onClick={logout}
            className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all whitespace-nowrap"
          >
            Log Out
          </button>
        </div>
      </header>
      <main className="pb-12">
        <RoleRouter />
      </main>
    </div>
  );
}

function Main() {
  const { isLoggedIn } = useRole();
  return isLoggedIn ? <AppShell /> : <LoginPage />;
}

export default function App() {
  return (
    <RoleProvider>
      <Main />
    </RoleProvider>
  );
}
