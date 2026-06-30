import { ImageResponse } from 'next/og';
import { BLOG_POSTS } from '@/lib/blog-data';

export const runtime = 'edge';
export const alt = 'PermitIQ by Aureon Blog Post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = BLOG_POSTS.find((p) => p.slug === resolvedParams.slug);

  const title = post?.title ?? 'NYC Building Code Guide';
  const keyword = post?.keyword ?? 'NYC building code';

  return new ImageResponse(
    (
      <div style={{
        background: '#0A1628',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px',
      }}>
        <div style={{
          color: '#2563EB', fontSize: 18, fontWeight: 600,
          marginBottom: 20, letterSpacing: 3,
          textTransform: 'uppercase' as const,
        }}>
          PermitIQ by Aureon Blog
        </div>
        <div style={{
          color: '#ffffff', fontSize: 44, fontWeight: 700,
          lineHeight: 1.2, maxWidth: 900, marginBottom: 24,
        }}>
          {title}
        </div>
        <div style={{
          color: '#94a3b8', fontSize: 24, maxWidth: 700,
        }}>
          Expert guide on {keyword} for NYC DOB compliance
        </div>
        <div style={{
          marginTop: 40, display: 'flex', gap: 16,
        }}>
          <div style={{
            background: '#2563EB', color: '#fff',
            padding: '10px 24px', borderRadius: 8, fontSize: 16,
          }}>
            Read Full Guide
          </div>
          <div style={{
            border: '1px solid #334155', color: '#94a3b8',
            padding: '10px 24px', borderRadius: 8, fontSize: 16,
          }}>
            nyccodes.codealgo.live
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
