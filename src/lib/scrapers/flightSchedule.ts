// src/lib/scrapers/flightSchedule.ts
//
// Дари Тур дава полетите в съкратения формат на резервационните системи:
//   „2 TK 196 21MAR ISTPEK KK26 1705 0700 +1“
// = сегмент 2, Turkish Airlines TK 196, 21 март, Истанбул (IST) → Пекин (PEK), излитане 17:05, кацане 07:00 на следващия ден.
// Тук го превеждаме на четим български, за да се вижда така в админ панела, на сайта и в PDF-а. Редове, които не
// са в този формат, остават както са.

const MONTHS: Record<string, string> = {
  JAN: 'януари', FEB: 'февруари', MAR: 'март', APR: 'април', MAY: 'май', JUN: 'юни',
  JUL: 'юли', AUG: 'август', SEP: 'септември', OCT: 'октомври', NOV: 'ноември', DEC: 'декември',
};

// Летищата по дестинациите, до които пътуваме. Непознат код остава само като код.
const AIRPORTS: Record<string, string> = {
  SOF: 'София', VAR: 'Варна', BOJ: 'Бургас', PDV: 'Пловдив',
  IST: 'Истанбул', SAW: 'Истанбул', DOH: 'Доха', DXB: 'Дубай', AUH: 'Абу Даби', CAI: 'Кайро',
  FRA: 'Франкфурт', MUC: 'Мюнхен', VIE: 'Виена', ZRH: 'Цюрих', AMS: 'Амстердам', CDG: 'Париж', ORY: 'Париж',
  LHR: 'Лондон', LGW: 'Лондон', MAD: 'Мадрид', BCN: 'Барселона', LIS: 'Лисабон', FCO: 'Рим', MXP: 'Милано',
  ATH: 'Атина', WAW: 'Варшава', HEL: 'Хелзинки', CPH: 'Копенхаген',
  PEK: 'Пекин', PKX: 'Пекин', PVG: 'Шанхай', SHA: 'Шанхай', CAN: 'Гуанджоу', XIY: 'Сиан', CTU: 'Чънду', TFU: 'Чънду',
  CKG: 'Чунцин', KWL: 'Гуейлин', HKG: 'Хонг Конг', MFM: 'Макао', TPE: 'Тайпе',
  NRT: 'Токио', HND: 'Токио', KIX: 'Осака', ITM: 'Осака', ICN: 'Сеул', GMP: 'Сеул',
  BKK: 'Банкок', DMK: 'Банкок', HKT: 'Пукет', CNX: 'Чианг Май', SIN: 'Сингапур', KUL: 'Куала Лумпур',
  CGK: 'Джакарта', DPS: 'Бали', HAN: 'Ханой', SGN: 'Хо Ши Мин', DAD: 'Дананг', PNH: 'Пном Пен', REP: 'Сием Реп',
  DEL: 'Делхи', BOM: 'Мумбай', CMB: 'Коломбо', MLE: 'Малдиви', KTM: 'Катманду',
  SYD: 'Сидни', MEL: 'Мелбърн', BNE: 'Бризбейн', CNS: 'Кернс', AKL: 'Окланд', CHC: 'Крайстчърч', ZQN: 'Куинстаун', PPT: 'Папеете',
  JFK: 'Ню Йорк', EWR: 'Ню Йорк', LAX: 'Лос Анджелис', SFO: 'Сан Франциско', LAS: 'Лас Вегас', ORD: 'Чикаго', MIA: 'Маями',
  YYZ: 'Торонто', MEX: 'Мексико Сити', CUN: 'Канкун', HAV: 'Хавана', PTY: 'Панама Сити', BOG: 'Богота',
  LIM: 'Лима', CUZ: 'Куско', AQP: 'Арекипа', EZE: 'Буенос Айрес', AEP: 'Буенос Айрес', IGR: 'Игуасу', IGU: 'Игуасу',
  GRU: 'Сао Пауло', GIG: 'Рио де Жанейро', SCL: 'Сантяго', UYU: 'Уюни', LPB: 'Ла Пас',
  JNB: 'Йоханесбург', CPT: 'Кейптаун', VFA: 'Виктория Фолс', WDH: 'Виндхук', NBO: 'Найроби', ZNZ: 'Занзибар',
};

const airport = (code: string) => (AIRPORTS[code] ? `${AIRPORTS[code]} (${code})` : code);
const time = (hhmm: string) => `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;

// „2 TK 196 21MAR ISTPEK KK26 1705 0700 +1“ (номерът на сегмента, статусът KK26 и „+1“ може да липсват)
const GDS_LINE = /^(?:\d{1,2}\s+)?([A-Z0-9]{2})\s*(\d{1,4})\s+(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+(?:[A-Z]{2}\d*\s+)?(\d{4})\s+(\d{4})(\s*\+\s*1)?/;

export function readableFlightLine(line: string): string {
  const m = line.trim().match(GDS_LINE);
  if (!m || !MONTHS[m[4]]) return line;
  const [, airline, number, day, mon, from, to, dep, arr, nextDay] = m;
  return `${parseInt(day, 10)} ${MONTHS[mon]} – полет ${airline} ${number} ${airport(from)} – ${airport(to)}, ` +
    `излитане ${time(dep)}, кацане ${time(arr)}${nextDay ? ' на следващия ден' : ''}`;
}

export const readableFlightInfo = (text: string) =>
  text.split('\n').map(readableFlightLine).join('\n');

// Резерва, когато туроператорът няма отделен раздел с полети (напр. Дари Тур — Дубай): часовете са в самата програма
// („1-ви ДЕН Излитане от летище София в 14:25 ч. с директен полет на Fly Dubai. Кацане в Дубай в 21:25 ч.“).
// Взимаме изреченията, в които има и полет/излитане/кацане, и час — по един ред на ден: „Ден 1: …“.
const FLIGHT_WORD = /полет|излит|каца|кацн/i;
const CLOCK = /(?<!\d)\d{1,2}[:.,]\d{2}(?!\d)\s*(?:ч|h)?/i;
const DAY_PREFIX = /^\s*(?:\d{1,2}\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*ден(?![а-яА-Я])|ден\s*\d{1,2})\s*[–\-—:]?\s*/i;

export function flightsFromProgram(days: { day: number; description: string }[]): string {
  // Някои програми споменават полетите без часове („Полет на Турските авиолинии от София до Токио през Истанбул.“) —
  // тогава взимаме тези изречения: авиокомпания и маршрут са пак полезни.
  return flightSentences(days, true) || flightSentences(days, false);
}

/** Има ли поне един час в текста с полети (иначе страницата дава само маршрути — „София - Истанбул - Банкок“). */
export const hasFlightTimes = (text: string) => CLOCK.test(text);

function flightSentences(days: { day: number; description: string }[], withClock: boolean): string {
  return days.map((d) => {
    const kept: string[] = [];
    let prevKept = false;
    // Изречения: „ч.“, „г.“ и „ул.“ не са край на изречение („В 21:05ч. полет София – Истанбул“ е едно изречение),
    // освен ако следва главна буква („…в 15:35ч. Трансфер до хотел.“)
    for (const raw of d.description.replace(DAY_PREFIX, '').split(/(?<=[.!?])(?<![чЧгГ]\.|ул\.)\s+|(?<=[чЧ]\.)\s+(?=[А-ЯA-Z])/)) {
      // Датата в началото („28.04.2027 –“) не е час — махаме я, за да не дублира
      const s = raw.replace(/^\d{1,2}\.\d{1,2}\.\d{2,4}\s*[–\-—]?\s*/, '').trim();
      const hasClock = CLOCK.test(s);
      // Полет с час — и веднага след него изречението с часа на пристигане („Пристигане в Истанбул в 22:35ч.“)
      const keep: boolean = withClock
        ? hasClock && (FLIGHT_WORD.test(s) || (prevKept && /пристиг/i.test(s)))
        : /полет/i.test(s);
      if (keep) kept.push(s);
      prevKept = keep;
    }
    return kept.length ? `Ден ${d.day}: ${kept.join(' ')}` : '';
  }).filter(Boolean).join('\n');
}
