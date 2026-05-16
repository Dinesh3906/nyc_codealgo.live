import Navbar from "@/components/ui/Navbar";
import { Footer } from "@/components/sections/Sections";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar onOpenModal={() => {}} />
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <h1 className="text-4xl font-extrabold mb-8 text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6 text-sm italic">Last Updated: May 16, 2024</p>
        
        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
            <p>At Code Algo, we collect information necessary to provide our NYC Building Code analysis services. This includes your name, email address, and the architectural plans (PDF/Images) you upload for analysis.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Data</h2>
            <p>Your data is used strictly for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generating AI-powered compliance reports.</li>
              <li>Processing payments through our secure partner, Razorpay.</li>
              <li>Improving our architectural analysis algorithms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your architectural plans. Plans are encrypted during upload and storage. We do not sell your personal or architectural data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Third-Party Services</h2>
            <p>We use Razorpay for payment processing. Your credit card information is never stored on our servers. Razorpay's use of your personal information is governed by their Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Contact Us</h2>
            <p>If you have questions about your data, please contact the Code Algo team via our support channels.</p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
