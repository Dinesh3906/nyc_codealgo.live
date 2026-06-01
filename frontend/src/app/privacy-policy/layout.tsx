import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy | CodeAlgo NYC Code Compliance",
  description: "Read the Privacy Policy for CodeAlgo. We prioritize data security and confidentiality for all uploaded NYC architectural plans.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/privacy-policy",
  },
  keywords: ["privacy policy", "data security codealgo", "NYC DOB compliance software security"]
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
