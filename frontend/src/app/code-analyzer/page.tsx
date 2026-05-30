import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Code Analyzer Online - Direct Source Code Auditing | NYC Codes',
  description: 'Use the NYC Codes AI Code Analyzer to scan source code instantly. Detect syntax bugs, security threats, performance bottlenecks, and optimize software projects.',
};

export default function CodeAnalyzerLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      
      {/* Premium background gradients */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-emerald-950/20 via-slate-950 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[70%] left-[-10%] w-[500px] h-[500px] bg-teal-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <main className="relative container mx-auto px-6 py-16 max-w-5xl z-10">
        
        {/* Navigation Breadcrumbs for Google Crawler indexation */}
        <nav className="mb-8 text-sm text-slate-500 flex items-center gap-2">
          <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-300">AI Code Analyzer</span>
        </nav>

        {/* H1: Core SEO Target */}
        <header className="mb-12 border-b border-slate-800/80 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            🛠️ Enterprise Developer Suite
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            AI Code Analyzer & Source Code Quality Checker
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-3xl">
            Audit programming projects, scan source folders, identify runtime exceptions, and optimize memory footprints instantly using the industry-leading deep-learning developer assistant.
          </p>
        </header>

        {/* Informative Body Content (Targeting 1500+ words of authoritative topical SEO data) */}
        <section className="space-y-12 text-slate-300 leading-relaxed text-base">
          
          <article className="prose prose-invert max-w-none">
            {/* H2 */}
            <h2 className="text-3xl font-bold text-white mb-4">What is an AI Code Analyzer?</h2>
            <p>
              An <strong>AI Code Analyzer</strong> is a software utility that uses trained large language models (LLMs) and advanced structural parsers to evaluate programming code without running it (static analysis) or while simulating inputs (dynamic profiling). Unlike traditional static code linters which check rigid stylistic rule sets (like ESLint or Pylint), an <strong>AI-powered code quality checker</strong> understands complex programmatic context, logic flaws, architectural boundaries, and algorithmic inefficiencies.
            </p>
            <p>
              NYC Codes leverages deep contextual RAG systems and advanced reasoning models (including Google Gemini 2.5) to perform a multi-dimensional analysis of your software code. By uploading a file or typing a query, developers get immediate reports outlining compliance with language specifications, security loopholes, memory leaks, and performance bottlenecks.
            </p>
          </article>

          {/* Core Feature Showcases */}
          <div className="grid md:grid-cols-2 gap-8 my-12">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              {/* H3 */}
              <h3 className="text-xl font-bold text-emerald-400 mb-3">⚡ Advanced Bug Detection AI</h3>
              <p className="text-sm text-slate-400 mb-4">
                Scan your functions for race conditions, null pointer dereferences, array overflows, and infinite loops. Our engine highlights the offending lines and writes direct drop-in corrected code.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500">
                <li>• Real-time logic validation</li>
                <li>• Race condition & concurrent state checks</li>
                <li>• Exception handling assessment</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              {/* H3 */}
              <h3 className="text-xl font-bold text-emerald-400 mb-3">🔒 Security & Vulnerability Auditing</h3>
              <p className="text-sm text-slate-400 mb-4">
                Verify compliance with OWASP Top 10 vulnerabilities. Protect your codebase against SQL Injection (SQLi), Cross-Site Scripting (XSS), insecure credentials, and buffer overflows.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500">
                <li>• SQLi and XSS security scans</li>
                <li>• Environmental variable and credentials checks</li>
                <li>• Dependency version vulnerability alerts</li>
              </ul>
            </div>
          </div>

          <article className="prose prose-invert max-w-none">
            {/* H2 */}
            <h2 className="text-3xl font-bold text-white mb-4">Features of the NYC Codes Source Code Analyzer</h2>
            <p>
              To rank as the <strong>best code analyzer online</strong>, NYC Codes combines several developer optimization systems under a single unified dashboard:
            </p>
            <ol className="list-decimal pl-6 space-y-4 my-6">
              <li>
                <strong>Multi-Language Autodetect:</strong> Full static analysis coverage for Javascript (React/Node.js), Python, TypeScript, Java, C++, C#, PHP, Ruby, and Go.
              </li>
              <li>
                <strong>Automated Code Review AI:</strong> Acts as a virtual Senior Tech Lead on your team, performing thorough code review audits on merge requests, pull branches, or loose scripts.
              </li>
              <li>
                <strong>Code Optimization Tooling:</strong> Rewrites computational bottlenecks. The system analyzes loop complexity, optimizes database joins, and refactors recursive routines into iterative cycles to minimize execution timeouts.
              </li>
              <li>
                <strong>Prompt Engineering & AI Validator:</strong> Includes built-in prompt validation to evaluate if system instructions sent to LLMs are secure, cost-effective, and protected against prompt injection.
              </li>
            </ol>
          </article>

          {/* Interactive Code Comparison Preview Box */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6">Real-World Analysis Output Example</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2">❌ Before AI Analysis (Logic Trap)</div>
                <pre className="bg-slate-950 border border-rose-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
{`function fetchUserData(users) {
  let list = [];
  for (let i = 0; i <= users.length; i++) {
    // ⚠️ Logic error: Out-of-bounds array access
    list.push(users[i].name); 
  }
  return list;
}`}
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">✅ After AI Audit (Fixed & Optimized)</div>
                <pre className="bg-slate-950 border border-emerald-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
{`function fetchUserData(users) {
  // Corrected index access & refactored to high-performance .map
  if (!Array.isArray(users)) return [];
  return users.map(user => user?.name).filter(Boolean);
}`}
                </pre>
              </div>
            </div>
          </section>

          <article className="prose prose-invert max-w-none">
            {/* H2 */}
            <h2 className="text-3xl font-bold text-white mb-4">Why Developers Choose NYC Codes</h2>
            <p>
              Traditional static analysers (linters) only target syntax and formatting standards. They cannot identify logical inconsistencies or suggest performant algorithmic variations. NYC Codes fills this structural gap by combining deep developer semantics with the latest LLM reasoning.
            </p>
            <p>
              Whether you are looking to audit a large corporate project, compile clean documentation, or simply improve your programming workflow, our tool provides an all-in-one execution pipeline.
            </p>
          </article>

          {/* H2 - FAQs Section */}
          <section className="border-t border-slate-800 pt-12">
            <h2 className="text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
            <div className="space-y-8">
              <div>
                {/* H3 */}
                <h3 className="text-xl font-bold text-slate-200">How does the AI code analyzer work?</h3>
                <p className="text-slate-400 mt-2">
                  Our system generates structural vector representations of your uploaded code snippet or script. It then conducts a multi-query search to extract standard compliance definitions, before routing the codebase along with relevant guidelines to our high-performance Gemini LLM engines for structural feedback.
                </p>
              </div>
              <div>
                {/* H3 */}
                <h3 className="text-xl font-bold text-slate-200">Is my source code secure when analyzed?</h3>
                <p className="text-slate-400 mt-2">
                  Yes, code privacy is highly prioritized. Uploaded scripts are parsed securely in-memory and are never used to train global AI models. Files are immediately scrubbed from the active server directory after successful review compilation.
                </p>
              </div>
              <div>
                {/* H3 */}
                <h3 className="text-xl font-bold text-slate-200">What languages does the code analyzer support?</h3>
                <p className="text-slate-400 mt-2">
                  We support autodetect for over 20 languages including JavaScript, Python, TypeScript, Java, C++, C#, PHP, Swift, Go, Ruby, and raw SQL queries.
                </p>
              </div>
            </div>
          </section>

        </section>

        {/* CTA Conversion Box */}
        <section className="mt-16 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-3xl font-black text-white mb-4">
              Detect Bugs and Review Code Instantly
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Sign up today and get your first code verification report. Safeguard your software scripts against compiler crashes and security threats.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="inline-flex justify-center items-center px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg rounded-xl shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Start Analyzing Free
              </Link>
              <Link href="/nyc-house-codes-list" className="inline-flex justify-center items-center px-8 py-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-lg rounded-xl transition-all">
                View Building Codes
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
