"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const els = sectionRef.current?.querySelectorAll(".reveal-up");
    els?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center pt-24 px-6 lg:px-16 max-w-[1600px] mx-auto"
    >
      {/* Background blob */}
      <div className="shape-blob w-[600px] h-[600px] top-[-10%] right-[-10%]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full relative z-10">
        {/* Left content */}
        <div className="lg:col-span-7 pt-20 pb-10">
          <div className="reveal-up">
            {/* Label */}
            <div className="font-mono text-nyc-primary text-xs font-bold uppercase tracking-[0.15em] mb-8 flex items-center gap-4">
              <span className="w-8 h-[1px] bg-nyc-primary" />
              Boutique Digital Craftsmanship
            </div>

            {/* Headline */}
            <h1 className="font-headline text-[clamp(3rem,8vw,6rem)] leading-[1.0] tracking-[-0.05em] font-bold mb-8 text-white">
              NYC Code <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-nyc-surface-variant italic font-light">
                Compliance.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="font-code text-nyc-on-surface-variant text-xl mb-12 max-w-xl leading-relaxed font-light">
              Instantly verify architectural plans against 113 NYC Building Code documents using our senior AI forensic plan examiner engine.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Link
                href="/login"
                className="bg-nyc-primary text-nyc-bg font-medium px-8 py-4 rounded-full hover:bg-nyc-primary-fixed transition-all duration-300 text-lg flex items-center gap-3 group"
              >
                Explore Our Craft
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="font-mono text-nyc-on-surface-variant text-xs uppercase tracking-[0.15em] font-bold opacity-60">
                Now accepting select projects
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-5 relative h-[600px] w-full hidden lg:block reveal-up delay-200">
          <div className="absolute inset-0 glass-panel rounded-3xl overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-700">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-nyc-primary/10 to-transparent z-10 mix-blend-overlay" />

            {/* Hero image */}
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLpbQM1z2mERRq4mLsYdf_VZ0IpxReqHlqrBBaTTAkKlcLnmQZoVsybiWFUFiqpfsrDMDDvDc_PuXEMOypnJg8HxMR6NlJr7bEFMUuaPEouv3_JhjsljZS6tvTJqyYyCf-m_sUeauGt5ZhbmxqE0hNUfo8hhExBrWnGLEQd08KNtMe0V2Yl1bEEyQCks2hxJOU4q8JEUelNzI_iEW3vHuZ-k9fu5BHmJ553vMy0WqLlDoY4BCswC3DcfXZB_eF0mkKwgs_UrXDQOK-"
              alt="Abstract code and architecture"
              fill
              className="object-cover opacity-60 mix-blend-luminosity"
              priority
            />

            {/* Overlay card */}
            <div className="absolute bottom-8 left-8 right-8 z-20">
              <div className="bg-nyc-bg/80 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="font-mono text-nyc-primary text-sm mb-2">
                  {"// Active Deployment"}
                </div>
                <div className="font-code text-white">
                  Enterprise Architecture System v2.4
                </div>
                <div className="w-full bg-nyc-surface-container mt-4 h-1 rounded-full overflow-hidden">
                  <div className="progress-shimmer w-3/4 h-full rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
