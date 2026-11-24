import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Wedding PhotoArt — Wedding Photography & Cinematography | Feni, Bangladesh';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  let logoSrc: string | null = null;
  try {
    const logoBuffer = await readFile(
      join(process.cwd(), 'public', 'brand', 'wedding-photoart-mark.png'),
    );
    logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    logoSrc = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #14120E 0%, #1F1B13 55%, #2D2618 100%)',
          color: '#F4EFE4',
          border: '2px solid rgba(202, 166, 80, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt="Wedding PhotoArt"
                width={84}
                height={84}
                style={{ borderRadius: '18px', border: '1px solid rgba(202, 166, 80, 0.45)' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: '#FFFFFF',
                }}
              >
                Wedding PhotoArt
              </span>
              <span
                style={{
                  fontSize: 15,
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  color: '#E7D1AA',
                  marginTop: 6,
                }}
              >
                Feni • Photo &amp; Cinema
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: 16,
              color: '#E7D1AA',
              border: '1px solid rgba(202, 166, 80, 0.45)',
              borderRadius: '999px',
              padding: '8px 20px',
            }}
          >
            weddingphotoart.com
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '940px' }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.08,
              color: '#FFFFFF',
            }}
          >
            Timeless Wedding Photography &amp; Cinema.
          </div>
          <div
            style={{
              fontSize: 25,
              lineHeight: 1.4,
              color: '#D5CDB8',
            }}
          >
            True-to-life color, fine natural light, and heartfelt storytelling for Weddings,
            Holud, Receptions &amp; Pre-Wedding sessions across Bangladesh.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.14)',
            paddingTop: '24px',
            fontSize: 18,
            color: '#C7BFA9',
          }}
        >
          <span>Grand Haque Tower (5th Fl), Mizan Rd, Feni</span>
          <span style={{ color: '#E7D1AA', fontWeight: 600 }}>+880 1855-585601</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
