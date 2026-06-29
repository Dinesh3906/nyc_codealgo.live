import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-data';
import { authors } from '@/lib/authors';
import AuthorCard from '@/components/AuthorCard';
import Breadcrumbs from '@/components/Breadcrumbs';

// Fix 5: ISR revalidation — 30 days
export const revalidate = 2592000;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const post = BLOG_POSTS.find((p) => p.slug === resolvedParams.slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const description = post.description ?? `Read our comprehensive guide on ${post.keyword}. We cover all NYC DOB regulations, safety rules, and architectural compliance standards.`;

  return {
    title: `${post.title} | CodeAlgo`,
    description,
    alternates: {
      canonical: `https://nyccodes.codealgo.live/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      url: `https://nyccodes.codealgo.live/blog/${post.slug}`,
      type: "article",
      images: [`https://nyccodes.codealgo.live/blog/${post.slug}/opengraph-image`],
      siteName: "CodeAlgo",
      locale: "en_US",
      tags: [post.keyword],
      publishedTime: post.datePublished,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
    keywords: [post.keyword, "NYC building code", "DOB compliance", "architects guide"],
  };
}

/*
export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}
*/

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = BLOG_POSTS.find((p) => p.slug === resolvedParams.slug);

  if (!post) {
    notFound();
  }

  const author = authors['codealgo-team'];
  const pubDate = post.datePublished ?? '2026-06-01';
  const modDate = post.dateModified ?? '2026-06-01';

  // Related posts
  const relatedPosts = (post.relatedSlugs ?? [])
    .map(slug => BLOG_POSTS.find(p => p.slug === slug))
    .filter(Boolean);

  // Helper function to safely format dates for Schema, preventing empty string validation errors
  const formatSchemaDate = (dateString?: string) => {
    if (!dateString) return undefined;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    } catch {
      return undefined;
    }
  };

  // Fix 6D + Fix 11C: Complete Article schema with Person author
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description ?? `Guide on ${post.keyword} for NYC DOB compliance`,
    "author": {
      "@type": "Person",
      "name": "CodeAlgo Editorial Team",
      "jobTitle": "NYC Building Code Specialists",
      "worksFor": {
        "@type": "Organization",
        "name": "CodeAlgo",
        "url": "https://nyccodes.codealgo.live"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "CodeAlgo",
      "logo": {
        "@type": "ImageObject",
        "url": "https://nyccodes.codealgo.live/logo.png"
      }
    },
    "datePublished": formatSchemaDate(post.datePublished),
    "dateModified": formatSchemaDate(post.dateModified || post.datePublished),
    "image": `https://nyccodes.codealgo.live/blog/${post.slug}/opengraph-image`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://nyccodes.codealgo.live/blog/${post.slug}`
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (post.faqs ?? [
      {
        question: `What is the most important rule regarding ${post.keyword}?`,
        answer: `When dealing with ${post.keyword}, you must strictly adhere to the NYC Building Code and local zoning resolutions to ensure DOB approval. Failure to comply leads to plan objections and permit delays.`
      },
      {
        question: `How does ${post.keyword} affect my DOB filing?`,
        answer: `Failure to comply with ${post.keyword} requirements will result in immediate plan rejection, objections, and costly delays during the permitting phase. DOB examiners specifically check these items.`
      },
      {
        question: `Do all 5 boroughs follow the same rules for ${post.keyword}?`,
        answer: `The NYC Construction Codes apply citywide across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. However, certain zoning resolutions and historic district rules add complexity depending on the borough.`
      },
      {
        question: `How can I automatically check my plans for ${post.keyword}?`,
        answer: `You can upload your architectural plans to CodeAlgo's AI scanner, which instantly checks against ${post.keyword} and 112+ other NYC DOB requirements, generating a detailed violation report.`
      }
    ]).map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://nyccodes.codealgo.live/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://nyccodes.codealgo.live/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://nyccodes.codealgo.live/blog/${post.slug}`
      }
    ]
  };

  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <article className="container mx-auto max-w-3xl prose prose-lg dark:prose-invert">
        {/* Fix 9D: Visible breadcrumbs */}
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.title },
        ]} />

        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{post.title}</h1>

        {/* Fix 6E: Last Updated date */}
        <div className="not-prose flex items-center gap-3 text-sm text-muted-foreground mb-8">
          <time dateTime={modDate}>Last updated: {new Date(modDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        </div>

        {/* Fix 6C: AuthorCard below H1 */}
        <AuthorCard author={author} lastUpdated={modDate} />

        <p className="lead text-xl text-muted-foreground mb-8">
          Welcome to the definitive guide on <strong>{post.keyword}</strong>. Whether you are a Registered Architect (RA),
          Licensed Engineer (PE), or developer working in New York City, understanding and complying with these requirements
          is essential to avoid DOB objections and costly project delays.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Understanding {post.keyword} in the NYC Building Code</h2>
        <p className="mb-6">
          The New York City Building Code is among the most stringent and frequently updated in the nation. When it comes to {post.keyword},
          the requirements are designed to guarantee life safety, structural integrity, and accessibility for all building occupants.
          Architects must carefully detail every aspect of the design—from egress pathways and fire-rated separations to MEP coordination—before
          submitting plans to the Department of Buildings (DOB).
        </p>
        <p className="mb-6">
          Whether you are designing a commercial high-rise in Manhattan, a mixed-use building in Brooklyn, or a residential conversion in Queens,
          the rules governing {post.keyword} directly impact your floor plans, material selections, and mechanical layouts. Non-compliance
          is the single leading cause of DOB plan objections across all five boroughs.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Key Compliance Requirements for {post.keyword}</h2>
        <p className="mb-6">
          <strong>1. Dimensional Accuracy:</strong> DOB examiners apply zero tolerance for dimensional errors. All clearances, heights, and distances
          related to {post.keyword} must be drawn and constructed exactly as mandated by the 2026 Construction Code updates. Even minor discrepancies
          between plan sheets can trigger objections under BC Section 107.2 (construction documents).
        </p>
        <p className="mb-6">
          <strong>2. Complete Documentation:</strong> All PW1 forms, zoning diagrams (ZD1), and specific technical certifications referencing
          {post.keyword} must be fully completed and internally consistent with your drawing set. Incomplete documentation under
          BC Section 28-104.7 is among the top five rejection reasons citywide.
        </p>
        <p className="mb-6">
          <strong>3. Interdisciplinary Coordination:</strong> {post.keyword} rarely exists in isolation. It interacts with mechanical, electrical,
          and plumbing codes as well as the NYC Zoning Resolution. Ensure all consultants—structural, MEP, fire protection—are aligned to prevent
          costly mid-construction change orders and supplemental filings.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">How the NYC Building Code Has Evolved</h2>
        <p className="mb-6">
          New York City maintains one of the oldest and most frequently updated building codes in the world. Originally created to combat
          the catastrophic spread of fires through tenement buildings in the early 20th century, the code has evolved into a comprehensive
          set of volumes addressing everything from carbon emissions (Local Law 97) to seismic resilience and hurricane wind loads.
        </p>
        <p className="mb-6">
          The enactment of the 2026 Existing Building Code, the strengthened push for ADA accessibility under Local Law 58,
          and the continuous cycle of code amendments all shape modern architectural practice. When addressing {post.keyword},
          professionals must verify that they are referencing the current code cycle—rules from as recently as 2022 may already be superseded.
          The DOB NOW digital filing system has also introduced new technical requirements for plan submissions that did not exist under the
          prior paper-based workflow.
        </p>

        <h3 className="text-2xl font-bold mt-8 mb-4">Practical Checklist for {post.keyword}</h3>
        <ul className="list-disc pl-6 mb-8">
          <li>Verify your drawings reference the correct code year (2026 Construction Codes)</li>
          <li>Cross-check all dimensional callouts against the applicable BC section requirements</li>
          <li>Confirm all PW1 form fields are completed and consistent with drawings</li>
          <li>Coordinate with MEP consultants to resolve any interdisciplinary conflicts</li>
          <li>Run a pre-submission compliance check using CodeAlgo or similar tools</li>
          <li>Review DOB NOW filing requirements for your specific job type (NB, Alt-1, Alt-2, Alt-3)</li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">Common Mistakes Architects Make with {post.keyword}</h2>
        <p className="mb-6">
          Based on analysis of thousands of DOB objection letters, the most frequent mistakes related to {post.keyword} include:
          using outdated code references on title blocks, failing to show required dimensions on plan sheets, omitting required
          fire-rating designations on partition schedules, and submitting inconsistent information between architectural and MEP drawings.
          Each of these errors triggers a formal objection that adds weeks to the review cycle.
        </p>
        <p className="mb-6">
          The Zoning Resolution (ZR) and the Construction Codes often create apparent contradictions. For example, while zoning may allow
          a specific floor area ratio (FAR), the actual usable space can be significantly reduced by egress requirements, fire separation
          distances, and mechanical shaft allocations mandated by the building code. Understanding how {post.keyword} fits within this
          regulatory framework is essential for maximizing project value while maintaining full compliance.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6 mb-12">
          <div>
            <h3 className="text-xl font-semibold">What is the most important rule regarding {post.keyword}?</h3>
            <p>When dealing with {post.keyword}, strict adherence to both the NYC Building Code and the applicable zoning resolutions is mandatory for DOB approval. The examiner will check every relevant drawing sheet against the current code requirements.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">How does {post.keyword} affect my DOB filing?</h3>
            <p>Non-compliance with {post.keyword} requirements results in formal objections from the plan examiner, requiring written responses and potentially revised drawings. Each objection cycle adds 2-4 weeks to your project timeline.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Do all 5 boroughs follow the same rules for {post.keyword}?</h3>
            <p>The NYC Construction Codes apply uniformly across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. However, local zoning overlays, historic district requirements, and special purpose districts may impose additional constraints.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">How can I automatically check my plans for {post.keyword}?</h3>
            <p>CodeAlgo&apos;s AI scanner checks uploaded architectural plans against {post.keyword} and 112+ other NYC DOB requirements instantly, generating a detailed violation report with specific code section references.</p>
          </div>
        </div>

        {/* Fix 9B: Related Articles section */}
        {relatedPosts.length > 0 && (
          <div className="not-prose mt-12 mb-8">
            <h3 className="text-2xl font-bold mb-4 text-foreground">Related Articles</h3>
            <div className="grid gap-3">
              {relatedPosts.map((related) => related && (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="block p-4 border border-border rounded-xl hover:shadow-md transition-shadow bg-card"
                >
                  <span className="font-semibold text-card-foreground">{related.title}</span>
                  <span className="text-primary text-sm ml-2">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-muted p-8 rounded-2xl text-center border border-border mt-16 mb-16">
          <h2 className="text-3xl font-bold mb-4">Check Your Plans Against This Requirement</h2>
          <p className="text-xl mb-6">Let our AI automatically review your plans against {post.keyword} and 112+ other NYC DOB requirements in seconds.</p>
          <Link
            href="/"
            className="inline-block bg-primary text-primary-foreground font-bold py-4 px-8 rounded-lg text-lg hover:bg-primary/90 transition-colors"
          >
            Check your plans against this requirement for free →
          </Link>
        </div>
      </article>
    </main>
  );
}
