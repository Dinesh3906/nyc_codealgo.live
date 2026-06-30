"use client";

import Navbar from "@/components/ui/Navbar";
import { Footer } from "@/components/sections/Sections";

export default function PrivacyPage() {
  return (
    <main className="dark min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-950/10 via-slate-950 to-transparent pointer-events-none z-0" />

      <Navbar onOpenModal={() => { }} />
      
      <div className="relative container mx-auto px-6 py-24 max-w-4xl z-10">
        <header className="mb-12 border-b border-slate-800/80 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            Enterprise Grade Security & Compliance
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 italic">
            Last Updated: May 30, 2026
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-slate-300 space-y-8 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Introduction & Legal Entity</h2>
            <p>
              Welcome to <strong>PermitIQ by Aureon</strong>. This Privacy Policy explains how Construction AI Technologies Inc. ("PermitIQ by Aureon", "we", "our", "us") collects, uses, stores, and protects your information when you use our building code compliance and analysis platform.
            </p>
            <p>
              <strong>Construction AI Technologies Inc.</strong><br/>
              Registered Address: 1 World Trade Center, Suite 4500, New York, NY 10007<br/>
              Contact Email: support@nyccodes.codealgo.live
            </p>
            <p>
              By using our services, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Information We Collect</h2>
            
            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Account Information</h3>
            <p className="mb-4">When you create an account, we may collect:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-6">
              <li>Name and Professional Title</li>
              <li>Email address</li>
              <li>Encrypted passwords</li>
              <li>Usage metrics and account history</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Uploaded Files & Derived Data</h3>
            <p className="mb-4">We collect and process the following when you utilize our analysis engine:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-6">
              <li>Architectural drawings, building plans, and PDF documents</li>
              <li>Images submitted for code compliance analysis</li>
              <li><strong>Vector Representations:</strong> We may create vector representations, embeddings, indexes, and derived data strictly for retrieval, search, and analysis purposes within your active session.</li>
            </ul>
            <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-lg text-amber-200 text-sm mb-6">
              <strong>Important Notice on Sensitive Information:</strong> Architectural plans occasionally contain personal data (names, signatures, personal addresses, phone numbers). Users should redact or not upload sensitive personal information unless strictly necessary for the structural analysis requested.
            </div>

            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Payment Information</h3>
            <p className="mb-2">Payments are processed securely through our trusted third-party payment processors. We do not directly store or collect your raw credit card numbers or banking credentials.</p>

            <h3 className="text-xl font-bold text-slate-200 mt-4 mb-2">Technical & Cookie Information</h3>
            <p className="mb-4">We automatically collect technical data to ensure platform stability:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400">
              <li>IP addresses, browser types, and device information</li>
              <li>Session tracking, cookies, and strictly necessary operational analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Lawful Basis for Processing</h2>
            <p>
              For users located in regions requiring a stated lawful basis (including the EU and UK), we process information based on:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400">
              <li><strong>Contractual Necessity:</strong> To provide you with the PermitIQ by Aureon analysis services you requested.</li>
              <li><strong>Legitimate Interests:</strong> To secure our platform, detect fraud, and improve system performance.</li>
              <li><strong>Consent:</strong> Where explicitly provided (e.g., marketing communications).</li>
              <li><strong>Legal Obligations:</strong> To comply with financial and regulatory requirements.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-blue-500/30 p-6 rounded-xl my-8">
            <h2 className="text-2xl font-bold text-blue-400 mb-3">4. AI Processing & Training Policy</h2>
            <p className="text-lg text-white font-medium mb-2">
              Are my building plans used to train AI models?
            </p>
            <p className="text-slate-300">
              <strong>No.</strong> Uploaded plans, drawings, reports, and project documents are <strong>not used</strong> by PermitIQ by Aureon to train foundation AI models. Data may be transmitted to trusted service providers solely to provide the requested analysis and platform functionality, but it is explicitly excluded from being utilized as training data for future generative models.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Data Sharing & Third-Party Vendors</h2>
            <p className="mb-4">
              <strong>We do not sell personal information.</strong> We only share information with trusted third parties to facilitate our services. Instead of naming specific vendors which may change over time, we categorize our sub-processors as follows:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-4">
              <li>Cloud hosting and infrastructure providers</li>
              <li>AI processing and foundation model providers</li>
              <li>Vector database and search retrieval providers</li>
              <li>Payment processing and billing providers</li>
              <li>Security and operational analytics providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. International Data Transfers</h2>
            <p>
              Construction AI Technologies Inc. operates primarily in the United States. Information may be processed, transferred, and stored in countries different from your own (including by our cloud and AI providers). By using our services, you acknowledge the transfer of data to regions that may have different data protection laws than your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Data Retention & Backups</h2>
            <p className="mb-4">We adhere to the following retention schedules:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400 mb-4">
              <li><strong>Uploaded Plans & Analysis:</strong> Uploaded plans and associated vector data may be retained for 30 days after the analysis is completed to allow you to review the generated reports, unless you actively delete them earlier via your dashboard.</li>
              <li><strong>Account Data:</strong> Retained until you request account deletion.</li>
              <li><strong>Backups:</strong> Deleted data may remain in encrypted, offline operational backups for a limited period (up to 90 days) before permanent system-wide removal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">8. Security & Breach Notification</h2>
            <p>
              We implement industry-standard encryption (SSL/TLS), role-based access controls, and secure infrastructure to protect your data. However, no digital transmission is entirely secure. 
            </p>
            <p className="mt-4">
              <strong>Incident Response:</strong> In the event of a data breach that compromises your personal information and requires notification under applicable law, we will provide prompt notice to affected users and regulatory bodies as required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">9. Ownership of Generated Reports</h2>
            <p>
              Any compliance reports, summaries, or analyses generated by PermitIQ by Aureon from your uploaded documents remain strictly associated with your account. While we facilitate the generation of these outputs, you retain ownership of the generated insights related to your proprietary plans.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">10. Business Transfers & Legal Disclosures</h2>
            <p className="mb-4">
              <strong>Business Transfers:</strong> Information may be transferred as part of a merger, acquisition, financing, or sale of company assets. We will notify users of any change in ownership or policy.
            </p>
            <p>
              <strong>Government Requests:</strong> We may disclose information when strictly required by law, court order, subpoena, or valid governmental request. We will attempt to notify users of such requests when legally permitted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">11. Cookies & Do-Not-Track</h2>
            <p className="mb-4">
              We use strictly necessary cookies to manage user authentication and secure sessions. We may also use operational analytics to monitor site performance.
            </p>
            <p>
              <em>Do Not Track (DNT):</em> We do not currently respond to browser Do-Not-Track signals due to a lack of standardization across web browsers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">12. User Rights & Account Deletion</h2>
            <p className="mb-4">
              Depending on your location, you may have rights to access, correct, delete, or restrict processing of your personal information.
            </p>
            <p className="mb-4">
              <strong>Account Deletion:</strong> You may request full account deletion at any time directly through your user dashboard settings, or by emailing us. Deletion requests are processed within 14 business days.
            </p>
            <p>
              <strong>Submitting Requests:</strong> Privacy requests must be submitted to <strong>support@nyccodes.codealgo.live</strong>. We will require identity verification (such as confirming your email address or account details) before fulfilling specific data requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">13. California Privacy Rights (CCPA/CPRA)</h2>
            <p>
              For residents of California, we comply with the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA). We do not sell personal information. You have the right to request disclosure of the specific categories of data we collect, request deletion, and not face discrimination for exercising these rights. To submit a verifiable consumer request, contact us via the email below.
            </p>
          </section>

          <section className="border-t border-slate-800 pt-8 mt-12">
            <h2 className="text-2xl font-bold text-white mb-3">14. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our enterprise data practices, please contact our privacy compliance team:
            </p>
            <p className="mt-4">
              <strong>Construction AI Technologies Inc.</strong><br/>
              Email: <a href="mailto:support@nyccodes.codealgo.live" className="text-blue-400 hover:underline">support@nyccodes.codealgo.live</a><br />
              Address: 1 World Trade Center, Suite 4500, New York, NY 10007
            </p>
          </section>

        </div>
      </div>
      <Footer />
    </main>
  );
}
