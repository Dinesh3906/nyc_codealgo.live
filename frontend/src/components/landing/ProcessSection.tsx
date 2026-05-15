"use client";

import { useEffect, useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Plan Upload & Extraction",
    description:
      "Upload your PDF or high-resolution images. Our engine instantly extracts architectural metadata, room dimensions, and safety systems using advanced computer vision.",
    tags: ["Data Extraction", "OCR & Vision"],
  },
  {
    number: "02",
    title: "Forensic Cross-Reference",
    description:
      "Our Vectorless RAG agent queries 113 NYC Building Code chapters in real-time, matching your specific plan data against current legal mandates and safety requirements.",
    tags: ["RAG Engine", "Rule Matching"],
  },
  {
    number: "03",
    title: "Automated Compliance Report",
    description:
      "Receive a detailed forensic report with a compliance score, specific code references, and actionable recommendations from our senior AI plan examiner.",
    tags: ["PDF Export", "Forensic Verdict"],
  },
];

export default function ProcessSection() {
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
      id="approach"
      ref={sectionRef}
      className="py-section-py px-6 lg:px-16 bg-[#080c17] relative border-y border-white/5"
    >
      {/* Background blob */}
      <div className="shape-blob w-[800px] h-[800px] top-1/2 left-[-20%] -translate-y-1/2 opacity-50" />

      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          {/* Left sticky header */}
          <div className="lg:sticky lg:top-32 self-start reveal-up">
            <h2 className="font-headline text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.1] font-bold tracking-[-0.03em] text-white mb-8">
              Forensic <br />
              <span className="italic font-light text-nyc-primary">
                Precision.
              </span>
            </h2>
            <p className="font-code text-nyc-on-surface-variant text-xl font-light leading-relaxed mb-10">
              Our automated analysis pipeline is built with rigorous legal accuracy in mind. We treat every compliance check as a forensic audit, ensuring every code section is verified.
            </p>
            <button className="text-white font-mono text-xs font-bold uppercase tracking-[0.15em] border-b border-nyc-primary/50 pb-2 hover:border-nyc-primary transition-colors">
              Read our methodology
            </button>
          </div>

          {/* Right steps */}
          <div className="space-y-32">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`relative pl-10 md:pl-0 reveal-up ${
                  i === 0
                    ? "delay-100"
                    : i === 1
                    ? "delay-200"
                    : "delay-300"
                }`}
              >
                {/* Big ghost number */}
                <div className="hidden md:block absolute left-[-60px] top-0 font-headline text-8xl text-white/5 font-bold leading-none">
                  {step.number}
                </div>

                <h4 className="font-headline text-2xl font-semibold text-white mb-4 tracking-[-0.02em]">
                  {step.title}
                </h4>
                <p className="font-code text-nyc-on-surface-variant font-light leading-relaxed mb-6">
                  {step.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-4 font-mono text-xs text-nyc-primary/70">
                  {step.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-nyc-primary/5 px-3 py-1 rounded-full border border-nyc-primary/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
