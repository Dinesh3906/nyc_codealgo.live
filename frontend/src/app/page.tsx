import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-ld-background text-ld-on-surface">
      {/* Ambient Background Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-ld-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-ld-secondary/5 blur-[120px]" />
        <div className="absolute inset-0 cyber-grid z-0" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-ld-surface/60 backdrop-blur-xl border-b border-white/10">
        <div className="flex justify-between items-center px-6 md:px-16 py-4 max-w-7xl mx-auto">
          {/* Brand */}
          <Link
            className="font-bold text-ld-primary tracking-tighter flex items-center gap-2 text-lg"
            href="#"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
            NYC CODES
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link className="text-ld-on-surface-variant text-sm font-medium hover:text-ld-primary transition-colors duration-300" href="#">Features</Link>
            <Link className="text-ld-on-surface-variant text-sm font-medium hover:text-ld-primary transition-colors duration-300" href="#">The Grid</Link>
            <Link className="text-ld-on-surface-variant text-sm font-medium hover:text-ld-primary transition-colors duration-300" href="#">Solutions</Link>
            <Link className="text-ld-on-surface-variant text-sm font-medium hover:text-ld-primary transition-colors duration-300" href="#how-it-works">How It Works</Link>
          </div>

          {/* CTA */}
          <Link
            className="hidden md:inline-flex btn-cyber bg-ld-primary text-ld-on-primary text-xs font-bold tracking-widest uppercase px-5 py-2.5 items-center justify-center hover:bg-ld-primary-fixed transition-colors"
            href="/login"
          >
            Get Started
          </Link>

          {/* Mobile Toggle */}
          <button className="md:hidden text-ld-on-surface p-2">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      <main className="relative z-10 pt-[80px]">
        {/* ─── Hero ─── */}
        <section className="px-6 md:px-16 py-28 max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-ld-surface-container-high border border-white/10 px-4 py-2 mb-8 rounded-sm">
            <span className="w-2 h-2 rounded-full bg-ld-primary animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-ld-on-surface-variant">
              Built for NYC Architects &amp; Developers
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-ld-on-surface mb-6 max-w-4xl mx-auto leading-tight">
            AI-Powered DOB Compliance
            <br />
            <span className="text-ld-primary glow-text-ld-primary">Before You Submit</span>
          </h1>

          <p className="text-lg text-ld-on-surface-variant max-w-2xl mx-auto mb-12">
            Upload your plans and get instant compliance checks against NYC Department of Buildings codes. Reduce rejections. Save weeks.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              className="btn-cyber bg-ld-primary text-ld-on-primary text-sm font-bold tracking-widest uppercase px-8 py-4 flex items-center justify-center gap-2 hover:bg-ld-primary-fixed transition-colors"
              href="/login"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Check Your Plans
            </Link>
            <Link
              className="btn-cyber bg-ld-surface-container border border-white/10 text-ld-on-surface text-sm font-bold tracking-widest uppercase px-8 py-4 flex items-center justify-center gap-2 hover:border-ld-primary/50 transition-colors"
              href="#how-it-works"
            >
              See How It Works
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* ─── The Problem ─── */}
        <section className="px-6 md:px-16 py-24 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-ld-secondary border border-ld-secondary/20 bg-ld-secondary/5 px-3 py-1 rounded">
              The Problem
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-ld-on-surface mt-6">
              DOB Rejections Cost <span className="text-ld-secondary glow-text-ld-secondary">Time &amp; Money</span>
            </h2>
            <p className="text-ld-on-surface-variant mt-4 max-w-2xl mx-auto">
              Submitting plans to the NYC DOB can be slow, complex, and frustrating. Small compliance issues lead to rejections, delays, and costly revisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 relative corner-brackets hover:glass-card-glow transition-shadow duration-300">
              <div className="w-12 h-12 rounded bg-ld-tertiary/10 flex items-center justify-center text-ld-tertiary mb-6 border border-ld-tertiary/20">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <h3 className="text-xl font-bold text-ld-on-surface mb-3">Manual code checks take hours</h3>
              <p className="text-ld-on-surface-variant text-sm">Sifting through thousands of pages of NYC DOB codes is slow and prone to human error.</p>
            </div>

            <div className="glass-card p-8 relative corner-brackets hover:glass-card-glow transition-shadow duration-300">
              <div className="w-12 h-12 rounded bg-ld-secondary/10 flex items-center justify-center text-ld-secondary mb-6 border border-ld-secondary/20">
                <span className="material-symbols-outlined">error</span>
              </div>
              <h3 className="text-xl font-bold text-ld-on-surface mb-3">Errors are easy to miss</h3>
              <p className="text-ld-on-surface-variant text-sm">A single missing detail can trigger a rejection, forcing you to restart the entire submission process.</p>
            </div>

            <div className="glass-card p-8 relative corner-brackets hover:glass-card-glow transition-shadow duration-300">
              <div className="w-12 h-12 rounded bg-ld-primary/10 flex items-center justify-center text-ld-primary mb-6 border border-ld-primary/20">
                <span className="material-symbols-outlined">attach_money</span>
              </div>
              <h3 className="text-xl font-bold text-ld-on-surface mb-3">Back-and-forth delays projects</h3>
              <p className="text-ld-on-surface-variant text-sm">Every rejection costs thousands in extra fees and weeks of project delays.</p>
            </div>
          </div>
        </section>

        {/* ─── The Solution ─── */}
        <section className="px-6 md:px-16 py-24 max-w-7xl mx-auto border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-ld-primary border border-ld-primary/20 bg-ld-primary/5 px-3 py-1 rounded">
                The Solution
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-ld-on-surface mt-6 leading-tight">
                Your <span className="text-ld-primary glow-text-ld-primary">AI Compliance Assistant</span>
              </h2>
              <p className="text-ld-on-surface-variant mt-6 mb-8">
                NYC House Code analyzes your architectural plans in seconds and flags potential DOB compliance issues before submission.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Upload PDFs or images',
                  'AI scans against DOB rules',
                  'Get clear, actionable feedback',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-ld-primary mt-0.5">check_circle</span>
                    <span className="text-ld-on-surface">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                className="inline-flex btn-cyber bg-ld-primary/10 border border-ld-primary text-ld-primary text-sm font-bold tracking-widest uppercase px-6 py-3 items-center justify-center gap-2 hover:bg-ld-primary/20 transition-colors"
                href="/login"
              >
                Learn More About Our AI
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            {/* UI Mockup */}
            <div className="glass-card p-6 border border-white/10 relative corner-brackets shadow-[0_0_40px_rgba(78,222,163,0.15)] md:rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <span className="w-3 h-3 rounded-full bg-ld-error" />
                <span className="w-3 h-3 rounded-full bg-ld-tertiary" />
                <span className="w-3 h-3 rounded-full bg-ld-primary" />
                <span className="font-mono text-xs text-ld-on-surface-variant ml-4">Compliance Scan in Progress...</span>
              </div>
              <div className="space-y-4">
                <div className="h-1 w-full bg-ld-surface-container-high rounded overflow-hidden">
                  <div className="h-full bg-ld-primary w-[85%] relative">
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
                <div className="bg-ld-primary/5 border border-ld-primary/30 p-4 rounded-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-ld-primary text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-ld-primary">Rule AC-201: Compliant</h4>
                    <p className="font-mono text-xs text-ld-on-surface-variant mt-1">Standard wall thickness exceeds minimum NYC requirement.</p>
                  </div>
                </div>
                <div className="bg-ld-surface-container-high border border-white/10 p-4 rounded-sm flex items-center gap-3">
                  <span className="material-symbols-outlined text-ld-tertiary animate-spin text-[20px]">sync</span>
                  <span className="font-mono text-xs text-ld-tertiary">Analyzing Zoning...</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section id="how-it-works" className="px-6 md:px-16 py-24 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-ld-on-surface-variant border border-white/10 bg-ld-surface-container px-3 py-1 rounded">
              How It Works
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-ld-on-surface mt-6">Three Simple Steps</h2>
            <p className="text-ld-on-surface-variant mt-4">From plan to submission-ready in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative">
            <div className="hidden md:block absolute top-[40px] left-[16%] right-[16%] h-px bg-white/10 z-0" />

            {[
              { icon: 'upload_file', color: 'text-ld-tertiary', glow: '', title: 'Upload Plans', desc: 'Simply drag and drop your PDFs or high-res images of your architectural plans.' },
              { icon: 'psychology', color: 'text-ld-primary', glow: 'shadow-[0_0_20px_rgba(78,222,163,0.1)] border-ld-primary/30', title: 'AI Analysis', desc: "Our AI engine scans against NYC's massive database of Department of Buildings codes." },
              { icon: 'task_alt', color: 'text-ld-primary', glow: '', title: 'Get Report', desc: 'Receive an instant, itemized compliance report with flagged issues and clear suggestions.' },
            ].map(({ icon, color, glow, title, desc }) => (
              <div key={title} className="relative z-10 flex flex-col items-center">
                <div className={`w-20 h-20 bg-ld-surface border border-white/10 rounded-full flex items-center justify-center mb-6 ${glow}`}>
                  <span className={`material-symbols-outlined text-[32px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <h3 className="text-xl font-bold text-ld-on-surface mb-3">{title}</h3>
                <p className="text-ld-on-surface-variant text-sm max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA Banner ─── */}
        <section className="px-6 md:px-16 py-24 max-w-7xl mx-auto">
          <div className="glass-card p-12 text-center border border-ld-primary/20 relative corner-brackets shadow-[0_0_50px_rgba(78,222,163,0.1)] overflow-hidden">
            <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-ld-primary/5 blur-[80px] rounded-full pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-bold text-ld-on-surface mb-4 relative z-10">
              Stop Guessing. Start Submitting with Confidence.
            </h2>
            <p className="text-lg text-ld-on-surface-variant mb-8 relative z-10">
              Try our AI scanner today and save weeks on your next DOB filing.
            </p>
            <Link
              className="inline-flex btn-cyber bg-ld-primary text-ld-on-primary text-sm font-bold tracking-widest uppercase px-8 py-4 items-center justify-center gap-2 hover:bg-ld-primary-fixed transition-colors relative z-10"
              href="/login"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload Your First Plan
            </Link>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section className="px-6 md:px-16 py-24 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-ld-on-surface-variant border border-white/10 bg-ld-surface-container px-3 py-1 rounded">
              Pricing
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-ld-on-surface mt-6">Simple, Transparent Pricing</h2>
            <p className="text-ld-on-surface-variant mt-4">Pay only for what you need. No monthly subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Single Scan */}
            <div className="glass-card p-8 relative border border-white/10">
              <h3 className="text-2xl font-bold text-ld-on-surface">Single Scan</h3>
              <p className="text-ld-on-surface-variant mb-6 text-sm">Perfect for a quick check</p>
              <div className="flex items-baseline gap-2 mb-8 border-b border-white/10 pb-6">
                <span className="text-5xl font-bold text-ld-on-surface">$2</span>
                <span className="font-mono text-xs text-ld-on-surface-variant">/ one-time</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['1 Full AI Plan Scan', 'OCR Extraction', 'Detailed Report PDF', 'Immediate Analysis'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-ld-primary text-[18px]">check</span>
                    <span className="text-sm text-ld-on-surface">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full block text-center bg-ld-surface-container hover:bg-ld-surface-bright border border-white/10 text-ld-on-surface text-xs font-bold tracking-widest uppercase py-3 transition-colors">
                Get Started
              </Link>
            </div>

            {/* Pro Pack */}
            <div className="glass-card p-8 relative border border-ld-primary/50 shadow-[0_0_30px_rgba(78,222,163,0.1)] md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-ld-primary text-ld-on-primary text-[10px] font-bold tracking-widest uppercase px-3 py-1 m-4">Best Value</div>
              <h3 className="text-2xl font-bold text-ld-primary">Pro Pack</h3>
              <p className="text-ld-on-surface-variant mb-6 text-sm">Best for smaller projects</p>
              <div className="flex items-baseline gap-2 mb-8 border-b border-white/10 pb-6">
                <span className="text-5xl font-bold text-ld-on-surface">$20</span>
                <span className="font-mono text-xs text-ld-on-surface-variant">/ one-time</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['12 AI Scans (Buy 10, Get 2 Free)', 'Priority Processing', 'Expert Code Mapping', 'Full Compliance Check'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-ld-primary text-[18px]">check</span>
                    <span className="text-sm text-ld-on-surface">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full btn-cyber bg-ld-primary hover:bg-ld-primary-fixed text-ld-on-primary text-xs font-bold tracking-widest uppercase py-3 transition-colors flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">flash_on</span>
                Get Started
              </Link>
            </div>

            {/* Enterprise Pack */}
            <div className="glass-card p-8 relative border border-white/10">
              <h3 className="text-2xl font-bold text-ld-on-surface">Enterprise Pack</h3>
              <p className="text-ld-on-surface-variant mb-6 text-sm">Bulk compliance checking</p>
              <div className="flex items-baseline gap-2 mb-8 border-b border-white/10 pb-6">
                <span className="text-5xl font-bold text-ld-on-surface">$100</span>
                <span className="font-mono text-xs text-ld-on-surface-variant">/ one-time</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['65 AI Scans (Buy 50, Get 15 Free)', 'Lifetime Credits', 'Priority Support', 'Bulk Processing'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-ld-primary text-[18px]">check</span>
                    <span className="text-sm text-ld-on-surface">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full block text-center bg-ld-surface-container hover:bg-ld-surface-bright border border-white/10 text-ld-on-surface text-xs font-bold tracking-widest uppercase py-3 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Testimonial ─── */}
        <section className="px-6 md:px-16 py-24 max-w-7xl mx-auto border-y border-white/5 bg-ld-surface-container-low/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto text-center">
            <span className="material-symbols-outlined text-[48px] text-ld-primary/30 mb-6 block">format_quote</span>
            <p className="text-2xl md:text-3xl font-bold text-ld-on-surface leading-tight italic mb-8">
              &ldquo;NYC House Code helped us catch issues before DOB submission — saved us weeks.&rdquo;
            </p>
            <div className="text-xs font-bold tracking-widest uppercase text-ld-primary">
              NYC Real Estate Developer
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-ld-surface-container-lowest border-t border-white/5 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 px-6 md:px-16 py-16 max-w-7xl mx-auto">
          <div>
            <Link className="text-lg font-bold text-ld-primary flex items-center gap-2 mb-4" href="#">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
              NYC CODES
            </Link>
            <p className="text-sm text-ld-on-surface-variant max-w-sm mb-6">
              Confidence in Every Submission. AI-Powered NYC DOB Compliance.
            </p>
            <p className="text-xs text-ld-on-surface-variant/50">
              © 2024 NYC CODES. Deployed in Brooklyn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase text-ld-on-surface mb-4">Product</h4>
              <ul className="space-y-3">
                {['Pricing', 'Architecture', 'Security Ops'].map((l) => (
                  <li key={l}><Link className="text-sm text-ld-on-surface-variant hover:text-ld-primary transition-colors" href="#">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase text-ld-on-surface mb-4">Network</h4>
              <ul className="space-y-3">
                {['Contact', 'Contact Peer', 'Privacy Policy'].map((l) => (
                  <li key={l}><Link className="text-sm text-ld-on-surface-variant hover:text-ld-primary transition-colors" href="#">{l}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
