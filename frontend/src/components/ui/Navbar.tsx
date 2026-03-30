"use client";

import { Building2, Menu, X, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function Navbar({ onOpenModal }: { onOpenModal: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${
        scrolled 
          ? "bg-background/95 backdrop-blur-sm border-border shadow-sm" 
          : "bg-background/80 backdrop-blur-sm border-transparent"
      }`}
    >
      <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary rounded-md p-1.5">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">Brickly</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#problem" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Problem</a>
          <a href="#solution" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Solution</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Login</Link>
          <Button onClick={onOpenModal} size="sm">
            Check Your Plans
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <Button onClick={onOpenModal} size="sm" variant="default">
            Join
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border p-6 md:hidden shadow-lg">
          <div className="flex flex-col gap-4">
            <a href="#problem" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Problem</a>
            <a href="#solution" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Solution</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</a>
            <div className="border-t border-border my-2" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
