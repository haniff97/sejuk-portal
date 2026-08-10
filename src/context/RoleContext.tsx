import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role, Technician } from '../types/order';
import { TECHNICIANS } from '../types/order';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  technicianName: Technician;
  setTechnicianName: (name: Technician) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'sejuk-sejuk-role';
const TECH_STORAGE_KEY = 'sejuk-sejuk-technician';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(
    () => (localStorage.getItem(STORAGE_KEY) as Role) || 'Admin',
  );
  const [technicianName, setTechnicianName] = useState<Technician>(
    () => (localStorage.getItem(TECH_STORAGE_KEY) as Technician) || TECHNICIANS[0],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem(TECH_STORAGE_KEY, technicianName);
  }, [technicianName]);

  return (
    <RoleContext.Provider value={{ role, setRole, technicianName, setTechnicianName }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
