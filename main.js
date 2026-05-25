import * as SunCalc from "https://cdn.jsdelivr.net/npm/suncalc@1.9.0/+esm";
import { HDate } from "https://cdn.jsdelivr.net/npm/@hebcal/core@2.4.0/+esm";

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09009044926275,
  lon: -74.04906956474558,
  elevation: 0,

  // Hebrew labels
  labels: {
    shacharis1: "שחרית א׳",
    shacharis2: "שחרית ב׳",
    shacharis3: "שחרית ג׳",
    zman_krias_shema: "זמן קריאת שמע",
    chatzos: "חצות",
    mincha_gedola: "מנחה גדולה",
    mincha: "מנחה",
    plag_hamincha: "פלג המנחה",
    maariv1: "מעריב א׳",
    maariv2: "מעריב ב׳",
    maariv3: "מעריב ג׳",
    shkiah: "שקיעה",
    rosh_chodesh: "ראש חודש",
    bein_hazmanim: "בין הזמנים",
    shabbat: "שבת שלום",
  },

  // Default fixed times used where applicable
  times: {
    shacharis1_default: { hour: 6, minute: 45 },
    shacharis1_roshchodesh: { hour: 6, minute: 30 },
    shacharis2: { hour: 7, minute: 30 },
    shacharis3: { hour: 8, minute: 45 },
    mincha_default: { hour: 13, minute: 45 },
    mincha_sunday: { hour: 12, minute: 45 },
    mincha_sunthurs: { hour: 13, minute: 15 },
    maariv2_fixed: { hour: 20, minute: 15 }, // 8:15pm
    maariv3_fixed: { hour: 21, minute: 45 }, // 9:45pm
    tzaisDeg: -8.5,
  },

  // Optional Bein Hazmanim ranges (can be edited later)
  bein_hazmanim: [
    // sample placeholder; you can customize
    // { from: "2026-08-09", to: "2026-09-24" },
  ],
};

// Formatting helpers (in configured timezone)
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: CONFIG.tz,
});

const timeFmtWithSeconds = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: CONFIG.tz,
});

function fmt(date) {
  if (!date) return "—";
  return timeFmt.format(date);
}
function fmtWithSeconds(date) {
  if (!date) return "—";
  return timeFmtWithSeconds.format(date);
}
function dateAtLocal(date, hour, minute = 0, second = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second, 0);
}

function deg(rad) {
  return (rad * 180) / Math.PI;
}

// Binary search to find time when solar altitude crosses targetDeg between start..end
function findTimeAtAltitude(start, end, targetDeg, lat, lon, iterations = 48) {
  let low = start.getTime();
  let high = end.getTime();
  for (let i = 0; i < iterations; i++) {
    const mid = Math.floor((low + high) / 2);
    const altMid = deg(SunCalc.getPosition(new Date(mid), lat, lon).altitude);
    if (altMid > targetDeg) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return new Date(high);
}

function isBeinHazmanim(jsDate) {
  const y = jsDate.getFullYear();
  const mm = String(jsDate.getMonth() + 1).padStart(2, "0");
  const dd = String(jsDate.getDate()).padStart(2, "0");
  const s = `${y}-${mm}-${dd}`;
  return CONFIG.bein_hazmanim.some(r => s >= r.from && s <= r.to);
}

function isUSLegalHoliday(jsDate) {
  const month = jsDate.getMonth() + 1;
  const day = jsDate.getDate();
  const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const fixed = ["01-01", "07-04", "12-25"];
  if (fixed.includes(mmdd)) return true;
  if (month === 9) {
    const first = new Date(jsDate.getFullYear(), 8, 1);
    const delta = (1 - first.getDay() + 7) % 7;
    const firstMon = new Date(first);
    firstMon.setDate(first.getDate() + delta);
    if (jsDate.toDateString() === firstMon.toDateString()) return true;
  }
  if (month === 5) {
    const last = new Date(jsDate.getFullYear(), 4, 31);
    const delta = (last.getDay() - 1 + 7) % 7;
    const lastMon = new Date(last);
    lastMon.setDate(last.getDate() - delta);
    if (jsDate.toDateString() === lastMon.toDateString()) return true;
  }
  if (month === 11) {
    const first = new Date(jsDate.getFullYear(), 10, 1);
    const delta = (4 - first.getDay() + 7) % 7;
    const firstThu = new Date(first);
    firstThu.setDate(first.getDate() + delta);
    const fourthThu = new Date(firstThu);
    fourthThu.setDate(firstThu.getDate() + 21);
    if (jsDate.toDateString() === fourthThu.toDateString()) return true;
  }
  return false;
}

function isShabbat(jsDate) {
  return jsDate.getDay() === 6;
}

function roundToNearest5Minutes(d) {
  const mins = d.getHours() * 60 + d.getMinutes();
  const r = Math.round(mins / 5) * 5;
  const hh = Math.floor(r / 60);
  const mm = r % 60;
  return { hh, mm };
}

function toTimeStringFromHM(hh, mm) {
  const dt = new Date();
  dt.setHours(hh, mm, 0, 0);
  return timeFmt.format(dt);
}

function buildCard(grid, label, timeText, extra = "") {
  const card = document.createElement("div");
  card.className = "card";
  const row = document.createElement("div");
  row.className = "row";
  const l = document.createElement("div");
  l.className = "label hebrew";
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

function buildShabbatCard(grid) {
  const card = document.createElement("div");
  card.className = "card shabbat";
  card.style.gridColumn = "1 / -1";
  card.style.textAlign = "center";
  card.style.padding = "20px";
  card.innerHTML = `<div style='font-size: 18px; font-weight: 600;'>${CONFIG.labels.shabbat}</div>`;
  grid.appendChild(card);
}

function computeZmanimForDate(jsDate) {
  const times = SunCalc.getTimes(jsDate, CONFIG.lat, CONFIG.lon);
  const sunrise = times.sunrise;
  const sunset = times.sunset;
  if (!sunrise || !sunset) return null;

  const dayLengthMs = sunset.getTime() - sunrise.getTime();
  const shaaMs = dayLengthMs / 12;

  const minchaGedola = new Date(sunrise.getTime() + shaaMs * 6.5);
  const plagHamincha = new Date(sunrise.getTime() + shaaMs * 10.75);
  const chatzos = new Date(sunrise.getTime() + shaaMs * 6);

  const searchStart = new Date(sunset.getTime());
  const searchEnd = new Date(sunset.getTime() + 4 * 3600 * 1000);
  const tzais85 = findTimeAtAltitude(searchStart, searchEnd, CONFIG.times.tzaisDeg, CONFIG.lat, CONFIG.lon);

  return {
    sunrise,
    sunset,
    shaaMs,
    minchaGedola,
    plagHamincha,
    chatzos,
    tzais85,
  };
}

function setHeader(now) {
  const hebDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = hebDays[now.getDay()];
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: CONFIG.tz });
  document.getElementById("todayLine").textContent = `${dayName} • ${dateStr}`;
  document.getElementById("refreshLine").textContent = `${timeFmt.format(now)}`;
}

function renderDay(jsDate, containerId, flagsId) {
  const grid = document.getElementById(containerId);
  const flagsDiv = document.getElementById(flagsId);
  grid.innerHTML = "";
  flagsDiv.innerHTML = "";

  const hd = new HDate(jsDate);
  const isRoshChodesh = typeof hd.isRoshChodesh === "function" ? hd.isRoshChodesh() : false;
  const bein = isBeinHazmanim(jsDate);
  const legal = isUSLegalHoliday(jsDate);
  const shabbat = isShabbat(jsDate);
  const sunday = jsDate.getDay() === 0;
  const sunThu = [0,1,2,3,4].includes(jsDate.getDay());

  if (shabbat) {
    buildShabbatCard(grid);
    flagsDiv.innerHTML = `<div>${CONFIG.labels.shabbat}</div>`;
    return;
  }

  const zmanim = computeZmanimForDate(jsDate);
  if (!zmanim) {
    buildCard(grid, "שגיאה", "לא נמצא חישוב שמש");
    return;
  }

  const shach1Time = isRoshChodesh
    ? toTimeStringFromHM(CONFIG.times.shacharis1_roshchodesh.hour, CONFIG.times.shacharis1_roshchodesh.minute)
    : toTimeStringFromHM(CONFIG.times.shacharis1_default.hour, CONFIG.times.shacharis1_default.minute);

  buildCard(grid, CONFIG.labels.shacharis1, shach1Time);
  buildCard(grid, CONFIG.labels.shacharis2, toTimeStringFromHM(CONFIG.times.shacharis2.hour, CONFIG.times.shacharis2.minute));

  if (sunday || legal || bein) {
    buildCard(grid, CONFIG.labels.shacharis3, toTimeStringFromHM(CONFIG.times.shacharis3.hour, CONFIG.times.shacharis3.minute));
  }

  buildCard(grid, CONFIG.labels.zman_krias_shema, fmtWithSeconds(new Date(zmanim.sunset.getTime() - Math.round(zmanim.shaaMs * 3))));

  buildCard(grid, CONFIG.labels.chatzos, fmtWithSeconds(zmanim.chatzos));
  buildCard(grid, CONFIG.labels.mincha_gedola, fmtWithSeconds(zmanim.minchaGedola));

  let minchaTimeStr = toTimeStringFromHM(CONFIG.times.mincha_default.hour, CONFIG.times.mincha_default.minute);
  if ((sunday || legal) ) {
    const t1245 = dateAtLocal(jsDate, CONFIG.times.mincha_sunday.hour, CONFIG.times.mincha_sunday.minute);
    if (t1245.getTime() > zmanim.minchaGedola.getTime()) {
      minchaTimeStr = fmt(t1245);
    }
  } else if (sunThu) {
    const isWinter = (jsDate.getMonth()) === 11 || (jsDate.getMonth() <= 2);
    const t115 = dateAtLocal(jsDate, CONFIG.times.mincha_sunthurs.hour, CONFIG.times.mincha_sunthurs.minute);
    if (isWinter && t115.getTime() > zmanim.minchaGedola.getTime()) {
      minchaTimeStr = fmt(t115);
    }
  }
  buildCard(grid, CONFIG.labels.mincha, minchaTimeStr);

  buildCard(grid, CONFIG.labels.plag_hamincha, fmtWithSeconds(zmanim.plagHamincha));

  buildCard(grid, CONFIG.labels.shkiah, fmtWithSeconds(zmanim.sunset));
  if (sunThu) {
    buildCard(grid, CONFIG.labels.maariv1, fmt(zmanim.sunset), CONFIG.labels.maariv1 + " (בשקיעה)");
  }

  let maariv2Time = toTimeStringFromHM(CONFIG.times.maariv2_fixed.hour, CONFIG.times.maariv2_fixed.minute);
  let maariv2Extra = "";
  if (zmanim.tzais85) {
    const tz = zmanim.tzais85;
    const eight15 = dateAtLocal(jsDate, CONFIG.times.maariv2_fixed.hour, CONFIG.times.maariv2_fixed.minute);
    if (eight15.getTime() >= tz.getTime()) {
      const { hh, mm } = roundToNearest5Minutes(tz);
      maariv2Time = toTimeStringFromHM(hh, mm);
      maariv2Extra = " (דינמי — 8.5°)";
    }
  }
  buildCard(grid, CONFIG.labels.maariv2, maariv2Time, maariv2Extra);

  if (sunThu) {
    buildCard(grid, CONFIG.labels.maariv3, toTimeStringFromHM(CONFIG.times.maariv3_fixed.hour, CONFIG.times.maariv3_fixed.minute));
  }

  const flags = [];
  if (bein) flags.push(CONFIG.labels.bein_hazmanim);
  if (legal) flags.push("חג ציבורי (USA)");
  if (isRoshChodesh) flags.push(CONFIG.labels.rosh_chodesh);
  if (flags.length) flagsDiv.innerHTML = flags.join(" • ");
  else flagsDiv.textContent = "יום רגיל";
}

function render() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  setHeader(now);

  renderDay(today, "todayGrid", "todayFlags");
  renderDay(tomorrow, "tomorrowGrid", "tomorrowFlags");
}

console.log("Main zmanim script loaded");
render();
setInterval(render, 60 * 1000);
