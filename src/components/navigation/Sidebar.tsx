import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  RefreshCw,
  Search,
  Settings,
  FileDown,
  GraduationCap,
  Shield,
  ChevronLeft,
  LogOut,
  Sparkles,
  ClipboardList,
  History
} from "lucide-react";
import { useStudyStore } from "../../store/studyStore";
import { revokeAccess } from "../../services/authService";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useStudyStore();
  const navigate = useNavigate();

  const handleSignOut = () => {
    revokeAccess();
    navigate("/login");
  };

  const navGroups = [
    {
      items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ]
    },
    {
      title: "PREPARATION",
      items: [
        { to: "/prelims", label: "Prelims", icon: BookOpen },
        { to: "/mains", label: "Mains", icon: GraduationCap },
      ]
    },
    {
      title: "MOCKS",
      items: [
        { to: "/mocks", label: "Mocks", icon: ClipboardList },
        { to: "/mock-history", label: "Mock History", icon: History },
      ]
    },
    {
      title: "TOOLS",
      items: [
        { to: "/progress", label: "Progress", icon: BarChart3 },
        { to: "/revision", label: "Revision", icon: RefreshCw },
        { to: "/search", label: "Search", icon: Search },
      ]
    },
    {
      title: "MANAGE",
      items: [
        { to: "/manage", label: "Manage Syllabus", icon: Sparkles },
        { to: "/import-export", label: "Import / Export", icon: FileDown },
      ]
    },
    {
      title: "SETTINGS",
      items: [
        { to: "/settings", label: "Settings", icon: Settings },
      ]
    },
    {
      title: "ADMIN",
      items: [
        { to: "/admin", label: "Overview", icon: Shield },
        { to: "/admin/mocks", label: "Mock Performance", icon: ClipboardList },
      ]
    }
  ];

  return (
    <aside
      className={"fixed top-0 left-0 h-full bg-white border-r border-zinc-200 z-30 flex flex-col transition-all duration-300 " +
        (collapsed ? "w-16" : "w-64")}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              RO
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 tracking-tight leading-tight">UPPSC RO/ARO</div>
              <div className="text-[11px] text-pink-600 font-medium">Study Tracker</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className={"p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors " +
            (collapsed ? "mx-auto" : "")}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={"w-4 h-4 transition-transform duration-300 " + (collapsed ? "rotate-180" : "")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {!collapsed && group.title && (
              <div className="px-3 mb-1.5 text-[10px] font-bold text-zinc-400 tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all " +
                      (isActive
                        ? "bg-pink-50 text-pink-600 font-semibold "
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 ") +
                      (collapsed ? "justify-center px-0" : "")
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-100">
        {!collapsed && (
          <div className="mb-2 px-2">
            <div className="text-xs font-medium text-zinc-900 truncate">
              {user?.displayName || "Candidate"}
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Cloud Sync Active
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={"w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors " +
            (collapsed ? "justify-center px-0" : "")}
          title="Lock / Exit Tracker"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Lock Application</span>}
        </button>
      </div>
    </aside>
  );
}
