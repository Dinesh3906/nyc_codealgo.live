"use client";

import { Menu, X, Moon, Sun, AlertCircle, Lightbulb, CreditCard, LogIn, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Image from 'next/image';
import { usePathname } from "next/navigation";

export default function Navbar({ onOpenModal }: { onOpenModal: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  const pathname = usePathname();
  const hideThemeToggle = pathname === '/terms-of-service' || pathname === '/privacy-policy';

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: "Platform", href: "/#platform" },
    { label: "Workflow", href: "/#workflow" },
    { label: "Compliance", href: "/#compliance" },
    { label: "Pricing", href: "/#pricing" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md transition-all duration-300">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image 
            src="/logo.png" 
            alt="PermitIQ Logo" 
            width={28} 
            height={28} 
            className="w-7 h-7 object-contain rounded-sm" 
            priority={true} 
          />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
            PermitIQ
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
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

          {!hideThemeToggle && (
            <Button
              id="theme-toggle-btn-desktop"
              variant="outline"
              size="icon"
              className="rounded-sm w-8 h-8 bg-transparent hover:bg-muted text-foreground border-border/80 flex items-center justify-center transition-all duration-200"
              aria-label="Toggle Theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {!mounted || theme !== 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-primary" />
              )}
            </Button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-3">
          {!hideThemeToggle && (
            <Button
              id="theme-toggle-btn-mobile"
              variant="outline"
              size="icon"
              className="rounded-sm w-8 h-8 bg-transparent hover:bg-muted text-foreground border-border/80 flex items-center justify-center transition-all duration-200"
              aria-label="Toggle Theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {!mounted || theme !== 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-primary" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-sm w-8 h-8"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <nav id="mobile-menu" aria-label="Mobile Navigation" className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md px-6 py-4 shadow-xl">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
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
        </nav>
      )}
    </header>
  );
}
