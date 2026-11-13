// Туроператор/партньор от Настройки → Турооператори (Firestore settings/operators, поле list).
// name е краткото име, записано в tour.operator („2МКО“, „Дари Тур“). Останалите полета са по избор:
// юридическите данни отиват в офертата към клиента (чл. 82, ал. 1, т. 2 ЗТ — наименование, седалище, адрес,
// телефон, имейл на туроператора), а комисионната — в „Справки“.
export interface Operator {
  name: string;
  email: string;
  legalName?: string;      // „2М-КО“ ООД
  eik?: string;
  regNumber?: string;      // рег. № в регистъра на туроператорите
  address?: string;        // седалище и адрес на управление
  phone?: string;
  termsUrl?: string;       // линк към актуалните Общи условия на туроператора
  commissionPercent?: number;
}

export function normalizeOperators(raw: unknown): Operator[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o: any) => (typeof o === 'string' ? { name: o, email: '' } : { ...o, name: o?.name || '', email: o?.email || '' }));
}

// Абзацът „Организатор на пътуването“ за офертата. Липсващите данни се отбелязват, за да не тръгне оферта без тях.
export function operatorOfferBlock(op: Operator | undefined, fallbackName = ''): string {
  if (!op) return `Организатор на пътуването (туроператор): ${fallbackName || '[попълни]'}`;
  const lines = [
    `Организатор на пътуването (туроператор): ${op.legalName || op.name}`,
    op.regNumber ? `Регистрационен № ${op.regNumber}` : '',
    op.eik ? `ЕИК ${op.eik}` : '',
    `Седалище и адрес: ${op.address || '[попълни в Настройки → Турооператори]'}`,
    `Телефон: ${op.phone || '[попълни]'} · Имейл: ${op.email || '[попълни]'}`,
    op.termsUrl ? `Общи условия на туроператора: ${op.termsUrl}` : 'Общи условия на туроператора: [прикачи или постави линк]',
  ];
  return lines.filter(Boolean).join('\n');
}
