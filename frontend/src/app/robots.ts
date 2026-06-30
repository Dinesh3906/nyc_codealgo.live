import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/dashboard/', '/admin/'],
      },
    ],
    sitemap: 'https://nyccodes.permitiq.live/sitemap.xml',
  };
}
