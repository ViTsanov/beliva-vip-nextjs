// Автоматично изтриване на лични данни по сроковете от Политиката за поверителност (/privacy, т. 7).
// Ако смениш срок тук — смени го и в текста на политиката (и обратно).
//
//   • Запитване без резервация (статус ≠ „Платено“) — цялото запитване се трие 6 месеца след последната
//     комуникация, но само ако датата на пътуването е минала или не е известна (не трием чакащи бъдещи пътувания).
//   • ЕГН, номер и валидност на паспорта, снимки на паспорти — 6 месеца след края на пътуването
//     (в запитването, в историята на пътуванията на клиента и в профила му — по последното му пътуване).
//   • Платени запитвания (договор, кореспонденция, плащания) и групите за заминаване — 5 години след края на пътуването.
//   • Профил на клиент — 5 години след последното му пътуване (или последна промяна, ако няма пътувания).
//   • Въпроси от AI чата — 6 месеца.
//
// Поле retentionHold: true на запитване или клиент спира всичко за него (рекламация, спор) до махането му.
// Счетоводните документи (10 години) не са в сайта — пазят се при счетоводителя.

const DAY = 24 * 60 * 60 * 1000;
const PERSONAL_DATA_MONTHS = 6; // ЕГН/паспорт след пътуването, запитвания без резервация, AI чат
const RECORDS_YEARS = 5;        // договори, кореспонденция, плащания, профили на клиенти
const DEFAULT_TRIP_DAYS = 21;   // когато не знаем продължителността — по-дълго, за да не изтрием рано
const SENSITIVE_TRAVELER_FIELDS = ["egn", "passportNumber", "passportValidity", "passportPhoto"];

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

// Дата от Firestore Timestamp, ISO текст, „ДД.ММ.ГГГГ“ или число (ms) — в записите се срещат всички.
function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string") return null;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const bg = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (bg) return new Date(Date.UTC(+bg[3], +bg[2] - 1, +bg[1]));
  return null;
}

function latest(dates) {
  const valid = dates.filter((d) => d && !isNaN(d.getTime()));
  return valid.length ? new Date(Math.max(...valid.map((d) => d.getTime()))) : null;
}

// Продължителност на екскурзията в дни: durationDays, „10 дни“ в duration, или нощувки + 1.
function tripDays(tour) {
  if (!tour) return DEFAULT_TRIP_DAYS;
  const fromNumber = (v) => {
    const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) && n > 0 && n < 120 ? n : null;
  };
  return fromNumber(tour.durationDays) || fromNumber(tour.duration) || (fromNumber(tour.nights) ? fromNumber(tour.nights) + 1 : null) || DEFAULT_TRIP_DAYS;
}

function tripEnd(dateValue, tourId, toursById) {
  const start = toDate(dateValue);
  if (!start) return null;
  return new Date(start.getTime() + tripDays(toursById.get(tourId)) * DAY);
}

function hasSensitive(traveler) {
  return !!traveler && SENSITIVE_TRAVELER_FIELDS.some((f) => traveler[f]);
}

// Пазим името по паспорт (част от записа за договора), махаме ЕГН, паспорт, валидност и снимка.
function stripTraveler(traveler) {
  const clean = { ...traveler };
  for (const f of SENSITIVE_TRAVELER_FIELDS) clean[f] = "";
  return clean;
}

async function runRetention({ db, bucket, dryRun = true, now = new Date(), log = console.log }) {
  const personalCutoff = addMonths(now, -PERSONAL_DATA_MONTHS);
  const recordsCutoff = addMonths(now, -12 * RECORDS_YEARS);
  const report = {
    dryRun,
    inquiriesDeleted: 0,
    inquiriesStripped: 0,
    customersDeleted: 0,
    customersStripped: 0,
    customerTripsStripped: 0,
    groupsDeleted: 0,
    chatQuestionsDeleted: 0,
    photosDeleted: 0,
    undatedReservations: [],
  };

  const toursById = new Map();
  (await db.collection("tours").get()).forEach((d) => toursById.set(d.id, d.data()));

  const ops = [];      // { ref, type: 'delete' | 'update', data? }
  const photoPaths = new Set();   // конкретни файлове за изтриване
  const photoPrefixes = new Set(); // папки passport-scans/<inquiryId>/ за изтриване

  // --- Клиенти (първо — трябва да знаем кои снимки още се ползват от запазени профили) ---
  const keptPhotos = new Set();
  const customersSnap = await db.collection("customers").get();
  for (const doc of customersSnap.docs) {
    const c = doc.data();
    const history = Array.isArray(c.tripHistory) ? c.tripHistory : [];
    const ends = history.map((t) => tripEnd(t.date, t.tourId, toursById));
    const lastTripEnd = latest(ends);
    const lastActivity = latest([lastTripEnd, toDate(c.updatedAt), toDate(c.createdAt)]);

    if (c.retentionHold) {
      if (c.passportPhoto) keptPhotos.add(c.passportPhoto);
      history.forEach((t) => (t.travelers || []).forEach((tr) => tr?.passportPhoto && keptPhotos.add(tr.passportPhoto)));
      continue;
    }

    if (lastActivity && lastActivity < recordsCutoff) {
      ops.push({ ref: doc.ref, type: "delete" });
      if (c.passportPhoto) photoPaths.add(c.passportPhoto);
      history.forEach((t) => (t.travelers || []).forEach((tr) => tr?.passportPhoto && photoPaths.add(tr.passportPhoto)));
      report.customersDeleted++;
      continue;
    }

    const update = {};
    // Паспортът в профила — 6 месеца след последното пътуване (без пътувания — след последната промяна).
    const profileAnchor = lastTripEnd || lastActivity;
    if (hasSensitive(c) && profileAnchor && profileAnchor < personalCutoff) {
      for (const f of SENSITIVE_TRAVELER_FIELDS) update[f] = "";
      if (c.passportPhoto) photoPaths.add(c.passportPhoto);
      report.customersStripped++;
    } else if (c.passportPhoto) {
      keptPhotos.add(c.passportPhoto);
    }

    // Паспортите в историята на пътуванията — по края на всяко пътуване.
    let historyChanged = false;
    const newHistory = history.map((t, i) => {
      const travelers = Array.isArray(t.travelers) ? t.travelers : [];
      const end = ends[i];
      if (end && end < personalCutoff && travelers.some(hasSensitive)) {
        historyChanged = true;
        report.customerTripsStripped++;
        travelers.forEach((tr) => tr?.passportPhoto && photoPaths.add(tr.passportPhoto));
        return { ...t, travelers: travelers.map(stripTraveler) };
      }
      travelers.forEach((tr) => tr?.passportPhoto && keptPhotos.add(tr.passportPhoto));
      return t;
    });
    if (historyChanged) update.tripHistory = newHistory;
    if (Object.keys(update).length) ops.push({ ref: doc.ref, type: "update", data: update });
  }

  // --- Запитвания ---
  const inquiriesSnap = await db.collection("inquiries").get();
  for (const doc of inquiriesSnap.docs) {
    const q = doc.data();
    if (q.retentionHold) {
      (q.travelers || []).forEach((tr) => tr?.passportPhoto && keptPhotos.add(tr.passportPhoto));
      continue;
    }
    const end = tripEnd(q.tourDate, q.tourId, toursById);
    const lastActivity = latest([
      toDate(q.createdAt), toDate(q.updatedAt), toDate(q.checkoutCompletedAt),
      ...(q.activityLog || []).map((e) => toDate(e?.at)),
      ...(q.emailLog || []).map((e) => toDate(e?.sentAt)),
    ]);
    const travelers = Array.isArray(q.travelers) ? q.travelers : [];

    if (q.status !== "paid") {
      const tripOverOrUnknown = !end || end < now;
      if (lastActivity && lastActivity < personalCutoff && tripOverOrUnknown) {
        ops.push({ ref: doc.ref, type: "delete" });
        photoPrefixes.add(`passport-scans/${doc.id}/`);
        travelers.forEach((tr) => tr?.passportPhoto && photoPaths.add(tr.passportPhoto));
        report.inquiriesDeleted++;
      } else {
        travelers.forEach((tr) => tr?.passportPhoto && keptPhotos.add(tr.passportPhoto));
      }
      continue;
    }

    // Платено, но без разпознаваема дата: краят се брои от последната активност + най-дългото обичайно пътуване.
    const anchor = end || (lastActivity ? new Date(lastActivity.getTime() + DEFAULT_TRIP_DAYS * DAY) : null);
    if (!end) report.undatedReservations.push(`${doc.id} (${q.tourDate || "без дата"})`);
    if (!anchor) continue;

    if (anchor < recordsCutoff) {
      ops.push({ ref: doc.ref, type: "delete" });
      photoPrefixes.add(`passport-scans/${doc.id}/`);
      travelers.forEach((tr) => tr?.passportPhoto && photoPaths.add(tr.passportPhoto));
      report.inquiriesDeleted++;
    } else if (anchor < personalCutoff && travelers.some(hasSensitive)) {
      ops.push({ ref: doc.ref, type: "update", data: { travelers: travelers.map(stripTraveler), passportDataDeletedAt: now.toISOString() } });
      photoPrefixes.add(`passport-scans/${doc.id}/`);
      travelers.forEach((tr) => tr?.passportPhoto && photoPaths.add(tr.passportPhoto));
      report.inquiriesStripped++;
    } else {
      travelers.forEach((tr) => tr?.passportPhoto && keptPhotos.add(tr.passportPhoto));
    }
  }

  // --- Групи за заминаване (имена и платени суми) — 5 години след края ---
  const groupsSnap = await db.collection("groups").get();
  for (const doc of groupsSnap.docs) {
    const g = doc.data();
    const end = tripEnd(g.startDate, g.tourId, toursById);
    if (end && end < recordsCutoff) {
      ops.push({ ref: doc.ref, type: "delete" });
      report.groupsDeleted++;
    }
  }

  // --- Въпроси от AI чата — 6 месеца ---
  const chatSnap = await db.collection("chatQuestions").where("createdAt", "<", personalCutoff).get();
  chatSnap.forEach((doc) => ops.push({ ref: doc.ref, type: "delete" }));
  report.chatQuestionsDeleted = chatSnap.size;

  // --- Снимки на паспорти: само тези, които никой запазен запис не ползва ---
  const filesToDelete = new Set([...photoPaths].filter((p) => !keptPhotos.has(p)));
  if (bucket) {
    for (const prefix of photoPrefixes) {
      const [files] = await bucket.getFiles({ prefix });
      files.forEach((f) => { if (!keptPhotos.has(f.name)) filesToDelete.add(f.name); });
    }
  }
  report.photosDeleted = filesToDelete.size;

  if (!dryRun) {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = db.batch();
      ops.slice(i, i + 400).forEach((op) => (op.type === "delete" ? batch.delete(op.ref) : batch.update(op.ref, op.data)));
      await batch.commit();
    }
    if (bucket) {
      for (const name of filesToDelete) {
        await bucket.file(name).delete({ ignoreNotFound: true }).catch((e) => log(`[retention] снимка ${name}: ${e.message}`));
      }
    }
  }

  log(`[retention] ${dryRun ? "ПРОБА (нищо не е изтрито)" : "изпълнено"}: ${JSON.stringify({ ...report, undatedReservations: report.undatedReservations.length })}`);
  if (report.undatedReservations.length) log(`[retention] платени резервации без разпозната дата: ${report.undatedReservations.join(", ")}`);
  return report;
}

module.exports = { runRetention, toDate, tripDays };
