import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PermitIQ by Aureon — NYC Building Code Compliance Checker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
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
          color: '#2563EB', fontSize: 20, fontWeight: 600,
          marginBottom: 24, letterSpacing: 3,
          textTransform: 'uppercase' as const,
        }}>
          NYC Code Compliance
        </div>
        <div style={{
          color: '#ffffff', fontSize: 56, fontWeight: 700,
          lineHeight: 1.1, maxWidth: 800, marginBottom: 32,
        }}>
          PermitIQ by Aureon
        </div>
        <div style={{
          color: '#94a3b8', fontSize: 28, maxWidth: 700,
        }}>
          AI-powered compliance checks against 112+ NYC DOB requirements
        </div>
        <div style={{
          marginTop: 48, display: 'flex', gap: 16,
        }}>
          <div style={{
            background: '#2563EB', color: '#fff',
            padding: '12px 28px', borderRadius: 8, fontSize: 18,
          }}>
            Upload Your Plans Free
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
