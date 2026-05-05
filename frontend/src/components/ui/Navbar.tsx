"use client";

import { Hexagon, Menu, X, Moon, Sun, AlertCircle, Lightbulb, CreditCard, LogIn, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function Navbar({ onOpenModal }: { onOpenModal: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: "Problem", href: "#problem", icon: AlertCircle },
    { label: "Solution", href: "#solution", icon: Lightbulb },
    { label: "Pricing", href: "#pricing", icon: CreditCard },
    { label: "Login", href: "/login", icon: LogIn, isLink: true },
  ];

  return (
    <>
      {/* Fixed left sidebar - Desktop */}
      <aside className="fixed top-0 left-0 bottom-0 z-50 w-56 bg-card/90 backdrop-blur-xl border-r border-border/60 hidden lg:flex flex-col">
        <div className="p-5 border-b border-border/60">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-1.5 shadow-md shadow-primary/20">
              <Hexagon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">NYC House Code</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const El = item.isLink ? Link : 'a';
            return (
              <El
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </El>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/60 space-y-2">
          <Button onClick={onOpenModal} className="w-full shadow-md shadow-primary/20" size="sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full justify-start rounded-xl"
            >
              {theme === "dark" ? (
                <><Sun className="w-4 h-4 mr-2" /> Light Mode</>
              ) : (
                <><Moon className="w-4 h-4 mr-2" /> Dark Mode</>
              )}
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/60 lg:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-1.5">
              <Hexagon className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">NYC House Code</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button onClick={onOpenModal} size="sm" variant="default">
              Get Started
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {sidebarOpen && (
          <div className="border-t border-border/60 bg-card/95 backdrop-blur-xl p-4 shadow-xl">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const El = item.isLink ? Link : 'a';
                return (
                  <El
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </El>
                );
              })}
              {mounted && (
                <button
                  onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setSidebarOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
