import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LayoutDashboard, Users, FileText, DollarSign, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

// Stubs for the subpages
import PerguntasTab from '../components/PerguntasTab';
import PlanosTab from '../components/PlanosTab';
import AlunosTab from '../components/AlunosTab';
import FinanceiroTab from '../components/FinanceiroTab';
import ConfigTab from '../components/ConfigTab';

const NavItem = ({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, key?: React.Key, onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
      active ? "bg-primary/10 text-primary" : "text-gray-400 hover:text-white hover:bg-surface-hover"
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </Link>
);

export default function Dashboard({ user }: { user: User }) {
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth);
  };

  const navs = [
    { path: '/dashboard', label: 'Perguntas', icon: LayoutDashboard, exact: true },
    { path: '/dashboard/planos', label: 'Planos de Treino', icon: FileText },
    { path: '/dashboard/alunos', label: 'Alunos', icon: Users },
    { path: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
    { path: '/dashboard/config', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div 
        className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-30"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">FitPlan</span>
          <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-mono uppercase font-bold">Personal</span>
        </div>
        <button 
          onClick={handleLogout} 
          className="p-2 text-gray-405 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-300"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <div 
        className="md:hidden fixed left-4 right-4 z-40 bg-surface/90 backdrop-blur-xl border border-border/70 p-1.5 rounded-2xl shadow-[0_12px_44px_-10px_rgba(0,0,0,0.8)] flex justify-around items-center transition-all duration-350"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {navs.map((n, index) => {
          const Icon = n.icon;
          const isActive = n.exact 
            ? location.pathname === n.path 
            : location.pathname.startsWith(n.path);
          
          const shortLabel = n.label === 'Planos de Treino' ? 'Planos' : (n.label === 'Configurações' ? 'Config' : n.label);

          return (
            <Link
              key={n.path}
              to={n.path}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 relative flex-1 touch-target select-none",
                isActive 
                  ? "text-primary font-bold" 
                  : "text-gray-400 hover:text-white"
              )}
              style={{
                transitionDelay: `${index * 30}ms`
              }}
            >
              {isActive && (
                <span className="absolute inset-x-1.5 inset-y-1 bg-primary/10 rounded-xl animate-in scale-in duration-300 z-0" />
              )}
              
              <Icon className={cn(
                "w-5 h-5 mb-0.5 transition-transform duration-300 z-10",
                isActive ? "scale-110" : "hover:scale-105"
              )} />
              <span className="text-[10px] tracking-wide truncate max-w-full z-10 relative">
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-surface flex-col flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">FitPlan</h1>
          <p className="text-xs text-gray-400 mt-1 truncate">{user.email}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navs.map(n => (
            <NavItem 
              key={n.path} 
              to={n.path} 
              icon={n.icon} 
              label={n.label} 
              active={n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)} 
            />
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<PerguntasTab uid={user.uid} />} />
          <Route path="/planos" element={<PlanosTab uid={user.uid} />} />
          <Route path="/alunos" element={<AlunosTab uid={user.uid} />} />
          <Route path="/financeiro" element={<FinanceiroTab uid={user.uid} />} />
          <Route path="/config" element={<ConfigTab uid={user.uid} />} />
        </Routes>
      </main>
    </div>
  );
}
