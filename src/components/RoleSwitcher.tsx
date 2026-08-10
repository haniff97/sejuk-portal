import { useRole } from '../context/RoleContext';
import { TECHNICIANS } from '../types/order';
import type { Role } from '../types/order';

const ROLES: Role[] = ['Admin', 'Technician', 'Manager'];

export default function RoleSwitcher() {
  const { role, setRole, technicianName, setTechnicianName } = useRole();

  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-slate-400">Viewing as</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {role === 'Technician' && (
        <select
          value={technicianName}
          onChange={(e) => setTechnicianName(e.target.value as typeof technicianName)}
          className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100"
        >
          {TECHNICIANS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
