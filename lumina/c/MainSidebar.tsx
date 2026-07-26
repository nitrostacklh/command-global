"use client";

import React, { useState } from "react";
import {
  Home,
  FolderGit2,
  Binary,
  GitMerge,
  BookOpenCheck,
  LibraryBig,
  BarChart3,
  User,
  Sliders,
  Sparkles,
  LogOut,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";

export type TabId = 
  | "home"
  | "projects"
  | "workspace"
  | "timeline"
  | "learning"
  | "library"
  | "analytics"
  | "profile"
  | "settings";

interface MainSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function MainSidebar({ activeTab, onTabChange, onLogout, theme, onToggleTheme }: MainSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    { id: "home" as TabId, label: "Home", icon: <Home size={18} />, color: "group-hover:text-cyan-400" },
    { id: "projects" as TabId, label: "Projects", icon: <FolderGit2 size={18} />, color: "group-hover:text-purple-400" },
    { id: "workspace" as TabId, label: "Interactive Workspace", icon: <Binary size={18} />, color: "group-hover:text-blue-400" },
    { id: "timeline" as TabId, label: "Causal Timeline", icon: <GitMerge size={18} />, color: "group-hover:text-pink-400" },
    { id: "learning" as TabId, label: "Learning Center", icon: <BookOpenCheck size={18} />, color: "group-hover:text-emerald-400" },
    { id: "library" as TabId, label: "Design Library", icon: <LibraryBig size={18} />, color: "group-hover:text-amber-400" },
    { id: "analytics" as TabId, label: "Mistake Analytics", icon: <BarChart3 size={18} />, color: "group-hover:text-indigo-400" },
    { id: "profile" as TabId, label: "Student Profile", icon: <User size={18} />, color: "group-hover:text-teal-400" },
    { id: "settings" as TabId, label: "Preferences", icon: <Sliders size={18} />, color: "group-hover:text-slate-400" },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-4 top-4 bottom-4 z-50 flex flex-col justify-between py-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-2xl transition-all duration-500 ease-out select-none ${
        isHovered ? "w-64 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" : "w-20 shadow-[0_5px_20px_rgba(0,0,0,0.3)]"
      }`}
    >
      {/* Brand Header */}
      <div className="flex flex-col items-center px-4">
        <div className={`flex items-center gap-3 w-full transition-all duration-300 ${isHovered ? "justify-start px-2" : "justify-center"}`}>
          {/* Logo Token */}
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <div className="absolute w-6 h-6 rounded-full border border-tangent-primary" />
            <div className="absolute w-[1px] h-9 bg-tangent-secondary top-[-2px] right-[6px] transform translate-x-[2px] rotate-12" />
            <div className="absolute w-2 h-2 rounded-full bg-tangent-primary top-[6px] right-[5px] shadow-glow-cyan animate-pulse" />
          </div>
          {isHovered && (
            <div className="flex flex-col animate-fade-in">
              <span className="text-sm font-bold tracking-[0.25em] text-white">TANGENT</span>
              <span className="text-[8px] font-black text-slate-500 tracking-wider">v1.2.0-ACADEMIC</span>
            </div>
          )}
        </div>
        <div className="w-full h-[1px] bg-white/5 mt-5" />
      </div>

      {/* Navigation Menus */}
      <nav className="flex-1 flex flex-col gap-2 mt-6 px-3">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`group flex items-center rounded-xl p-3 text-xs font-semibold tracking-wide transition-all duration-300 relative cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-tangent-primary/10 to-tangent-secondary/5 text-tangent-primary border border-tangent-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
              } ${isHovered ? "justify-start gap-4 w-full" : "justify-center"}`}
            >
              {/* Highlight bar when active */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-tangent-primary shadow-glow-cyan" />
              )}
              
              <div className={`flex-shrink-0 transition-transform group-hover:scale-110 duration-300 ${isActive ? "text-tangent-primary" : "text-slate-500 group-hover:text-slate-200"}`}>
                {item.icon}
              </div>

              {isHovered && (
                <span className="animate-fade-in flex-1 text-left whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
              )}

              {/* Indicator Arrow on hover when collapsed */}
              {!isHovered && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-[#020617] border border-white/10 rounded-md text-[9px] uppercase tracking-wider text-slate-300 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout / User Info */}
      <div className="px-3 flex flex-col items-center gap-3">
        <div className="w-full h-[1px] bg-white/5" />

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`group flex items-center rounded-xl p-3 text-xs font-bold text-slate-500 hover:text-tangent-primary hover:bg-white/5 border border-transparent transition-all cursor-pointer ${
            isHovered ? "justify-start gap-4 w-full" : "justify-center"
          }`}
        >
          {theme === "dark" ? (
            <Sun size={18} className="flex-shrink-0 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon size={18} className="flex-shrink-0 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
          )}
          {isHovered && (
            <span className="animate-fade-in whitespace-nowrap text-[11px] uppercase tracking-wider text-slate-300">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
          {!isHovered && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-white/10 dark:bg-slate-900 border border-white/10 rounded-md text-[9px] uppercase tracking-wider text-slate-300 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl">
              Toggle Theme
            </div>
          )}
        </button>
        
        <button
          onClick={onLogout}
          className={`group flex items-center rounded-xl p-3 text-xs font-bold text-slate-500 hover:text-tangent-error hover:bg-tangent-error/5 border border-transparent transition-all cursor-pointer ${
            isHovered ? "justify-start gap-4 w-full" : "justify-center"
          }`}
        >
          <LogOut size={18} className="flex-shrink-0 transition-transform group-hover:translate-x-[-2px]" />
          {isHovered && (
            <span className="animate-fade-in whitespace-nowrap text-[11px] uppercase tracking-wider">
              Terminate Session
            </span>
          )}
          {!isHovered && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-tangent-error/20 border border-tangent-error/30 rounded-md text-[9px] uppercase tracking-wider text-tangent-error opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50">
              Terminate Session
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
