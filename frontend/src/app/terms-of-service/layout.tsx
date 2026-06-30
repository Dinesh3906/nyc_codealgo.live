import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Service | PermitIQ by Aureon Building Code API",
  description: "Read the Terms of Service for PermitIQ. Understand your rights and obligations when using our AI-powered DOB compliance engine.",
  alternates: {
    canonical: "https://nyccodes.permitiq.live/terms-of-service",
  },
  keywords: ["terms of service", "PermitIQ by Aureon terms", "NYC code checker legal"]
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
