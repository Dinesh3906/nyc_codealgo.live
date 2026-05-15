"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="w-full bg-white text-nyc-bg py-32 px-6 lg:px-16 relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto relative z-10">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
          {/* CTA */}
          <div className="md:col-span-6">
            <h2 className="font-headline text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-8 leading-tight text-nyc-bg tracking-[-0.03em]">
              Audit with <br />
              <span className="text-nyc-primary-fixed-dim">confidence.</span>
            </h2>
            <Link
              href="/login"
              className="inline-flex bg-nyc-bg text-white font-medium px-10 py-5 rounded-full hover:bg-nyc-surface-variant transition-all duration-300 text-lg items-center gap-3"
            >
              Start Forensic Check
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Links */}
          <div className="md:col-span-6 grid grid-cols-2 gap-8 md:pl-20 pt-4">
            <div>
              <h4 className="font-mono text-nyc-bg/50 text-xs font-bold uppercase tracking-[0.15em] mb-6">
                Expertise
              </h4>
              <ul className="space-y-4 font-code text-nyc-bg/80">
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Forensic Compliance
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    NYC Building Codes
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Vectorless RAG
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Report Generation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-nyc-bg/50 text-xs font-bold uppercase tracking-[0.15em] mb-6">
                Studio
              </h4>
              <ul className="space-y-4 font-code text-nyc-bg/80">
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Our Approach
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Selected Work
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-nyc-primary-fixed-dim transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-nyc-bg/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-headline text-2xl font-bold tracking-tighter flex items-center gap-2">
            <span className="w-2 h-2 bg-nyc-primary-fixed-dim rounded-full" />
            NYC Codes
          </div>
          <div className="text-nyc-bg/50 font-mono text-sm">
            © {new Date().getFullYear()} NYC Codes Engineering. Crafted in New
            York.
          </div>
        </div>
      </div>
    </footer>
  );
}
