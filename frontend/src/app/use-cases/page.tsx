import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Who Uses PermitIQ: Architects, Engineers, Expediters | PermitIQ by Aureon",
  description: "Learn how architects, engineers, expediters, and developers use PermitIQ by Aureon's AI to guarantee NYC building code and DOB filing compliance.",
  alternates: {
    canonical: "https://permitiq.codealgo.live/use-cases",
  },
  openGraph: {
    title: "Who Uses PermitIQ: Architects, Engineers, Expediters",
    description: "Learn how architects and developers use PermitIQ by Aureon's AI to guarantee NYC DOB compliance.",
    url: "https://permitiq.codealgo.live/use-cases",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Who Uses PermitIQ: Architects, Engineers, Expediters",
  },
  keywords: ["PermitIQ by Aureon use cases", "NYC DOB expediter software", "architect compliance tool", "real estate developer software"],
};

export default function UseCasesPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">Who Uses PermitIQ: Architects, Engineers, Expediters</h1>
        <p className="text-xl text-muted-foreground">Built for Registered Architects, PEs, Developers, and Expediters across all 5 boroughs.</p>
      </div>
    </main>
  );
}
