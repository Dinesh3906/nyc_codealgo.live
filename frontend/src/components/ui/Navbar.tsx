"use client";

import { Menu, X, Moon, Sun, AlertCircle, Lightbulb, CreditCard, LogIn, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Image from 'next/image';
import toast from "react-hot-toast";

export default function Navbar({ onOpenModal }: { onOpenModal: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Platform", href: "#platform" },
    { label: "Workflow", href: "#workflow" },
    { label: "Compliance", href: "#compliance" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md transition-all duration-300">
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          function setupThemeToggle() {
            const btn = document.getElementById('theme-toggle-btn-desktop');
            const mobileBtn = document.getElementById('theme-toggle-btn-mobile');
            
            function syncIcons(isDarkTheme) {
              const suns = document.querySelectorAll('.theme-icon-sun');
              const moons = document.querySelectorAll('.theme-icon-moon');
              if (isDarkTheme) {
                suns.forEach(s => s.classList.remove('hidden'));
                moons.forEach(m => m.classList.add('hidden'));
              } else {
                suns.forEach(s => s.classList.add('hidden'));
                moons.forEach(m => m.classList.remove('hidden'));
              }
            }
            
            // Sync initial state on load
            const activeIsDark = document.documentElement.classList.contains('dark');
            syncIcons(activeIsDark);
            
            function toggle() {
              const isDark = document.documentElement.classList.contains('dark');
              const newTheme = isDark ? 'light' : 'dark';
              
              if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
                localStorage.setItem('theme', 'dark');
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
                localStorage.setItem('theme', 'light');
              }
              
              syncIcons(newTheme === 'dark');
            }
            
            if (btn) {
              btn.replaceWith(btn.cloneNode(true));
              const newBtn = document.getElementById('theme-toggle-btn-desktop');
              newBtn.addEventListener('click', toggle);
            }
            if (mobileBtn) {
              mobileBtn.replaceWith(mobileBtn.cloneNode(true));
              const newMobileBtn = document.getElementById('theme-toggle-btn-mobile');
              newMobileBtn.addEventListener('click', toggle);
            }
          }
          
          window.addEventListener('DOMContentLoaded', setupThemeToggle);
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setupThemeToggle();
          }
          setTimeout(setupThemeToggle, 200);
          setTimeout(setupThemeToggle, 800);
          setTimeout(setupThemeToggle, 2000);
        })();
      ` }} />
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image 
            src="/logo.png" 
            alt="NYC House Code Logo" 
            width={28} 
            height={28} 
            className="w-7 h-7 object-contain rounded-sm" 
            priority={true} 
          />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
            NYC House Code
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mr-2">
            Login
          </Link>
          
          <Button 
            onClick={onOpenModal} 
            size="sm" 
            className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 border border-primary/20 rounded-sm transition-all"
          >
            Analyze a Drawing
          </Button>

          <Button
            id="theme-toggle-btn-desktop"
            variant="outline"
            size="icon"
            className="rounded-sm w-8 h-8 bg-transparent hover:bg-muted text-foreground border-border/80 flex items-center justify-center transition-all duration-200"
            aria-label="Toggle Theme"
          >
            <span className="theme-icon-sun flex items-center justify-center"><Sun className="w-3.5 h-3.5 text-amber-500" /></span>
            <span className="theme-icon-moon hidden items-center justify-center"><Moon className="w-3.5 h-3.5 text-primary" /></span>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-3">
          <Button
            id="theme-toggle-btn-mobile"
            variant="outline"
            size="icon"
            className="rounded-sm w-8 h-8 bg-transparent hover:bg-muted text-foreground border-border/80 flex items-center justify-center transition-all duration-200"
            aria-label="Toggle Theme"
          >
            <span className="theme-icon-sun flex items-center justify-center"><Sun className="w-3.5 h-3.5 text-amber-500" /></span>
            <span className="theme-icon-moon hidden items-center justify-center"><Moon className="w-3.5 h-3.5 text-primary" /></span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-sm w-8 h-8"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md px-6 py-4 shadow-xl">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
            <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Login
              </Link>
              <Button onClick={() => { setIsOpen(false); onOpenModal(); }} className="w-full font-mono text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 border border-primary/20 rounded-sm">
                Analyze a Drawing
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
