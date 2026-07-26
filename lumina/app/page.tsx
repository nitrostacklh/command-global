"use client";

import React, { useState, useEffect, useRef } from "react";
import SplashScreen from "@/c/SplashScreen";
import AuthScreen from "@/c/AuthScreen";
import LandingReveal from "@/c/LandingReveal";
import MainSidebar, { TabId } from "@/c/MainSidebar";
import HomeTab from "@/c/HomeTab";
import WorkspaceTab from "@/c/WorkspaceTab";
import TimelineTab from "@/c/TimelineTab";
import LearningTab from "@/c/LearningTab";
import AnalyticsTab from "@/c/AnalyticsTab";
import ProfileTab from "@/c/ProfileTab";
import SettingsTab from "@/c/SettingsTab";

import InteractiveBackground from "@/c/InteractiveBackground";

export default function Home() {
  const [screen, setScreen] = useState<"splash" | "auth" | "reveal" | "app">("splash");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [theme, setTheme] = useState<"dark" | "light">("light"); // Light mode default main preference

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Sync theme class with HTML element
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  // Scroll listener to update active sidebar tab as user scrolls
  useEffect(() => {
    if (screen !== "app") return;

    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const sections: TabId[] = ["home", "workspace", "timeline", "learning", "analytics", "profile", "settings"];
      const containerScrollTop = container.scrollTop;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop - container.offsetTop;
          const height = el.offsetHeight;
          
          if (containerScrollTop >= top - 220 && containerScrollTop < top + height - 220) {
            setActiveTab(section);
            break;
          }
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [screen]);

  // Scroll smoothly to section
  const scrollToSection = (id: TabId) => {
    setActiveTab(id);
    const container = document.getElementById("main-scroll-container");
    const el = document.getElementById(id);
    if (container && el) {
      isScrollingRef.current = true;
      const targetTop = el.offsetTop - container.offsetTop;
      
      container.scrollTo({
        top: targetTop,
        behavior: "smooth"
      });

      // Release scroll block after animation finishes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 900);
    }
  };

  const handleSplashComplete = () => {
    setScreen("auth");
  };

  const handleLogin = () => {
    setScreen("reveal"); // Transition to cinematic landing reveal
  };

  const handleRevealComplete = () => {
    setScreen("app"); // Move to main application workspace
  };

  const handleLogout = () => {
    setScreen("auth");
    setActiveTab("home");
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  if (screen === "splash") {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (screen === "auth") {
    return (
      <>
        <InteractiveBackground />
        <AuthScreen onLogin={handleLogin} />
      </>
    );
  }

  if (screen === "reveal") {
    return <LandingReveal onComplete={handleRevealComplete} />;
  }

  return (
    <div className="flex h-screen w-screen bg-tangent-bg overflow-hidden text-tangent-text transition-colors duration-300">
      
      {/* 3D Interactive Backdrop */}
      <InteractiveBackground />

      {/* Floating navigation dock on the left */}
      <MainSidebar
        activeTab={activeTab}
        onTabChange={scrollToSection}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main dashboard stacked scroll wrapper (spaced past collapsed sidebar) */}
      <main className="flex-1 pl-28 flex flex-col h-full relative z-10 overflow-hidden">
        <div
          ref={scrollContainerRef}
          id="main-scroll-container"
          className="flex-1 pr-6 overflow-y-auto scrollbar-none scroll-smooth"
        >
          <div className="flex flex-col gap-24 py-12">
            
            <section id="home" className="min-h-[85vh]">
              <HomeTab onNavigateToTab={scrollToSection} />
            </section>

            <section id="workspace" className="min-h-[90vh] border-t border-tangent-border/50 pt-16">
              <WorkspaceTab onNavigateToTab={scrollToSection} />
            </section>

            <section id="timeline" className="min-h-[90vh] border-t border-tangent-border/50 pt-16">
              <TimelineTab />
            </section>

            <section id="learning" className="min-h-[85vh] border-t border-tangent-border/50 pt-16">
              <LearningTab />
            </section>

            <section id="analytics" className="min-h-[85vh] border-t border-tangent-border/50 pt-16">
              <AnalyticsTab onNavigateToTab={scrollToSection} />
            </section>

            <section id="profile" className="min-h-[85vh] border-t border-tangent-border/50 pt-16">
              <ProfileTab />
            </section>

            <section id="settings" className="min-h-[75vh] border-t border-tangent-border/50 pt-16 pb-20">
              <SettingsTab theme={theme} onToggleTheme={handleToggleTheme} />
            </section>

          </div>
        </div>
      </main>

      {/* Futuristic Ambient Blur Lights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] top-[20%] left-[10%] rounded-full bg-tangent-primary/5 blur-[120px] animate-float-slow" />
        <div className="absolute w-[500px] h-[500px] bottom-[10%] right-[5%] rounded-full bg-tangent-secondary/5 blur-[100px] animate-float-medium" />
        <div className="absolute inset-0 noise-overlay opacity-[0.015]" />
      </div>
    </div>
  );
}
