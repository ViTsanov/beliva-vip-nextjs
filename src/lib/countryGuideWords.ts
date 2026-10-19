// Броене на думите в текста „За <държава>“. Отделно от countryGuide.ts, защото онзи файл ползва Admin SDK
// и не може да влезе в браузъра — а админ екранът брои думите, докато се пише.

export const COUNTRY_GUIDE_MAX_WORDS = 200;

export type CountryGuideSections = { history: string; geography: string; economy: string; facts: string };

export const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Общо думи в четирите раздела (подзаглавието не се брои). */
export const sectionWords = (g: CountryGuideSections) =>
  countWords(`${g.history} ${g.geography} ${g.economy} ${g.facts}`);
