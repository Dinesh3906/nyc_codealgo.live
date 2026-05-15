"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Cpu, Cloud, Monitor, MessagesSquare } from "lucide-react";

const capabilities = [
  {
    title: "Vectorless RAG Architecture",
    description:
      "Advanced retrieval system specifically engineered for legal and architectural compliance, ensuring non-hallucinative, grounded results.",
    icon: Cpu,
    colSpan: "md:col-span-8",
    titleSize: "text-3xl",
    maxW: "max-w-lg",
  },
  {
    title: "113 NYC Documents",
    description: "Complete 2022 NYC Building, Fire, Mechanical, and Plumbing codes indexed for instant retrieval.",
    icon: Cloud,
    colSpan: "md:col-span-4",
    titleSize: "text-2xl",
    maxW: "",
  },
  {
    title: "Forensic Audit Engine",
    description:
      "A senior examiner logic that mimics professional NYC plan review standards with strict phase-based evaluation.",
    icon: Monitor,
    colSpan: "md:col-span-5",
    titleSize: "text-2xl",
    maxW: "",
  },
  {
    title: "Professional Reporting",
    description:
      "Generate comprehensive, legally-defensible PDF reports with specific code references and expert recommendations.",
    icon: MessagesSquare,
    colSpan: "md:col-span-7",
    titleSize: "text-3xl",
    maxW: "max-w-md",
    hasImage: true,
  },
];

export default function CapabilitiesSection() {
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
      id="services"
      ref={sectionRef}
      className="py-section-py px-6 lg:px-16 relative"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8 reveal-up">
          <div>
            <h2 className="font-headline text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] font-bold tracking-[-0.03em] text-white mb-4">
              Our Capabilities
            </h2>
            <p className="font-code text-nyc-on-surface-variant text-xl max-w-md font-light leading-relaxed">
              Tailored engineering solutions designed for scale, security, and
              exceptional user experience.
            </p>
          </div>
          <a
            href="#"
            className="font-mono text-nyc-primary hover:text-white transition-colors text-xs font-bold uppercase tracking-[0.15em] border-b border-nyc-primary/30 pb-1"
          >
            View all expertise
          </a>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className={`${cap.colSpan} glass-panel rounded-3xl p-10 flex flex-col justify-end relative overflow-hidden group reveal-up ${
                i === 0
                  ? "delay-100"
                  : i === 1
                  ? "delay-200"
                  : i === 2
                  ? "delay-100"
                  : "delay-300"
              }`}
            >
              {/* Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-nyc-primary/5 rounded-full blur-[60px] group-hover:bg-nyc-primary/10 transition-colors duration-500" />

              {/* Background image for consulting card */}
              {cap.hasImage && (
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiYjwaGaZ-aEJouqjlZ264bQDq2NT1jDtn86W0s2O5Ku6ehagBNCNTtzcWtSqUF7IQ2On4rK_qL0f2bIa8igvD94P26-aFqylJopKD5EfwnLUrxiqN-j3_GqPAijoEJuxjmjkvf5pE6ootswdbE1uJ00OIgC6mCFr5R0_6m4GNlFGm27KS2_XkGySryqNjr5-gesbLGcL9FnFi3EfodQhLxre_OT7A2W7GmH4vu9jtCyKoej6TCtGtNaH49dZrkGWio9CfpswDoBUd"
                  alt="Code texture"
                  fill
                  className="object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-500 mix-blend-luminosity"
                />
              )}

              {/* Icon */}
              <div className="mb-auto relative z-10">
                <cap.icon className="text-nyc-primary w-9 h-9" strokeWidth={1.5} />
              </div>

              {/* Text */}
              <div className="relative z-10">
                <h3
                  className={`font-headline ${cap.titleSize} font-semibold text-white mb-3 tracking-[-0.02em]`}
                >
                  {cap.title}
                </h3>
                <p
                  className={`font-code text-nyc-on-surface-variant text-base font-light leading-relaxed ${cap.maxW}`}
                >
                  {cap.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
