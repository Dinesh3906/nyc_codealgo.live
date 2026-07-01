import { NextResponse, type NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV !== 'production';

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const origins = [
    "'self'",
    'https://api-permitiq.codealgo.live',
    'wss://api-permitiq.codealgo.live',
    'https://api.codealgo.live',
    'wss://api.codealgo.live',
    'https://vercel.live',
    'https://*.vercel.live',
    ...(isDev ? ['http://localhost:5000', 'ws://localhost:5000'] : []),
  ];

  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    try {
      const parsed = new URL(publicApiUrl);
      if (!origins.includes(parsed.origin)) {
        origins.push(parsed.origin);
      }
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsOrigin = `${wsProto}//${parsed.host}`;
      if (!origins.includes(wsOrigin)) {
        origins.push(wsOrigin);
      }
    } catch {}
  }

  const connectSrc = origins.join(' ');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://vercel.live https://*.vercel.live`,
    "style-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live",
    "img-src 'self' data: https:",
    `connect-src ${connectSrc} https://vercel.live https://*.vercel.live https://api.razorpay.com https://*.razorpay.com https://cdn.razorpay.com https://*.cdn.razorpay.com`,
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://vercel.live https://*.vercel.live",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|sitemap-images.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
