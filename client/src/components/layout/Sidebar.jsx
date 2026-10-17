import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Upload, Bell, History,
  Users, FileText, Shield, LogOut, Database, Building2,
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
       transition-all duration-150
       ${isActive
         ? 'bg-brand-50 text-brand-700 shadow-soft'
         : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-brand-500 to-accent-500" />
        )}
        <Icon size={17} className={isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'} />
        <span className="flex-1">{label}</span>
        {badge > 0 && (
          <span className="bg-gradient-to-br from-brand-500 to-accent-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-soft">
            {badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

export default function Sidebar({ unreadCount = 0 }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-white border-r border-slate-200/70">

      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-soft">
            <Database size={18} className="text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-sm leading-tight tracking-tight">DDAS</p>
            <p className="text-slate-400 text-[11px] leading-tight uppercase tracking-wider font-medium">Dedup Alerts</p>
          </div>
        </div>
      </div>

      <div className="px-5 my-1"><div className="divider" /></div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2 mt-1">Main</p>
        <NavItem to="/dashboard"    icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/upload"       icon={Upload}          label="Upload File" />
        <NavItem to="/alerts"       icon={Bell}            label="Alerts" badge={unreadCount} />
        <NavItem to="/history"      icon={History}         label="File History" />
        <NavItem to="/organization" icon={Building2}       label="Organisation" />

        {isAdmin && (
          <>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider px-3 mt-5 mb-2">Admin</p>
            <NavItem to="/admin"          icon={Shield}    label="Overview" />
            <NavItem to="/admin/users"    icon={Users}     label="Users" />
            <NavItem to="/admin/files"    icon={FileText}  label="All Files" />
            <NavItem to="/admin/alerts"   icon={Bell}      label="All Alerts" />
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-200/70">
        <div className="flex items-center gap-3 px-2.5 py-2 mb-1 rounded-xl bg-gradient-to-br from-brand-50/60 to-accent-50/60 border border-brand-100/60">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shadow-soft">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-sm font-semibold truncate leading-tight">{user?.name}</p>
            <p className="text-slate-500 text-[11px] truncate mt-0.5">
              {user?.organization?.name ? user.organization.name : 'No organisation'}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-colors">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
