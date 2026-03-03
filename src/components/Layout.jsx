import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  LayoutDashboard, Users, CheckSquare, FileText,
  Kanban, Shield, LogOut, ChevronRight, AlertTriangle,
} from "lucide-react";

function buildNavItems(isAdmin) {
  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/contacts",  icon: Users,           label: "Contacts"        },
    { to: "/tasks",     icon: CheckSquare,     label: "Tâches"          },
    { to: "/notes",     icon: FileText,        label: "Notes"           },
    { to: "/pipeline",  icon: Kanban,          label: "Pipeline"        },
  ];
  if (isAdmin) {
    items.push({ to: "/admin", icon: Shield, label: "Administration" });
  }
  return items;
}

export default function Layout() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const user = accounts[0];
  const { userProfile, department, isAdmin, isUnassigned } = useUserProfile();

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() ?? "??";

  const handleLogout = () => {
    instance.logoutPopup().then(() => navigate("/login"));
  };

  const navItems = buildNavItems(isAdmin);

  return (
    <div className="flex h-screen bg-brand-light overflow-hidden font-body">

      {/* ─── Sidebar ───────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-brand-dark flex flex-col">

        {/* Logo zone */}
        <div className="px-6 pt-7 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gold flex items-center justify-center flex-shrink-0">
              <span className="text-black font-display font-black text-sm">C</span>
            </div>
            <div className="leading-tight">
              <p className="text-white font-display font-bold text-sm">Le Consortium</p>
              <p className="text-white/40 text-[10px] font-body">Mini CRM</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">
            Navigation
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-brand-gold text-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? "text-black" : "text-white/50 group-hover:text-white"} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="text-black/50" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User zone */}
        <div className="px-3 pb-3 border-t border-white/10 pt-4 flex-shrink-0">
          {/* Unassigned banner */}
          {isUnassigned && (
            <div className="flex items-center gap-2 bg-brand-amber/15 border border-brand-amber/30 rounded-xl px-3 py-2.5 mb-3">
              <AlertTriangle size={13} className="text-brand-amber flex-shrink-0" />
              <p className="text-[11px] text-brand-amber leading-tight">
                Département non assigné
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-gold font-semibold text-xs font-display">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name ?? "Utilisateur"}</p>
              <p className="text-white/40 text-[10px] truncate">{user?.username}</p>
              {department && (
                <p className="text-brand-gold/70 text-[10px] truncate mt-0.5">{department.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-white/50 hover:text-brand-red/80 hover:bg-white/5 rounded-xl transition-all duration-150"
          >
            <LogOut size={15} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ─── Main ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
