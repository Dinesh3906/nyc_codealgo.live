"use client";

import { Menu, X, Moon, Sun, AlertCircle, Lightbulb, CreditCard, LogIn, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function Navbar({ onOpenModal }: { onOpenModal: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: "Problem", href: "#problem", icon: AlertCircle },
    { label: "Solution", href: "#solution", icon: Lightbulb },
    { label: "Pricing", href: "#pricing", icon: CreditCard },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="CodeAlgo Logo" className="w-8 h-8 object-contain rounded-md" />
          <span className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            NYC House Code
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2">
            Login
          </Link>
          
          <Button onClick={onOpenModal} size="sm" className="shadow-md shadow-primary/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
          </Button>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl w-9 h-9"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-3">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl w-9 h-9"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl w-9 h-9"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md px-6 py-4 shadow-xl">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
            <div className="border-t border-border/40 pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Login
              </Link>
              <Button onClick={() => { setIsOpen(false); onOpenModal(); }} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
