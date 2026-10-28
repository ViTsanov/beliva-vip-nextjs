// Загрява снимките след публикуване: node scripts/warm-images.mjs [https://belivavip.bg] [част от адреса, напр. destinations]
//
// Next.js прави всяка снимка в нужния размер (/_next/image) чак при първото ѝ поискване — на сървъра с 512 MB това
// е 1.5–2 s за снимка, и кешът започва празен след всяко публикуване. Затова първият посетител на страница на
// държава или тур чакаше. Скриптът минава през всички страници от sitemap.xml и иска всяка снимка в ширините,
// които реално ползват телефоните (640–1080) и широките екрани за големите снимки (1920). След това и сървърът,
// и CDN-ът ги имат готови. По две заявки наведнъж, за да не претовари сървъра.
const BASE = (process.argv[2] || 'https://belivavip.bg').replace(/\/$/, '');
const PHONE_WIDTHS = [640, 750, 828, 1080];
const WIDE_WIDTH = 1920; // само за снимки на цял екран (sizes 100vw / 130vw)
const PARALLEL = 2;
const ONLY = process.argv[3]; // по желание: само страници, чийто адрес съдържа този текст

const decode = (s) => s.replace(/&amp;/g, '&');

async function pageImages(path) {
  const html = await (await fetch(BASE + path)).text();
  const found = new Map(); // адрес без w= → дали е на цял екран
  const tags = [...html.matchAll(/<img\b[^>]*>/g), ...html.matchAll(/<link rel="preload"[^>]*as="image"[^>]*>/g)].map((m) => m[0]);
  for (const tag of tags) {
    const srcset = decode((tag.match(/(?:srcSet|srcset|imageSrcSet|imagesrcset)="([^"]*)"/) || [])[1] || '');
    const sizes = (tag.match(/(?:sizes|imageSizes|imagesizes)="([^"]*)"/) || [])[1] || '';
    const first = srcset.split(',')[0]?.trim().split(' ')[0];
    if (!first || !first.startsWith('/_next/image')) continue;
    const key = first.replace(/([?&])w=\d+/, '$1w=W');
    found.set(key, found.get(key) || /\b1[03]0vw\b/.test(sizes));
  }
  return found;
}

async function main() {
  const sitemap = await (await fetch(BASE + '/sitemap.xml')).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
    .filter((p) => !ONLY || p.includes(ONLY));
  const all = new Map();
  for (const p of paths) {
    for (const [k, wide] of await pageImages(p)) all.set(k, all.get(k) || wide);
  }
  const urls = [];
  for (const [k, wide] of all) {
    for (const w of [...PHONE_WIDTHS, ...(wide ? [WIDE_WIDTH] : [])]) urls.push(BASE + k.replace('w=W', `w=${w}`));
  }
  console.log(`${paths.length} страници, ${all.size} снимки, ${urls.length} размера за загряване`);

  let done = 0, slow = 0, failed = 0;
  const started = Date.now();
  const worker = async () => {
    while (urls.length) {
      const u = urls.shift();
      const t = Date.now();
      try {
        const r = await fetch(u, { headers: { Accept: 'image/webp,image/*' } });
        await r.arrayBuffer();
        if (!r.ok) failed++;
        if (Date.now() - t > 800) slow++; // правена сега, не от кеша
      } catch {
        failed++;
      }
      if (++done % 50 === 0) console.log(`  ${done} готови…`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  console.log(`Готово за ${Math.round((Date.now() - started) / 1000)} s: ${done} размера, ${slow} направени сега, ${failed} грешки`);
}

main().catch((e) => { console.error(e); process.exit(1); });
