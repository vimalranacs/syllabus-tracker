import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  RefreshCw,
  Search,
  Menu,
  GraduationCap,
  Sparkles,
  FileDown,
  Settings,
  Shield,
  ClipboardList,
  History,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { revokeAccess } from "../../services/authService";

const bottomTabs = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/prelims", label: "Prelims", icon: BookOpen },
  { to: "/mocks", label: "Mocks", icon: ClipboardList },
  { to: "/revision", label: "Revision", icon: RefreshCw },
  { to: "/search", label: "Search", icon: Search },
];

export function MobileNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    revokeAccess();
    navigate("/login");
  };

  const moreItems = [
    { to: "/mains", label: "Mains Syllabus", icon: GraduationCap },
    { to: "/mock-history", label: "Mock History", icon: History },
    { to: "/progress", label: "Progress Analytics", icon: BarChart3 },
    { to: "/manage", label: "Manage Syllabus", icon: Sparkles },
    { to: "/import-export", label: "Import / Export", icon: FileDown },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/admin", label: "Admin Monitor", icon: Shield },
    { to: "/admin/mocks", label: "Mock Performance", icon: ClipboardList },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-30 flex items-center justify-around px-1 py-1">
        {bottomTabs.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors " +
                (isActive ? "text-pink-600 font-semibold" : "text-zinc-500 hover:text-zinc-900")
              }
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium text-zinc-500 hover:text-zinc-900"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl p-5 pb-8 space-y-2 border-t border-zinc-200 z-10 animate-in slide-in-from-bottom-5">
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-3" />
            <div className="text-xs font-bold text-zinc-400 px-3 uppercase tracking-wider mb-2">
              Navigation Menu
            </div>
            {moreItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  onClick={() => {
                    navigate(item.to);
                    setDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-pink-50 text-left"
                >
                  <Icon className="w-4 h-4 text-zinc-500" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-zinc-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Lock Application</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
