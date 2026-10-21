// src/lib/pdf/TourProgramPdf.tsx
//
// PDF „Програма на екскурзията“ — същата информация като страницата на тура, във вид за печат и изпращане:
// лого и контакти най-горе, снимка, заглавие, цена и дати, програма по дни, полети, какво включва / не включва,
// документи и условия. Рендира се на сървъра с @react-pdf/renderer (виж renderTourPdf.ts).
//
// Шрифтовете са тези на сайта (Inter за текста, Playfair Display за заглавията) — статични TTF файлове с кирилица
// в src/assets/fonts. Цветовете са от tailwind.config.ts.

import path from 'node:path';
import { Document, Page, View, Text, Image, Font, Link, StyleSheet } from '@react-pdf/renderer';
import { COMPANY_INFO } from '@/lib/companyInfo';

const FONTS_DIR = path.join(process.cwd(), 'src/assets/fonts');

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FONTS_DIR, 'Inter-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONTS_DIR, 'Inter-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(FONTS_DIR, 'Inter-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.register({
  family: 'Playfair',
  fonts: [
    { src: path.join(FONTS_DIR, 'PlayfairDisplay-Bold.ttf'), fontWeight: 700 },
    { src: path.join(FONTS_DIR, 'PlayfairDisplay-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(FONTS_DIR, 'PlayfairDisplay-BoldItalic.ttf'), fontWeight: 700, fontStyle: 'italic' },
  ],
});
// Без пренасяне на думи: вграденото е за английски и разделя българските думи на грешни места
Font.registerHyphenationCallback((word) => [word]);

const C = {
  dark: '#0f172a',
  gold: '#d4af37',
  goldDeep: '#7f620e',
  cream: '#f7f0e4',
  text: '#1e293b',
  muted: '#64748b',
  line: '#e2e8f0',
  green: '#059669',
  rose: '#e11d48',
};

const s = StyleSheet.create({
  // paddingTop е за следващите страници; лентата с логото на първата излиза до горния ръб с отрицателен marginTop
  // lineHeight нарочно НЕ е тук, а във всеки текстов стил: зададен на страницата, той спира текста с номера на
  // страницата (render) да се показва — грешка в @react-pdf.
  page: { fontFamily: 'Inter', fontSize: 10, color: C.text, paddingTop: 40, paddingBottom: 64, paddingHorizontal: 0 },
  body: { paddingHorizontal: 44 },

  // Горна лента — тъмносиня, като менюто на сайта върху снимка (логото е с бяло „B“ и на бяло не се вижда)
  header: { marginTop: -40, backgroundColor: C.dark, paddingHorizontal: 44, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, marginRight: 10 },
  brandName: { fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700, fontSize: 18, color: '#ffffff', lineHeight: 1.1 },
  brandGold: { color: C.gold },
  brandSub: { fontSize: 7, color: '#cbd5e1', letterSpacing: 1.2, marginTop: 3, textTransform: 'uppercase' },
  contacts: { alignItems: 'flex-end' },
  contactLine: { fontSize: 8.5, color: '#ffffff', lineHeight: 1.45, textDecoration: 'none' },
  contactMuted: { fontSize: 7.5, color: '#94a3b8', lineHeight: 1.45 },
  goldRule: { height: 3, backgroundColor: C.gold },

  photo: { width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, marginTop: 22 },

  kicker: { fontSize: 7.5, fontWeight: 700, color: C.goldDeep, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 20 },
  title: { fontFamily: 'Playfair', fontWeight: 700, fontSize: 25, color: C.dark, lineHeight: 1.2, marginTop: 6 },

  facts: { flexDirection: 'row', marginTop: 16, borderWidth: 1, borderColor: C.line, borderRadius: 10 },
  fact: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  factBorder: { borderLeftWidth: 1, borderLeftColor: C.line },
  factLabel: { fontSize: 7, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  factValue: { fontSize: 11, fontWeight: 700, color: C.dark, marginTop: 3, lineHeight: 1.3 },
  factOld: { fontSize: 8.5, color: C.muted, textDecoration: 'line-through' },

  datesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  dateChip: { fontSize: 8.5, fontWeight: 600, color: C.dark, backgroundColor: C.cream, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 7, marginRight: 5, marginBottom: 5 },

  intro: { fontSize: 10.5, color: C.text, marginTop: 14, lineHeight: 1.6 },

  section: { marginTop: 26 },
  sectionLabel: { fontSize: 7, fontWeight: 700, color: C.goldDeep, letterSpacing: 1.6, textTransform: 'uppercase' },
  sectionTitle: { fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 400, fontSize: 18, color: C.dark, marginTop: 2, marginBottom: 10, lineHeight: 1.2 },

  // Ден: ред „ДЕН 3 · заглавие“ и текстът под него, с тънка златна линия вляво. Без колони един до друг —
  // така дългите дни се пренасят на следващата страница по редове, без празни места.
  day: { marginBottom: 12, borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 12 },
  dayBadgeText: { fontSize: 8, fontWeight: 700, color: C.goldDeep, letterSpacing: 1.2, textTransform: 'uppercase' },
  dayTitle: { fontSize: 10.5, fontWeight: 700, color: C.dark, lineHeight: 1.35, marginBottom: 3 },
  // Без marginBottom: долен отстъп на последния абзац пречи на @react-pdf да раздели деня между две страници
  // (целият ден отиваше на следващата). Разстоянието между абзаците е отгоре (paraNext).
  para: { fontSize: 9.5, color: C.text, lineHeight: 1.55 },
  paraNext: { marginTop: 4 },

  flights: { backgroundColor: C.cream, borderRadius: 10, padding: 14 },
  flightLine: { flexDirection: 'row', marginBottom: 5 },
  flightDot: { width: 10, fontSize: 9.5, color: C.goldDeep, fontWeight: 700 },
  flightText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },

  listItem: { flexDirection: 'row', marginBottom: 4 },
  bullet: { width: 5, height: 5, borderRadius: 2.5, marginTop: 5, marginRight: 8 },
  listText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },

  cta: { marginTop: 28, backgroundColor: C.dark, borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaTitle: { fontFamily: 'Playfair', fontStyle: 'italic', fontSize: 16, color: '#ffffff', lineHeight: 1.2 },
  ctaText: { fontSize: 8.5, color: '#cbd5e1', marginTop: 3 },
  ctaContact: { fontSize: 10, fontWeight: 700, color: C.gold, textAlign: 'right', lineHeight: 1.5, textDecoration: 'none' },

  footerRule: { position: 'absolute', left: 44, right: 44, bottom: 40, height: 1, backgroundColor: C.line },
  footerLeft: { position: 'absolute', left: 44, bottom: 26, fontSize: 7, color: C.muted },
  // Изрична ширина: текстът с render (номер на страницата) се подрежда преди да е известно съдържанието му
  footerRight: { position: 'absolute', right: 44, width: 200, bottom: 26, fontSize: 7, color: C.muted, textAlign: 'right' },
});

export interface PdfTourData {
  title: string;
  kicker: string;              // държави / маршрут, над заглавието
  route: string;
  duration: string;            // „14 дни / 13 нощувки“
  price: string;               // „5 002 €“ или „По запитване“
  oldPrice?: string;           // при промоция — старата цена
  dates: string[];             // вече форматирани „05.02.2027“
  intro: string;
  days: { day: number; title: string; paragraphs: string[] }[];
  flights: string[];
  included: string[];
  excluded: string[];
  documents: string[];
  info: string[];
  photo?: Buffer | null;       // JPEG
  logo?: Buffer | null;        // PNG
  pageUrl: string;
  generatedOn: string;         // „21.10.2026“
}

const SITE = 'belivavip.bg';

function Section({ label, title, children, breakBefore = false }: { label: string; title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <View style={s.section} break={breakBefore}>
      {/* minPresenceAhead: заглавието не остава само в дъното на страницата */}
      <View minPresenceAhead={60}>
        <Text style={s.sectionLabel}>{label}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.listItem} wrap={false}>
          <View style={[s.bullet, { backgroundColor: color }]} />
          <Text style={s.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function TourProgramPdf({ tour }: { tour: PdfTourData }) {
  const phoneHref = `tel:${COMPANY_INFO.phone.replace(/\s+/g, '')}`;

  return (
    <Document title={`${tour.title} — програма | ${COMPANY_INFO.name}`} author={COMPANY_INFO.name} language="bg">
      <Page size="A4" style={s.page}>
        {/* Лого и контакти — само на първата страница; на всяка страница долу има кратък ред с контакти */}
        <View style={s.header}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image на @react-pdf (не HTML), няма alt */}
            {tour.logo && <Image src={tour.logo} style={s.logo} />}
            <View>
              <Text style={s.brandName}>Beliva <Text style={s.brandGold}>VIP</Text> Tour</Text>
              <Text style={s.brandSub}>Лицензирана туристическа агенция · {COMPANY_INFO.license}</Text>
            </View>
          </View>
          <View style={s.contacts}>
            <Link src={phoneHref} style={s.contactLine}>{COMPANY_INFO.phone}</Link>
            <Link src={`mailto:${COMPANY_INFO.email}`} style={s.contactLine}>{COMPANY_INFO.email}</Link>
            <Link src={`https://${SITE}`} style={s.contactLine}>{SITE}</Link>
            <Text style={s.contactMuted}>{COMPANY_INFO.workHours}</Text>
          </View>
        </View>
        <View style={s.goldRule} />

        <View style={s.body}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image на @react-pdf (не HTML), няма alt */}
          {tour.photo && <Image src={tour.photo} style={s.photo} />}

          {tour.kicker ? <Text style={s.kicker}>{tour.kicker}</Text> : null}
          <Text style={s.title}>{tour.title}</Text>

          <View style={s.facts} wrap={false}>
            <View style={s.fact}>
              <Text style={s.factLabel}>Продължителност</Text>
              <Text style={s.factValue}>{tour.duration || '—'}</Text>
            </View>
            <View style={[s.fact, s.factBorder]}>
              <Text style={s.factLabel}>Цена на човек</Text>
              <Text style={s.factValue}>{tour.price}</Text>
              {tour.oldPrice ? <Text style={s.factOld}>{tour.oldPrice}</Text> : null}
            </View>
            {tour.route ? (
              <View style={[s.fact, s.factBorder, { flex: 1.6 }]}>
                <Text style={s.factLabel}>Маршрут</Text>
                <Text style={[s.factValue, { fontSize: 9, fontWeight: 600 }]}>{tour.route}</Text>
              </View>
            ) : null}
          </View>

          {tour.dates.length > 0 && (
            <View style={{ marginTop: 12 }} wrap={false}>
              <Text style={s.factLabel}>Дати на отпътуване</Text>
              <View style={s.datesRow}>
                {tour.dates.map(d => <Text key={d} style={s.dateChip}>{d}</Text>)}
              </View>
            </View>
          )}

          {tour.intro ? <Text style={s.intro}>{tour.intro}</Text> : null}

          {tour.days.length > 0 && (
            <Section label="Ден по ден" title="Програма">
              {tour.days.map(d => (
                <View key={d.day} style={s.day}>
                  {/* Един Text (не ред от два елемента): ред с flexDirection: row не се разделя между страници и
                      целият ден отиваше на следващата, като оставяше празно място под заглавието „Програма“ */}
                  <Text style={s.dayTitle}>
                    <Text style={s.dayBadgeText}>Ден {d.day}{d.title ? '   ' : ''}</Text>{d.title}
                  </Text>
                  {d.paragraphs.map((p, i) => <Text key={i} style={i ? [s.para, s.paraNext] : s.para}>{p}</Text>)}
                </View>
              ))}
            </Section>
          )}

          {tour.flights.length > 0 && (
            <Section label="Полети" title="Полетна информация">
              <View style={s.flights}>
                {tour.flights.map((f, i) => (
                  <View key={i} style={s.flightLine} wrap={false}>
                    <Text style={s.flightDot}>–</Text>
                    <Text style={s.flightText}>{f}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {tour.included.length > 0 && (
            <Section label="Цената" title="Цената включва">
              <Bullets items={tour.included} color={C.green} />
            </Section>
          )}

          {tour.excluded.length > 0 && (
            <Section label="Цената" title="Цената не включва">
              <Bullets items={tour.excluded} color={C.rose} />
            </Section>
          )}

          {tour.documents.length > 0 && (
            <Section label="Преди пътуването" title="Необходими документи">
              <Bullets items={tour.documents} color={C.gold} />
            </Section>
          )}

          {tour.info.length > 0 && (
            <Section label="Условия" title="Допълнителна информация">
              {tour.info.map((p, i) => <Text key={i} style={i ? [s.para, s.paraNext] : s.para}>{p}</Text>)}
            </Section>
          )}

          <View style={s.cta} wrap={false}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={s.ctaTitle}>Запитвания и резервации</Text>
              <Text style={s.ctaText}>Ще отговорим на всички въпроси и ще запазим място за Вас.</Text>
              <Link src={tour.pageUrl} style={[s.ctaText, { color: C.gold, textDecoration: 'none' }]}>Онлайн: {tour.pageUrl.replace(/^https?:\/\//, '')}</Link>
            </View>
            <View>
              <Link src={phoneHref} style={s.ctaContact}>{COMPANY_INFO.phone}</Link>
              <Link src={`mailto:${COMPANY_INFO.email}`} style={s.ctaContact}>{COMPANY_INFO.email}</Link>
            </View>
          </View>
        </View>

        {/* Долният ред — на всяка страница (fixed). Преки деца на Page: вложени в обща View не се показваха */}
        <View style={s.footerRule} fixed />
        <Text style={s.footerLeft} fixed>{COMPANY_INFO.name} · {COMPANY_INFO.phone} · {COMPANY_INFO.email} · {SITE}</Text>
        <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `Актуално към ${tour.generatedOn} · стр. ${pageNumber} от ${totalPages}`} />
      </Page>
    </Document>
  );
}
