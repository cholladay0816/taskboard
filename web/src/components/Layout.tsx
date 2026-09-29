import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Ticket,
  Zap,
  TerminalSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import TerminalPanel from "./TerminalPanel";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Board" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/tickets", icon: Ticket, label: "Tickets" },
];

export default function Layout() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("taskboard-sidebar-collapsed") === "true"
  );

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("taskboard-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080b14]">
      <aside className={`group relative shrink-0 bg-[#0d1220] border-r border-white/[0.06] flex flex-col transition-[width] duration-200 ease-out ${sidebarCollapsed ? "w-[4.5rem]" : "w-60"}`}>
        <div className={`h-16 flex items-center border-b border-white/[0.06] ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-5"}`}>
          <Zap className="w-5 h-5 text-blue-400" />
          {!sidebarCollapsed && <span className="text-sm font-semibold tracking-wide text-white">Taskboard</span>}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`${sidebarCollapsed ? "absolute left-12 opacity-0 group-hover:opacity-100" : "ml-auto"} rounded-md p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 transition-all`}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2.5 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-blue-400/10 text-blue-300 shadow-[inset_2px_0_0_#60a5fa]"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"
                }`
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4" />
              {!sidebarCollapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2.5 pb-2">
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-md text-sm transition-colors w-full ${
              terminalOpen
                ? "bg-blue-400/10 text-blue-300 shadow-[inset_2px_0_0_#60a5fa]"
                : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"
            }`}
            title={sidebarCollapsed ? "Terminal" : undefined}
          >
            <TerminalSquare className="w-4 h-4" />
            {!sidebarCollapsed && "Terminal"}
          </button>
        </div>

        <div className={`py-4 border-t border-white/[0.06] ${sidebarCollapsed ? "text-center" : "px-5"}`}>
          <p className="text-[10px] text-slate-600 tracking-wider uppercase">{sidebarCollapsed ? "0.6" : "v0.6.0"}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-[#080b14]">
          <Outlet />
        </main>
        <TerminalPanel
          isOpen={terminalOpen}
          onClose={() => setTerminalOpen(false)}
        />
      </div>
    </div>
  );
}
