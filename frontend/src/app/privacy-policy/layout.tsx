import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy | PermitIQ by Aureon NYC Code Compliance",
  description: "Read the Privacy Policy for PermitIQ. We prioritize data security and confidentiality for all uploaded NYC architectural plans.",
  alternates: {
    canonical: "https://permitiq.codealgo.live/privacy-policy",
  },
  keywords: ["privacy policy", "data security permitiq", "NYC DOB compliance software security"]
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
