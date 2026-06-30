import { BLOG_POSTS } from '@/lib/blog-data';

export async function GET() {
  const baseUrl = 'https://nyccodes.permitiq.live';

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${BLOG_POSTS.map(post => `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.dateModified || post.datePublished || new Date()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <image:image>
      <image:loc>${baseUrl}/blog/${post.slug}/opengraph-image</image:loc>
      <image:title>${post.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>
  </url>
  `).join('')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
