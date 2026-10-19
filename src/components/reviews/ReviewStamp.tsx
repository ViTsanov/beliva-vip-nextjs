// Картинките до името в отзивите — пощенски марки с перфорирани ръбове, нарисувани като SVG
// (пътешественик в планината, пътешественичка на плажа, семейство, или само първата буква от името).
// Ползват се във формата за отзив, в картите с отзиви и в прозореца за четене.
// avatarId в базата остава същият ('none' | 'man' | 'woman' | 'family'), така че старите отзиви също се показват.

import type { ReactNode } from 'react';

export const REVIEW_AVATARS = [
  { id: 'none', label: 'Инициал' },
  { id: 'man', label: 'Мъж' },
  { id: 'woman', label: 'Жена' },
  { id: 'family', label: 'Семейство' },
] as const;

export type ReviewAvatarId = (typeof REVIEW_AVATARS)[number]['id'];

const NAVY = '#0f172a';
const GOLD = '#d4af37';
const CREAM = '#f7f0e4';
const SKY = '#dbe4ef';
const RIDGE = '#b6c3d6';
const SEA = '#9fb3cc';

// Марката е 72×88; рисунката е в рамка 58×74, отместена с 7.
const W = 72;
const H = 88;
const INSET = 7;
const HOLE = 2.4;

// Контур на хартията: правоъгълник с полукръгли "зъбци" по ръбовете (перфорацията).
// Обикаля по часовниковата стрелка; sweep 0 огъва дъгата навътре.
function perforatedPath(): string {
  const parts = ['M0 0'];
  const edge = (length: number, point: (t: number) => string, arcTo: (t: number) => string) => {
    const count = Math.round(length / 8);
    const step = length / count;
    for (let i = 0; i < count; i++) {
      const center = step * (i + 0.5);
      parts.push(`L${point(center - HOLE)}`, `A${HOLE} ${HOLE} 0 0 0 ${arcTo(center + HOLE)}`);
    }
  };
  edge(W, t => `${t} 0`, t => `${t} 0`);
  parts.push(`L${W} 0`);
  edge(H, t => `${W} ${t}`, t => `${W} ${t}`);
  parts.push(`L${W} ${H}`);
  edge(W, t => `${W - t} ${H}`, t => `${W - t} ${H}`);
  parts.push(`L0 ${H}`);
  edge(H, t => `0 ${H - t}`, t => `0 ${H - t}`);
  parts.push('Z');
  return parts.join(' ');
}

const PAPER = perforatedPath();

// Силует на човек, нарисуван около (0,0) = точката между стъпалата; височина 22 при scale 1.
// hat: 'cap' (шапка с козирка) или 'sunhat' (сламена шапка); backpack и stick — за пътешественика.
interface PersonProps {
  x: number;
  feet: number;
  scale?: number;
  dress?: boolean;
  hat?: 'cap' | 'sunhat';
  backpack?: boolean;
  stick?: boolean;
}

function Person({ x, feet, scale = 1, dress = false, hat, backpack = false, stick = false }: PersonProps) {
  return (
    <g transform={`translate(${x} ${feet}) scale(${scale})`} fill={NAVY}>
      {stick && <path d="M-6 -13 L-8 0" stroke={NAVY} strokeWidth="0.9" strokeLinecap="round" fill="none" />}
      {backpack && <rect x="3.4" y="-14.6" width="4.4" height="7.6" rx="1.3" fill="#334155" />}
      <circle cx="0" cy="-18.6" r="3.4" />
      {dress ? (
        <path d="M-3 -14 L3 -14 L6 -5 L-6 -5 Z" />
      ) : (
        <path d="M-4.2 -14 L4.2 -14 L3.4 -7 L-3.4 -7 Z" />
      )}
      <rect x="-3.2" y={dress ? -6 : -7.5} width="2.6" height={dress ? 6 : 7.5} rx="0.6" />
      <rect x="0.6" y={dress ? -6 : -7.5} width="2.6" height={dress ? 6 : 7.5} rx="0.6" />
      {hat === 'cap' && (
        <>
          <path d="M-3.8 -19.6 h7.6 v-0.8 a3.8 3.2 0 0 0 -7.6 0 Z" />
          <path d="M3.4 -19.9 h3.2" stroke={NAVY} strokeWidth="1.1" strokeLinecap="round" />
        </>
      )}
      {hat === 'sunhat' && (
        <>
          <ellipse cx="0" cy="-20.6" rx="6.6" ry="1.4" />
          <path d="M-3.4 -20.8 a3.4 3.2 0 0 1 6.8 0 Z" />
        </>
      )}
    </g>
  );
}

function Hiker() {
  return (
    <>
      <rect width="58" height="74" fill={SKY} />
      <circle cx="45" cy="13" r="6.5" fill={GOLD} />
      <path d="M0 42 L12 26 L21 35 L33 18 L46 33 L58 25 L58 74 L0 74 Z" fill={RIDGE} />
      <path d="M33 18 L29.4 22.6 L31.6 22.2 L33 24.2 L34.6 22.2 L37 22.8 Z" fill="#fff" />
      <path d="M0 63 Q29 58 58 63 L58 74 L0 74 Z" fill={CREAM} />
      <Person x={26} feet={71} scale={1.5} hat="cap" backpack stick />
    </>
  );
}

function Beach() {
  return (
    <>
      <rect width="58" height="74" fill={CREAM} />
      <circle cx="38" cy="40" r="11" fill={GOLD} />
      <rect y="40" width="58" height="19" fill={SEA} />
      <path d="M5 45 h7 M27 48 h9 M44 44 h8 M10 53 h6 M40 54 h7" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <rect y="59" width="58" height="15" fill="#ecdcb8" />
      {/* палма */}
      <path d="M51 73 Q54 52 47 28" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <g fill={NAVY}>
        <path d="M47 28 Q38 23 30 28 Q39 25.5 47 28 Z" />
        <path d="M47 28 Q43 17 34 16 Q42 20.5 47 28 Z" />
        <path d="M47 28 Q51 17 59 17 Q52 21 47 28 Z" />
        <path d="M47 28 Q56 25 60 31 Q54 27.5 47 28 Z" />
      </g>
      <Person x={22} feet={71} scale={1.5} dress hat="sunhat" />
    </>
  );
}

function Family() {
  return (
    <>
      <rect width="58" height="74" fill={SKY} />
      <circle cx="47" cy="12" r="5.5" fill={GOLD} />
      {/* самолет и следа му */}
      <path d="M21 19 Q30 25 42 24" stroke={NAVY} strokeWidth="0.9" strokeDasharray="2 2" fill="none" strokeLinecap="round" />
      <path d="M9.5 14.5 L20 18.2 L21.6 17.4 L20.6 19.2 L22 20.6 L20.4 20.4 L17.2 22.8 L17.8 20 L10.8 16.8 Z" fill={NAVY} />
      <path d="M0 62 Q29 56 58 62 L58 74 L0 74 Z" fill={CREAM} />
      <Person x={12.5} feet={71} scale={1.3} />
      <Person x={45.5} feet={71} scale={1.3} dress />
      <Person x={29} feet={71} scale={0.85} />
      {/* хванати ръце: от рамото на възрастния до рамото на детето */}
      <path d="M17.6 53.6 L25.8 59.6 M32.2 59.6 L41.6 53.6" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function Initial({ letter }: { letter: string }) {
  return (
    <>
      <rect width="58" height="74" fill={NAVY} />
      <text
        x="29"
        y="49"
        textAnchor="middle"
        fill={GOLD}
        style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}
        fontStyle="italic"
        fontWeight="700"
        fontSize={letter.length > 1 ? 24 : 38}
      >
        {letter}
      </text>
    </>
  );
}

// Пощенско клеймо върху избраната марка — показва, че е "изпратена" с отзива
function Postmark() {
  return (
    <svg viewBox="0 0 44 44" className="postmark pointer-events-none absolute -bottom-3 -right-4 h-11 w-11" aria-hidden="true">
      {/* бял ореол — клеймото се чете и върху тъмната марка */}
      <g fill="none" stroke="#fff" strokeOpacity="0.9">
        <circle cx="22" cy="22" r="17" strokeWidth="3.4" />
        <circle cx="22" cy="22" r="12.5" strokeWidth="2.8" />
        <path d="M13.5 22.5 l5 5 l12 -12" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g fill="none" stroke={NAVY} strokeOpacity="0.82">
        <circle cx="22" cy="22" r="17" strokeWidth="1.6" />
        <circle cx="22" cy="22" r="12.5" strokeWidth="1" />
        <path d="M13.5 22.5 l5 5 l12 -12" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

interface ReviewStampProps {
  avatarId?: string;
  name?: string;
  /** Широчина в px (височината следва пропорцията); без нея — цялата ширина на родителя */
  size?: number;
  postmarked?: boolean;
  className?: string;
}

export function initialOf(name?: string): string {
  const letter = name?.trim().charAt(0);
  return letter ? letter.toUpperCase() : 'Аа';
}

export default function ReviewStamp({ avatarId, name, size, postmarked = false, className = '' }: ReviewStampProps) {
  let art: ReactNode;
  if (avatarId === 'man') art = <Hiker />;
  else if (avatarId === 'woman') art = <Beach />;
  else if (avatarId === 'family') art = <Family />;
  else art = <Initial letter={initialOf(name)} />;

  // Без size марката заема цялата ширина на родителя (в избора на картинка)
  const box = size ? { width: size, height: (size * H) / W } : { width: '100%', aspectRatio: `${W} / ${H}` };

  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full overflow-visible" aria-hidden="true">
        <path d={PAPER} fill="#fff" stroke="#cbd5e1" strokeWidth="0.8" />
        {/* Вложеният svg изрязва рисунката по рамката, без нужда от clipPath с id */}
        <svg x={INSET} y={INSET} width="58" height="74" viewBox="0 0 58 74">
          {art}
        </svg>
        <rect x={INSET} y={INSET} width="58" height="74" rx="1" fill="none" stroke={NAVY} strokeOpacity="0.12" />
      </svg>
      {postmarked && <Postmark />}
    </span>
  );
}
