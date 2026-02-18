import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Взимаме параметрите от URL-а
    const title = searchParams.get('title') || 'Beliva VIP Tour';
    const price = searchParams.get('price');
    const image = searchParams.get('image');

    // Ако няма снимка, ползваме тази на Австралия като фон
    const bgImage = image || 'https://belivavip.bg/hero/australia.webp';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            position: 'relative',
          }}
        >
          {/* ФОНОВА СНИМКА */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage}
            alt="Background"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.6, // Тъмен филтър
            }}
          />

          {/* ТЪМЕН СЛОЙ ЗА ЧЕТЛИВОСТ */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          />

          {/* ЛОГО (ГОРЕ ВЛЯВО) */}
          <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex' }}>
             <span style={{ fontSize: 30, color: 'white', fontWeight: 900 }}>
                BELIVA <span style={{ color: '#d4af37' }}>VIP</span> TOUR
             </span>
          </div>

          {/* ЗАГЛАВИЕ */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 60px',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <h1
              style={{
                fontSize: 60,
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.1,
                marginBottom: 20,
                textShadow: '0 4px 30px rgba(0,0,0,0.5)',
              }}
            >
              {title}
            </h1>

            {price && price !== 'По запитване' && (
              <div
                style={{
                  backgroundColor: '#d4af37',
                  color: '#000',
                  fontSize: 32,
                  fontWeight: 700,
                  padding: '10px 30px',
                  borderRadius: 50,
                  marginTop: 20,
                }}
              >
                Цена от {price}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}