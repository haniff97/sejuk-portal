import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role, Technician } from '../types/order';
import { TECHNICIANS } from '../types/order';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  technicianName: Technician;
  setTechnicianName: (name: Technician) => void;
  isLoggedIn: boolean;
  loginAs: (role: Role, technicianName?: Technician) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'sejuk-sejuk-role';
const TECH_STORAGE_KEY = 'sejuk-sejuk-technician';
const LOGGED_IN_KEY = 'sejuk-sejuk-loggedin';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(
    () => (localStorage.getItem(STORAGE_KEY) as Role) || 'Admin',
  );
  const [technicianName, setTechnicianName] = useState<Technician>(
    () => (localStorage.getItem(TECH_STORAGE_KEY) as Technician) || TECHNICIANS[0],
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    () => localStorage.getItem(LOGGED_IN_KEY) === 'true',
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem(TECH_STORAGE_KEY, technicianName);
  }, [technicianName]);

  useEffect(() => {
    localStorage.setItem(LOGGED_IN_KEY, String(isLoggedIn));
  }, [isLoggedIn]);

  const loginAs = (newRole: Role, newTechName?: Technician) => {
    setRole(newRole);
    if (newTechName) setTechnicianName(newTechName);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, technicianName, setTechnicianName, isLoggedIn, loginAs, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
