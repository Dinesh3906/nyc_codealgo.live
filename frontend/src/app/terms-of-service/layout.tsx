import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Service | CodeAlgo Building Code API",
  description: "Read the Terms of Service for CodeAlgo. Understand your rights and obligations when using our AI-powered DOB compliance engine.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/terms-of-service",
  },
  keywords: ["terms of service", "CodeAlgo terms", "NYC code checker legal"]
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
