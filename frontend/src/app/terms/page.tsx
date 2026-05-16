"use client";

import Navbar from "@/components/ui/Navbar";
import { Footer } from "@/components/sections/Sections";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background lg:ml-56 mt-14 lg:mt-0">
      <Navbar onOpenModal={() => {}} />
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <h1 className="text-4xl font-extrabold mb-8 text-foreground">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-6 text-sm italic">Last Updated: May 16, 2024</p>
        
        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Services Provided</h2>
            <p>Code Algo provides AI-powered analysis of architectural plans against the New York City Building Codes. Our reports are for informational purposes and should be verified by a licensed professional architect or engineer before DOB submission.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Payments and Refunds</h2>
            <p>Payments are processed via Razorpay. Due to the digital nature of our AI analysis and credit-based system, all sales are final. Credits are non-transferable and do not expire unless otherwise stated.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. User Responsibilities</h2>
            <p>Users are responsible for the legality and ownership of the plans they upload. Code Algo is not liable for any code violations or rejections resulting from the use of our automated tools.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Intellectual Property</h2>
            <p>The Code Algo platform, including its analysis algorithms and branded identity, is the property of the Code Algo team. Users retain ownership of their uploaded plans.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Limitation of Liability</h2>
            <p>Code Algo is provided "as is" without warranties. We are not responsible for any financial loss, project delays, or DOB penalties incurred through the use of our platform.</p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
