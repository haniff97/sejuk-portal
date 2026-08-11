import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { TECHNICIANS } from '../types/order';
import type { Technician } from '../types/order';

export default function LoginPage() {
  const { loginAs } = useRole();
  const [selectedTech, setSelectedTech] = useState<Technician>(TECHNICIANS[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side: Branding */}
        <div className="text-center md:text-left space-y-6 md:pr-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            Sejuk Sejuk Ops
          </h1>
          <p className="text-lg text-slate-600">
            Streamlined operations management for your cooling business. Select your role to continue.
          </p>
        </div>

        {/* Right side: Login Cards */}
        <div className="space-y-6">
          {/* Management Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-100/40 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2 relative">
              <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </span>
              Management
            </h2>
            <p className="text-slate-500 mb-6 text-sm relative">Access the dashboard to create, review, and close orders.</p>
            <div className="grid grid-cols-2 gap-4 relative">
              <button
                onClick={() => loginAs('Admin')}
                className="flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 font-bold rounded-2xl p-4 transition-all hover:shadow-md"
              >
                Admin
              </button>
              <button
                onClick={() => loginAs('Manager')}
                className="flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 text-slate-700 hover:text-violet-700 font-bold rounded-2xl p-4 transition-all hover:shadow-md"
              >
                Manager
              </button>
            </div>
          </div>

          {/* Technician Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-sky-100/40 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2 relative">
              <span className="bg-sky-100 text-sky-600 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
              </span>
              Technician
            </h2>
            <p className="text-slate-500 mb-6 text-sm relative">Update job status, upload photos, and mark jobs as done.</p>
            <div className="space-y-4 relative">
              <div className="relative">
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value as Technician)}
                  className="w-full appearance-none rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-inner"
                >
                  {TECHNICIANS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
              </div>
              <button
                onClick={() => loginAs('Technician', selectedTech)}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold px-6 py-3 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Continue as Technician
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
