"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-nyc-bg/90 backdrop-blur-2xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="flex justify-between items-center max-w-[1280px] mx-auto px-6 lg:px-16 h-24">
        {/* Logo */}
        <Link
          href="/"
          className="font-headline text-2xl font-bold text-white tracking-tighter flex items-center gap-2"
        >
          <span className="w-2 h-2 bg-nyc-primary rounded-full" />
          NYC Codes
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-10">
          <a
            href="#services"
            className="text-nyc-on-surface-variant hover:text-white font-code text-sm uppercase tracking-widest transition-colors duration-300"
          >
            Services
          </a>
          <a
            href="#approach"
            className="text-nyc-on-surface-variant hover:text-white font-code text-sm uppercase tracking-widest transition-colors duration-300"
          >
            Approach
          </a>
          <a
            href="#work"
            className="text-nyc-on-surface-variant hover:text-white font-code text-sm uppercase tracking-widest transition-colors duration-300"
          >
            Work
          </a>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="hidden md:flex bg-white/5 border border-white/10 text-white font-medium px-6 py-3 rounded-full hover:bg-white hover:text-nyc-bg transition-all duration-300 text-sm tracking-wide"
        >
          Get Started
        </Link>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-nyc-bg/95 backdrop-blur-2xl border-t border-white/5 px-6 py-8 space-y-6">
          <a
            href="#services"
            onClick={() => setMobileOpen(false)}
            className="block text-nyc-on-surface-variant hover:text-white font-code text-sm uppercase tracking-widest"
          >
            Services
          </a>
          <a
            href="#approach"
            onClick={() => setMobileOpen(false)}
            className="block text-nyc-on-surface-variant hover:text-white font-code text-sm uppercase tracking-widest"
          >
            Approach
          </a>
          <a
            href="#work"
            onClick={() => setMobileOpen(false)}
            className="block text-nyc-on-surface-variant hover:text-white font-code text-sm uppercase tracking-widest"
          >
            Work
          </a>
          <Link
            href="/login"
            className="block bg-white/5 border border-white/10 text-white font-medium px-6 py-3 rounded-full text-center text-sm"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
