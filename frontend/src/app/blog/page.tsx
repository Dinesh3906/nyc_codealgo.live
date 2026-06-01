import { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-data';

export const metadata: Metadata = {
  title: "NYC Building Code Compliance Blog | CodeAlgo",
  description: "Read the latest guides, checklists, and deep dives on New York City building code compliance, DOB filing, and architectural best practices.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/blog",
  },
  openGraph: {
    title: "NYC Building Code Compliance Blog | CodeAlgo",
    description: "Guides and checklists on New York City building code compliance.",
    url: "https://nyccodes.codealgo.live/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Building Code Compliance Blog",
  },
  keywords: ["NYC building code blog", "architectural resources NYC", "DOB filing guides"],
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground text-center">NYC Building Code Compliance Blog</h1>
        <p className="text-xl text-muted-foreground text-center mb-12">
          Your definitive resource for NYC building code compliance and architectural plan review.
          Whether you are preparing for DOB requirements ahead of permit submission or need to verify
          your drawings against the latest codes, our expert guides cover every aspect of the process.
        </p>

        <div className="grid grid-cols-1 gap-6">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block p-6 border border-border rounded-xl hover:shadow-lg transition-shadow bg-card">
              <h2 className="text-2xl font-semibold mb-2 text-card-foreground">{post.title}</h2>
              <p className="text-primary text-sm font-medium">Read Article &rarr;</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
