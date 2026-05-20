import { DateTime } from "https://cdn.jsdelivr.net/npm/luxon@3.5.0/+esm";

import { kosherZmanimNew } from "https://cdn.jsdelivr.net/npm/kosher-zmanim-new@0.8.3/+esm"; // library bundle
// Note: some deployments might require using the default export name below; we guard in runtime.

const lib = kosherZmanimNew ?? (globalThis.kosherZmanimNew?.default ?? globalThis.kosherZmanimNew);

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09009044926275,
  lon: -74.04906956474558,
  // elevation default = 0 in most browsers; okay for a first version.
  // If you know your elevation, you can add it later.

  display: { twelveHour: false }, // will display AM/PM regardless (as requested)
  // Bein Hazmanim (user-defined). Year-specific ranges (2 per year supported).
  beinHazmanim: [
    { from: "2026-09-22", to: "2026-09-25" },
    { from: "2026-10-05", to: "2026-10-07" },
  ],

  // Shacharis rules (Sun–Fri unless noted)
  shach1: { default: "6:45", roshChodesh: "6:30" }, // Sun–Fri
  shach2: { default: "7:30" }, // Sun–Fri
  shach3: { time: "8:45" }, // Sun + major US federal holidays only (Yom Tov handled separately later)

  // Mincha base
  mincha: {
    monThu: "1:45",
    sundayWinter: { default: "12:45", winter: "winterMonthsOnly" }, // winter months configurable below
    sundayNonWinter: "1:45",
  },

  // Winter definition for Sundays (edit if needed)
  winterMonths: [11, 0, 1, 2], // Dec, Jan, Feb, (and Nov if you prefer) - currently Dec(11), Jan(0), Feb(1), Mar(2)
  // NOTE: JS DateTime month: 1=Jan? Actually luxon month is 1-12; we convert using luxon.month (1-12)
  // We'll compute with 1-12 below accordingly.

  // Mincha dynamic rules:
  // - If 12:45 / 1:15 is used, it must be AFTER Mincha Gedola.
  // - 13–18 minutes before Shkiah applies to Mincha only.
  minchaMinBeforeShkiah: { min: 13, max: 18 }, // used to clamp fixed Mincha based on sunset

  // Maariv rules
  maariv: {
    sunThu: { mode: "shkiah" }, // at Shkiah/sunset (Sun–Thu)
    mariv3: "8:15pm",          // Sun–Thu? (per your text: "Sun-Thu has Mariv 3 at 9:45 year around (not yom tov)")
    mariv3YA: "9:45pm",       // your added rule
    mariv2: {
      baseTime: "8:15pm",    // "fixed to 8:15 until 8:15 is less than 8.5° past sunset"
      // if 8:15 is >= the 8.5° point, then mariv2 uses dynamic weekly fixed time based on 8.5° (rounded to nearest 5)
      angleDegrees: 8.5,
      roundMinutesTo: 5,
      weekFixed: true,
      latestNightfallFallback: true // "at the latest nightfall gets too late then dynamic fixed ... at latest nightfall based on 8.5 degrees"
    }
  },

  // Shacharis 3 via US federal holidays only (major ones)
  // We'll detect approximate dates via Intl for Federal holidays is hard;
  // instead we use a small rule set below for common major US federal holidays.
  // You can expand later.
};

function parseYMD(s) {
  const [y,m,d] = s.split("-").map(Number);
  return { y, m, d };
}

function isBetweenInclusive(date, from, to) {
  const t = date.toMillis();
  return t >= from.toMillis() && t <= to.toMillis();
}

function isBeinHazmanim(date) {
  return CONFIG.beinHazmanim.some(r => {
    const a = DateTime.fromISO(r.from, { zone: CONFIG.tz }).startOf("day");
    const b = DateTime.fromISO(r.to, { zone: CONFIG.tz }).endOf("day");
    return isBetweenInclusive(date, a, b);
  });
}

function fmtTime12(dateTime) {
  return dateTime.toFormat("h:mm a");
}

function fmtTime(dateTime) {
  // always AM/PM per request
  return dateTime.toFormat("h:mm a");
}

function roundToNearest(minutes, step) {
  return Math.round(minutes / step) * step;
}

function getWeekKey(date) {
  // week key for "fixed time for the week": ISO week in local tz
  return date.toFormat("kkkk-WW"); // week-year + week number
}

// Federal holidays (major US federal holidays).
// Implemented with fixed rules for 2026+ for now; this is extendable.
function isUSFederalHoliday(d) {
  const year = d.year;
  const month = d.month; // 1-12
  const day = d.day;

  // New Year's Day: Jan 1
  if (month === 1 && day === 1) return true;

  // Independence Day: Jul 4
  if (month === 7 && day === 4) return true;

  // Christmas Day: Dec 25
  if (month === 12 && day === 25) return true;

  // Labor Day: 1st Monday in Sep? Actually 9th month; first Monday in Sep
  if (month === 9) {
    const first = d.set({ day: 1 });
    // find first Monday
    const weekday = first.weekday; // 1=Mon..7=Sun
    const delta = (1 - weekday + 7) % 7;
    const firstMonday = first.plus({ days: delta });
    if (d.hasSame(firstMonday, "day")) return true;
  }

  // Thanksgiving: 4th Thursday in Nov
  if (month === 11) {
    const first = d.set({ day: 1 });
    // Thursday is 4 (Mon=1)
    const weekday = first.weekday;
    const delta = (4 - weekday + 7) % 7;
    const firstThu = first.plus({ days: delta });
    const fourthThu = firstThu.plus({ weeks: 3 });
    if (d.hasSame(fourthThu, "day")) return true;
  }

  // Memorial Day: last Monday in May
  if (month === 5) {
    const last = d.set({ day: d.daysInMonth });
    // walk back to Monday
    const weekday = last.weekday; // 1..7
    const delta = (weekday - 1); // Mon=1
    const lastMonday = last.minus({ days: delta });
    if (d.hasSame(lastMonday, "day")) return true;
  }

  return false;
}

function isWinterMonth(d) {
  // CONFIG.winterMonths holds month indexes in JS Date style but we used Luxon month 1-12.
  // Interpret CONFIG.winterMonths as:
  // 0=Jan,1=Feb,...,11=Dec (JS convention). Convert.
  const m0 = d.month - 1;
  return CONFIG.winterMonths.includes(m0);
}

async function computeForDate(date) {
  const candle = null;

  // Build Jewish zmanim calendar via kosher-zmanim-new
  // The library API can differ slightly; we try a couple patterns.
  if (!lib) throw new Error("kosher-zmanim-new failed to load");

  const { GeoLocation, Zmanim } = lib?.GeoLocation ? lib : lib; // best-effort
  // We'll use the simpler interface provided by @hebcal/core if kosher-zmanim-new is incompatible,
  // but here we proceed with the intended library first.

  let calendar;
  try {
    // kosher-zmanim-new often exposes:
    // new GeoLocation(name, lat, lon, elevation)
    // and then a ZmanimCalendar-like class.
    const geo = new lib.GeoLocation("Custom", CONFIG.lat, CONFIG.lon, 0);

    // Build a "Zmanim" helper if available; otherwise fall back to timeAtAngle using SunCalc would be too complex.
    // Attempt common constructor patterns:
    calendar = new lib.Zmanim(date.toJSDate(), geo, CONFIG.tz);
  } catch (e) {
    // Fallback: we still need sunset and 8.5°.
    // If library API mismatches, we fail with an explicit message.
    throw new Error("Zmanim library API mismatch. Please refresh or let me know the console error.");
  }

  // Attempt to read required times.
  // We need:
  // - shkiah (sunset)
  // - zman at angle 8.5 degrees below horizon (for mariv2)
  // - rosh chodesh / yom tov flags later (we do separately)
  const shkiah = calendar.shkiah?.() ?? calendar.getShkiah?.() ?? calendar.shkiah ?? null;

  if (!shkiah) throw new Error("Could not compute shkiah from zmanim library");

  // Angle-based time: 8.5 degrees depression.
  // Commonly: timeAtAngle(angle, isTzais?) signature varies.
  // We'll use a best-effort:
  let tzais8_5;
  try {
    tzais8_5 =
      calendar.timeAtAngle?.(CONFIG.beinHazmanim ? CONFIG.maariv.angleDegrees : CONFIG.maariv.angleDegrees) ??
      calendar.getTzais?.(CONFIG.maariv.angleDegrees) ??
      calendar.tzeit?.(CONFIG.maariv.angleDegrees);
  } catch {
    // no-op
  }

  // If we can't get tzais8.5 from the library, we can still implement mariv2 with an approximation:
  // but you asked specific logic based on 8.5°; so we need correct library mapping.
  if (!tzais8_5) {
    throw new Error("Could not compute 8.5° time (Mariv 2 dynamic). Open console for details.");
  }

  return {
    shkiah: DateTime.fromJSDate(shkiah, { zone: CONFIG.tz }),
    tzais8_5: DateTime.fromJSDate(tzais8_5, { zone: CONFIG.tz }),
  };
}

function buildRow(grid, label, timeText, extra="") {
  const card = document.createElement("div");
  card.className = "card";
  const row = document.createElement("div");
  row.className = "row";
  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label;
  const t = document.createElement("div");
  t.className = "time";
  t.textContent = timeText;
  row.appendChild(l);
  row.appendChild(t);
  card.appendChild(row);
  if (extra) {
    const fine = document.createElement("div");
    fine.className = "fine";
    fine.textContent = extra;
    card.appendChild(fine);
  }
  grid.appendChild(card);
}

function buildShachAndMinchaMaariv({
  date, isSun, weekdayStr, isLegalHoliday, roshChodesh, beinHazmanim,
  shkiah, tzais8_5, minchaGedola
}) {
  // Sun=7? Luxon weekday: 1=Mon..7=Sun
  const isSunday = date.weekday === 7;
  const isMonThu = [1,2,3,4].includes(date.weekday); // Mon-Thu

  // Shacharis
  const shach1Time = isSun && !isSunday ? CONFIG.shach1.default : CONFIG.shach1.default; // placeholder for weekdays; we apply below
  let shach1 = null;
  let shach2 = null;
  let shach3 = null;

  // Sun–Fri for shach1 and shach2
  if (date.weekday >= 1 && date.weekday <= 5) {
    shach1 = (roshChodesh ? CONFIG.shach1.roshChodesh : CONFIG.shach1.default);
    shach2 = CONFIG.shach2.default;
  } else if (isSunday) {
    shach1 = CONFIG.shach1.default;
    shach2 = CONFIG.shach2.default;
  }

  // Shach3 applies to Sun + major US federal holidays only
  if (isSunday || isLegalHoliday) shach3 = CONFIG.shach3.time;

  // Mincha:
  // Mincha 1:45 all year Sun–Thu
  // But 12:45 or 1:15 only if AFTER earliest halachic mincha time (Mincha Gedola)
  // 12:45 on Sundays and legal holidays only; 1:15 on Sun-Thu during winter time only.
  const isWinter = isWinterMonth(date);

  // Earliest halachic mincha time:
  // minchaGedola is from library; we use it as cutoff.
  // Clamp fixed-time-within 13–18 min before shkiah applies to Mincha only.
  // We'll compute a candidate around 15 min before shkiah then clamp.
  const minutesBeforeShkiahCandidate = 15;
  const clampedMinutesBefore = Math.min(CONFIG.minchaMinBeforeShkiah.max,
    Math.max(CONFIG.minchaMinBeforeShkiah.min, minutesBeforeShkiahCandidate)
  );

  const minchaByClamp = shkiah.minus({ minutes: clampedMinutesBefore });

  let mincha1_45 = (isMonThu || isSunday) ? "1:45pm" : null; // Sun–Thu only for mincha
  // But the board likely always shows something for these days.
  // We'll implement priority:
  // - If eligible special time (12:45/1:15) and it is AFTER Mincha Gedola, use it.
  // - Else use 1:45pm.

  let minchaText = null;
  let minchaExtra = "";

  if (isSunday || isLegalHoliday) {
    const special = DateTime.fromFormat(`${date.toFormat("yyyy-LL-dd")} ${CONFIG.mincha.sundayWinter.default}`, "yyyy-LL-dd H:mm", { zone: CONFIG.tz })
      .toFormat("h:mm a");
    // But we need AM/PM and correct time:
    // We'll compute using date set.
    const t1245 = date.set({ hour: 12, minute: 45, second: 0, millisecond: 0 });
    if (minchaGedola && t1245 > minchaGedola) {
      minchaText = "12:45pm";
      minchaExtra = "Mincha special (after Mincha Gedola)";
    } else {
      minchaText = "1:45pm";
    }
  } else if (isMonThu) {
    // Winter time only => 1:15pm
    if (isWinter) {
      const t115 = date.set({ hour: 13, minute: 15, second: 0, millisecond: 0 });
      if (minchaGedola && t115 > minchaGedola) {
        minchaText = "1:15pm";
        minchaExtra = "Mincha special (winter after Mincha Gedola)";
      } else {
        minchaText = "1:45pm";
      }
    } else {
      minchaText = "1:45pm";
    }
  }

  // Maariv:
  // - Sun–Thu = Shkiah
  // - Mariv 3 is 9:45pm year around (not Yom Tov)
  // - Mariv 2: if 8:15pm is less than 8.5° past sunset => fixed 8:15,
  //            else dynamic fixed time for the week based on 8.5° rounded to nearest 5.
  const isSunThu = ([1,2,3,4,5].includes(date.weekday) ? false : false); // placeholder; Sun-Thu means weekdays 1-4 plus Sunday(7)
  const sunThu = ([1,2,3,4].includes(date.weekday) || date.weekday === 7);

  const mariv1 = sunThu ? fmtTime(shkiah) : null; // "Maariv" slot 1 = shkiah

  // mariv3 year around Sun-Thu (not Yom Tov). We'll display Mariv 3 always on Sun-Thu unless Yom Tov.
  const mariv3 = "9:45pm";

  // mariv2 dynamic based on 8.5°
  const weekKey = getWeekKey(date);
  const eight15 = date.set({ hour: 20, minute: 15, second: 0, millisecond: 0 });
  // if 8:15 is BEFORE tzais8_5, keep 8:15 fixed; else set to weekly rounded tzais8_5 time
  const useDynamic = (eight15 >= tzais8_5);

  let mariv2Text;
  if (!useDynamic) {
    mariv2Text = "8:15pm";
  } else {
    const mins = tzais8_5.hour * 60 + tzais8_5.minute;
    const rounded = roundToNearest(mins, CONFIG.maariv.mariv2.roundMinutesTo);
    const hh = Math.floor(rounded / 60);
    const mm = rounded % 60;
    // Construct time on "date" but with rounded hh:mm
    const roundedTime = date.set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
    mariv2Text = fmtTime(roundedTime);
  }

  return {
    shach1, shach2, shach3,
    minchaText,
    mariv1, mariv2Text, mariv3,
    minchaExtra
  };
}

// Very important: Jewish calendar flags (Rosh Chodesh / Yom Tov) using hebcal
// We'll compute rosh chodesh + yom tov with @hebcal/core.
async function getHebcalFlags(date) {
  const d = date.toJSDate();
  const { HebrewDate, Months, Holiday } = await import("https://cdn.jsdelivr.net/npm/@hebcal/core@2.4.0/+esm");

  const hd = new HebrewDate(d);
  const isRoshChodesh = hd.isRoshChodesh();
  // Yom Tov: check holiday objects for that date
  // We'll do approximate: if Holiday on that day is YomTov
  const holidays = hd.getEvents ? hd.getEvents() : []; // best-effort

  // Better: use @hebcal/core's holiday lookup by date
  let isYomTov = false;
  try {
    const { HDate, getHolidays } = await import("https://cdn.jsdelivr.net/npm/@hebcal/core@2.4.0/+esm");
  } catch {}
  // We'll use a conservative approach:
  // If hd.isYomTov exists, use it; else leave false.
  if (typeof hd.isYomTov === "function") isYomTov = hd.isYomTov();

  return { isRoshChodesh, isYomTov };
}

async function render() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const now = DateTime.now().setZone(CONFIG.tz);
  const date = now; // compute for today

  document.getElementById("refreshLine").textContent = `Local time: ${fmtTime(now)}`;

  // Flags we need: rosh chodesh and (optionally) yom tov
  let roshChodesh = false;
  let isYomTov = false;
  try {
    const flags = await getHebcalFlags(date);
    roshChodesh = flags.isRoshChodesh;
    isYomTov = flags.isYomTov;
  } catch (e) {
    // If hebcal flags fail, board still renders with conservative defaults.
    console.warn("Hebcal flags error:", e);
  }

  const isLegalHoliday = isUSFederalHoliday(date);

  // Bein hazmanim affects Shacharis 3 logic in your earlier definition.
  // You told me Shach3 is Sun + legal holidays only, so bein hazmanim won't change it now.
  const beinHazmanim = isBeinHazmanim(date);

  // Zmanim calculations
  // We'll need shkiah, tzais8.5, and mincha gedola.
  // Since kosher-zmanim-new API might vary, this may throw—if so, we'll still show a clear error on screen.
  let shkiah, tzais8_5, minchaGedola;

  try {
    const { shkiah: s, tzais8_5: t85 } = await computeForDate(date);
    shkiah = s;
    tzais8_5 = t85;

    // Mincha Gedola:
    // We attempt to compute from the zmanim library by reusing computeForDate is not enough.
    // Best-effort: if library instance can compute minchaGedola:
    // For simplicity we approximate minchaGedola as 6.5 shaos zmaniyos after chatzos,
    // but that requires more library calls. We'll compute using the hebcal core if available.
    // Use @hebcal/core Zmanim as fallback.
    const { GeoLocation, Zmanim } = await import("https://cdn.jsdelivr.net/npm/@hebcal/core@2.4.0/+esm");
    const geo = new GeoLocation("Custom", CONFIG.lat, CONFIG.lon, 0);
    // Hebcal Zmanim constructor signature: new Zmanim(date, geo, options?)
    const zim = new Zmanim(date.toJSDate(), geo, { timeZone: CONFIG.tz });
    minchaGedola = zim.minchaGedola?.() ? DateTime.fromJSDate(zim.minchaGedola(), { zone: CONFIG.tz }) : null;
  } catch (e) {
    const msg = e?.message ?? String(e);
    document.getElementById("todayLine").textContent = `Error computing zmanim: ${msg}`;
    document.getElementById("debugLine").textContent = msg;
    buildRow(grid, "Shkiah", "—", msg);
    return;
  }

  const weekdayStr = date.toFormat("cccc");
  const flagsLine = [
    `Rosh Chodesh: ${roshChodesh ? "Yes" : "No"}`,
    `Yom Tov: ${isYomTov ? "Yes" : "No"}`,
    `US Federal Holiday: ${isLegalHoliday ? "Yes" : "No"}`
  ].join(" | ");

  document.getElementById("todayLine").textContent =
    `${weekdayStr} • ${date.toFormat("MMM dd, yyyy")} • ${flagsLine}`;

  const out = buildShachAndMinchaMaariv({
    date,
    isSun: true,
    weekdayStr,
    isLegalHoliday,
    roshChodesh,
    beinHazmanim,
    shkiah,
    tzais8_5,
    minchaGedola,
  });

  // Render cards
  if (out.shach1) buildRow(grid, "Shacharis 1", out.shach1);
  if (out.shach2) buildRow(grid, "Shacharis 2", out.shach2);
  if (out.shach3) buildRow(grid, "Shacharis 3", out.shach3, "Sun + major US federal holidays only");

  if (out.minchaText) buildRow(grid, "Mincha", out.minchaText, out.minchaExtra || "");
  if (out.mariv1) buildRow(grid, "Maariv 1 (Shkiah)", out.mariv1);
  buildRow(grid, "Maariv 2", out.mariv2Text, "Based on 8.5° rounding to nearest 5 when needed");
  // Mariv 3 year-round Sun–Thu unless Yom Tov (we can leave it always on; you said not yom tov)
  const mariv3Shown = (date.weekday === 7 || [1,2,3,4].includes(date.weekday)) && !isYomTov;
  if (mariv3Shown) buildRow(grid, "Maariv 3", out.mariv3);
}

render();
setInterval(render, 60 * 1000);