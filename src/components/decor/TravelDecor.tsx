// Украси за фона на секциите — палма, линии като на карта (изохипси) и пунктирен маршрут.
// Само SVG, без състояние и без движение — ползват се и от сървърни, и от клиентски компоненти.
// Цветът идва от currentColor (text-… клас), прозрачността — от класа или от opacity на родителя.

// Палма — силует от ствол и листа, всички излизат от върха (104, 110)
export function PalmSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 300" className={className} fill="currentColor" aria-hidden="true">
      <path d="M100 300 C104 230 112 170 104 110" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      <path d="M104 110 C70 80 35 85 8 112 C40 96 70 99 104 110 Z" />
      <path d="M104 110 C140 78 175 82 196 108 C168 94 138 97 104 110 Z" />
      <path d="M104 110 C85 70 60 45 28 40 C62 60 82 82 104 110 Z" />
      <path d="M104 110 C120 68 145 45 176 42 C145 62 125 84 104 110 Z" />
      <path d="M104 110 C100 75 106 44 122 18 C112 50 110 80 104 110 Z" />
      <path d="M104 110 C80 105 55 125 44 162 C62 132 82 118 104 110 Z" />
      <path d="M104 110 C130 108 152 128 162 164 C146 135 126 120 104 110 Z" />
    </svg>
  );
}

// Затворена „вълниста“ линия около центъра (200, 200): точки по окръжност с радиус, който леко се люшка,
// свързани с гладки криви (Catmull-Rom → Bézier). Детерминистично — сървърът и браузърът рисуват едно и също.
function contourPath(radius: number, phase: number): string {
  const n = 12;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (1 + 0.09 * Math.sin(3 * a + phase) + 0.05 * Math.cos(5 * a - phase));
    return [200 + r * Math.cos(a), 200 + r * Math.sin(a)];
  });
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

const CONTOURS = [40, 75, 110, 145, 180].map((r, i) => contourPath(r, i * 0.45));

// Изохипси — няколко вложени вълнисти кръга, като релеф на географска карта
export function ContourLines({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {CONTOURS.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
