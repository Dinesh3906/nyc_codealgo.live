"use client";

import Navbar from "@/components/ui/Navbar";
import { Footer } from "@/components/sections/Sections";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-emerald-950/10 via-slate-950 to-transparent pointer-events-none z-0" />

      <Navbar onOpenModal={() => { }} />
      
      <div className="relative container mx-auto px-6 py-24 max-w-4xl z-10">
        <header className="mb-12 border-b border-slate-800/80 pb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 italic">
            Last Updated: May 30, 2026
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-slate-300 space-y-8 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Welcome to <strong>CodeAlgo</strong> ("we," "our," or "us").
            </p>
            <p>
              This Privacy Policy explains how we collect, use, store, and protect your information when you use CodeAlgo and related services. By using our services, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Information We Collect</h2>
            
            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Account Information</h3>
            <p className="mb-4">When you create an account, we may collect:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-6">
              <li>Name</li>
              <li>Email address</li>
              <li>Encrypted password</li>
              <li>Account status</li>
              <li>Usage information</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Uploaded Files</h3>
            <p className="mb-4">We may collect:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-6">
              <li>Building plans</li>
              <li>Architectural drawings</li>
              <li>PDF documents</li>
              <li>Images submitted for analysis</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Payment Information</h3>
            <p className="mb-2">Payments are processed through secure third-party payment providers (Razorpay). We do not store:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-6">
              <li>Credit card numbers</li>
              <li>Debit card numbers</li>
              <li>Banking credentials</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Technical Information</h3>
            <p className="mb-4">We may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Operating system</li>
              <li>Usage logs</li>
              <li>Error logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. How We Use Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400">
              <li>Provide AI compliance analysis</li>
              <li>Process uploaded files</li>
              <li>Generate reports</li>
              <li>Manage user accounts</li>
              <li>Process payments</li>
              <li>Improve service quality</li>
              <li>Detect fraud and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. AI Processing</h2>
            <p>
              Uploaded plans and documents may be processed using internal systems, third-party AI providers (such as Google Gemini APIs), retrieval systems, and Pinecone vector databases. Data is only temporarily transmitted to these secure services for the sole purpose of compliance analysis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Data Retention</h2>
            <p className="mb-4">We retain information only as long as necessary to:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-4">
              <li>Provide services</li>
              <li>Maintain transactional records</li>
              <li>Resolve disputes</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p>Users may request deletion of their accounts and associated data where legally permitted.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Security</h2>
            <p className="mb-4">We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-4">
              <li>Password hashing and encryption</li>
              <li>Role-based access controls</li>
              <li>Secure virtual server infrastructure</li>
              <li>SSL/TLS transmission encryption</li>
            </ul>
            <p>However, no system is completely secure, and we cannot guarantee absolute data security.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Third-Party Services</h2>
            <p className="mb-4">We may use:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-4">
              <li>Amazon Web Services (AWS)</li>
              <li>Google AI Services</li>
              <li>Pinecone Serverless DB</li>
              <li>Razorpay Payment Gateway</li>
              <li>Internal analytics tools</li>
            </ul>
            <p>These providers process data according to their own strict privacy policies.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">8. Children's Privacy</h2>
            <p>
              The service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">9. User Rights</h2>
            <p className="mb-4">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400">
              <li>Access your information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of records</li>
              <li>Object to data processing</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">10. Changes</h2>
            <p>
              We may update this Privacy Policy at any time. Continued use of the service constitutes acceptance of any updated changes.
            </p>
          </section>

          <section className="border-t border-slate-800 pt-8 mt-8">
            <h2 className="text-2xl font-bold text-white mb-3">11. Contact</h2>
            <p>
              For privacy inquiries, please contact:
              <br />
              <strong>Email:</strong> <a href="mailto:support@nyccodes.codealgo.live" className="text-emerald-400 hover:underline">support@nyccodes.codealgo.live</a>
            </p>
          </section>

        </div>
      </div>
      <Footer />
    </main>
  );
}
