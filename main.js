// main.js — zero SunCalc dependency: NOAA solar calculations + HDate for Rosh Chodesh
import { HDate } from "https://cdn.jsdelivr.net/npm/@hebcal/core@2.4.0/+esm";

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09009044926275,
  lon: -74.04906956474558,
  elevation: 0,

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

  times: {
    shacharis1_default: { hour: 6, minute: 45 },
    shacharis1_roshchodesh: { hour: 6, minute: 30 },
    shacharis2: { hour: 7, minute: 30 },
    shacharis3: { hour: 8, minute: 45 },
    mincha_default: { hour: 13, minute: 45 },
    mincha_sunday: { hour: 12, minute: 45 },
    mincha_sunthurs: { hour: 13, minute: 15 },
    maariv2_fixed: { hour: 20, minute: 15 },
    maariv3_fixed: { hour: 21, minute: 45 },
    tzaisDeg: -8.5,
  },

  bein_hazmanim: [],
};

// --- NOAA Solar Calculations (translated algorithms)
function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function julianCenturies(jd) {
  return (jd - 2451545.0) / 36525.0;
}

function geomMeanLongSun(t) {
  let L = 280.46646 + t * (36000.76983 + t * 0.0003032);
  L = (L % 360 + 360) % 360;
  return L; // degrees
}

function geomMeanAnomalySun(t) {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

function eccEarthOrbit(t) {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

function sunEqOfCenter(t) {
  const m = geomMeanAnomalySun(t);
  const mr = toRad(m);
  return Math.sin(mr) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(mr * 2) * (0.019993 - 0.000101 * t)
    + Math.sin(mr * 3) * 0.000289;
}

function sunTrueLong(t) {
  return geomMeanLongSun(t) + sunEqOfCenter(t);
}

function sunApparentLong(t) {
  const o = sunTrueLong(t);
  const omega = 125.04 - 1934.136 * t;
  return o - 0.00569 - 0.00478 * Math.sin(toRad(omega));
}

function meanObliquityOfEcliptic(t) {
  const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  return 23 + (26 + (seconds / 60)) / 60; // degrees
}

function obliquityCorrection(t) {
  const e0 = meanObliquityOfEcliptic(t);
  const omega = 125.04 - 1934.136 * t;
  return e0 + 0.00256 * Math.cos(toRad(omega));
}

function sunDeclination(t) {
  const e = obliquityCorrection(t);
  const lambda = sunApparentLong(t);
  return toDeg(Math.asin(Math.sin(toRad(e)) * Math.sin(toRad(lambda)))); // degrees
}

function equationOfTime(t) {
  const epsilon = obliquityCorrection(t);
  const L0 = geomMeanLongSun(t);
  const e = eccEarthOrbit(t);
  const M = geomMeanAnomalySun(t);

  const y = Math.tan(toRad(epsilon) / 2);
  const y2 = y * y;

  const sin2L0 = Math.sin(2 * toRad(L0));
  const sinM = Math.sin(toRad(M));
  const cos2L0 = Math.cos(2 * toRad(L0));
  const sin4L0 = Math.sin(4 * toRad(L0));
  const sin2M = Math.sin(2 * toRad(M));

  const Etime = y2 * sin2L0 - 2 * e * sinM + 4 * e * y2 * sinM * cos2L0
    - 0.5 * y2 * y2 * sin4L0 - 1.25 * e * e * sin2M;
  return toDeg(Etime) * 4.0; // in minutes of time
}

function hourAngleSunrise(lat, solarDec, solarZenithDeg = 90.8333) {
  // solarZenithDeg default accounts for refraction
  const latRad = toRad(lat);
  const sdRad = toRad(solarDec);
  const cosH = (Math.cos(toRad(solarZenithDeg)) - Math.sin(latRad) * Math.sin(sdRad)) / (Math.cos(latRad) * Math.cos(sdRad));
  if (cosH > 1) return null; // sun never rises
  if (cosH < -1) return null; // sun never sets
  return Math.acos(cosH); // in radians
}

function solarNoonUTC(jd, longitude) {
  const t = julianCenturies(jd);
  const Etime = equationOfTime(t);
  const solNoonUTC = (720 - 4.0 * longitude - Etime); // minutes
  return solNoonUTC;
}

function sunriseSunsetUTC(jd, lat, lon) {
  const t = julianCenturies(jd);
  const solarDec = sunDeclination(t);
  const ha = hourAngleSunrise(lat, solarDec);
  if (ha === null) return { sunrise: null, sunset: null };
  const haDeg = toDeg(ha);
  const solarNoon = solarNoonUTC(jd, lon);
  const delta = 4.0 * haDeg; // minutes
  const sunriseUTCmin = solarNoon - delta;
  const sunsetUTCmin = solarNoon + delta;
  return { sunriseUTCmin, sunsetUTCmin };
}

function toRad(d) { return d * Math.PI / 180.0; }
function toDeg(r) { return r * 180.0 / Math.PI; }

function minuteToDateUTC(jd, minutesUTC) {
  // compute date at minutesUTC on jday
  const dayMillis = (minutesUTC - 0) * 60000;
  // JD -> ms: (jd - 2440587.5) * 86400000
  const base = (jd - 2440587.5) * 86400000;
  return new Date(Math.round(base + dayMillis));
}

function sunAltitude(date, lat, lon) {
  // compute solar declination & equation of time for date's JD
  const jd = toJulian(date);
  const t = julianCenturies(jd);
  const solarDec = sunDeclination(t);
  const Etime = equationOfTime(t);

  // true solar time in minutes
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const tst = (utcMinutes + Etime + 4.0 * lon) % 1440;
  // hour angle in degrees
  let hourAngleDeg = tst / 4.0 - 180.0;
  // convert
  const haRad = toRad(hourAngleDeg);
  const latRad = toRad(lat);
  const decRad = toRad(solarDec);
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  return toDeg(Math.asin(sinAlt));
}

// Binary search for altitude target between start..end
function findTimeAtAltitude(start, end, targetDeg, lat, lon, iterations = 48) {
  let low = start.getTime();
  let high = end.getTime();
  for (let i = 0; i < iterations; i++) {
    const mid = Math.floor((low + high) / 2);
    const a = sunAltitude(new Date(mid), lat, lon);
    if (a > targetDeg) low = mid; else high = mid;
  }
  return new Date(high);
}

// --- Utilities & rendering
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: CONFIG.tz });
const timeFmtWithSeconds = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: CONFIG.tz });
function fmt(d) { if (!d) return "—"; return timeFmt.format(d); }
function fmtWithSeconds(d) { if (!d) return "—"; return timeFmtWithSeconds.format(d); }
function dateAtLocal(date, hour, minute = 0) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0); }
function toTimeStringFromHM(hh, mm) { const dt = new Date(); dt.setHours(hh, mm, 0, 0); return timeFmt.format(dt); }
function roundToNearest5Minutes(d) { const mins = d.getHours() * 60 + d.getMinutes(); const r = Math.round(mins / 5) * 5; return { hh: Math.floor(r / 60), mm: r % 60 }; }

function buildCard(grid, label, timeText, extra = "") {
  const card = document.createElement("div"); card.className = "card";
  const row = document.createElement("div"); row.className = "row";
  const l = document.createElement("div"); l.className = "label hebrew"; l.textContent = label;
  const t = document.createElement("div"); t.className = "time"; t.textContent = timeText;
  row.appendChild(l); row.appendChild(t); card.appendChild(row);
  if (extra) { const fine = document.createElement("div"); fine.className = "fine"; fine.textContent = extra; card.appendChild(fine); }
  grid.appendChild(card);
}
function buildShabbatCard(grid) { const card = document.createElement("div"); card.className = "card shabbat"; card.style.gridColumn = "1 / -1"; card.style.textAlign = "center"; card.style.padding = "20px"; card.innerHTML = `<div style='font-size: 18px; font-weight: 600;'>${CONFIG.labels.shabbat}</div>`; grid.appendChild(card); }

function isBeinHazmanim(jsDate) { const y = jsDate.getFullYear(); const mm = String(jsDate.getMonth() + 1).padStart(2, "0"); const dd = String(jsDate.getDate()).padStart(2, "0"); const s = `${y}-${mm}-${dd}`; return CONFIG.bein_hazmanim.some(r => s >= r.from && s <= r.to); }
function isUSLegalHoliday(jsDate) { const month = jsDate.getMonth() + 1; const day = jsDate.getDate(); const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const fixed = ["01-01", "07-04", "12-25"]; if (fixed.includes(mmdd)) return true; if (month === 9) { const first = new Date(jsDate.getFullYear(), 8, 1); const delta = (1 - first.getDay() + 7) % 7; const firstMon = new Date(first); firstMon.setDate(first.getDate() + delta); if (jsDate.toDateString() === firstMon.toDateString()) return true; } if (month === 5) { const last = new Date(jsDate.getFullYear(), 4, 31); const delta = (last.getDay() - 1 + 7) % 7; const lastMon = new Date(last); lastMon.setDate(last.getDate() - delta); if (jsDate.toDateString() === lastMon.toDateString()) return true; } if (month === 11) { const first = new Date(jsDate.getFullYear(), 10, 1); const delta = (4 - first.getDay() + 7) % 7; const firstThu = new Date(first); firstThu.setDate(first.getDate() + delta); const fourthThu = new Date(firstThu); fourthThu.setDate(firstThu.getDate() + 21); if (jsDate.toDateString() === fourthThu.toDateString()) return true; } return false; }
function isShabbat(jsDate) { return jsDate.getDay() === 6; }

function computeZmanimForDate(jsDate) {
  const jd = toJulian(jsDate);
  const { sunriseUTCmin, sunsetUTCmin } = (() => {
    const rst = sunriseSunsetUTC(jd, CONFIG.lat, CONFIG.lon);
    return { sunriseUTCmin: rst.sunriseUTCmin, sunsetUTCmin: rst.sunsetUTCmin };
  })();

  if (sunriseUTCmin == null || sunsetUTCmin == null) return null;

  // convert UTC minutes to Date objects
  const sunrise = minuteToDateUTC(jd, sunriseUTCmin);
  const sunset = minuteToDateUTC(jd, sunsetUTCmin);

  const dayLengthMs = sunset.getTime() - sunrise.getTime();
  const shaaMs = dayLengthMs / 12.0;

  const minchaGedola = new Date(sunrise.getTime() + shaaMs * 6.5);
  const plagHamincha = new Date(sunrise.getTime() + shaaMs * 10.75);
  const chatzos = new Date(sunrise.getTime() + shaaMs * 6);

  // tzais -8.5 between sunset and sunset+4h
  const searchStart = new Date(sunset.getTime());
  const searchEnd = new Date(sunset.getTime() + 4 * 3600 * 1000);
  const tzais85 = findTimeAtAltitude(searchStart, searchEnd, CONFIG.times.tzaisDeg, CONFIG.lat, CONFIG.lon);

  return { sunrise, sunset, shaaMs, minchaGedola, plagHamincha, chatzos, tzais85 };
}

function setHeader(now) { const hebDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]; const dayName = hebDays[now.getDay()]; const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: CONFIG.tz }); document.getElementById("todayLine").textContent = `${dayName} • ${dateStr}`; document.getElementById("refreshLine").textContent = `${timeFmt.format(now)}`; }

function renderDay(jsDate, containerId, flagsId) {
  const grid = document.getElementById(containerId);
  const flagsDiv = document.getElementById(flagsId);
  grid.innerHTML = ""; flagsDiv.innerHTML = "";

  const hd = new HDate(jsDate);
  const isRoshChodesh = typeof hd.isRoshChodesh === "function" ? hd.isRoshChodesh() : false;
  const bein = isBeinHazmanim(jsDate);
  const legal = isUSLegalHoliday(jsDate);
  const shabbat = isShabbat(jsDate);
  const sunday = jsDate.getDay() === 0;
  const sunThu = [0,1,2,3,4].includes(jsDate.getDay());

  if (shabbat) { buildShabbatCard(grid); flagsDiv.innerHTML = `<div>${CONFIG.labels.shabbat}</div>`; return; }

  const zmanim = computeZmanimForDate(jsDate);
  if (!zmanim) { buildCard(grid, "שגיאה", "לא נמצא חישוב שמש"); return; }

  const shach1Time = isRoshChodesh
    ? toTimeStringFromHM(CONFIG.times.shacharis1_roshchodesh.hour, CONFIG.times.shacharis1_roshchodesh.minute)
    : toTimeStringFromHM(CONFIG.times.shacharis1_default.hour, CONFIG.times.shacharis1_default.minute);

  buildCard(grid, CONFIG.labels.shacharis1, shach1Time);
  buildCard(grid, CONFIG.labels.shacharis2, toTimeStringFromHM(CONFIG.times.shacharis2.hour, CONFIG.times.shacharis2.minute));

  if (sunday || legal || bein) buildCard(grid, CONFIG.labels.shacharis3, toTimeStringFromHM(CONFIG.times.shacharis3.hour, CONFIG.times.shacharis3.minute));

  buildCard(grid, CONFIG.labels.zman_krias_shema, fmtWithSeconds(new Date(zmanim.sunset.getTime() - Math.round(zmanim.shaaMs * 3))));

  buildCard(grid, CONFIG.labels.chatzos, fmtWithSeconds(zmanim.chatzos));
  buildCard(grid, CONFIG.labels.mincha_gedola, fmtWithSeconds(zmanim.minchaGedola));

  let minchaTimeStr = toTimeStringFromHM(CONFIG.times.mincha_default.hour, CONFIG.times.mincha_default.minute);
  if ((sunday || legal) ) {
    const t1245 = dateAtLocal(jsDate, CONFIG.times.mincha_sunday.hour, CONFIG.times.mincha_sunday.minute);
    if (t1245.getTime() > zmanim.minchaGedola.getTime()) minchaTimeStr = fmt(t1245);
  } else if (sunThu) {
    const isWinter = (jsDate.getMonth()) === 11 || (jsDate.getMonth() <= 2);
    const t115 = dateAtLocal(jsDate, CONFIG.times.mincha_sunthurs.hour, CONFIG.times.mincha_sunthurs.minute);
    if (isWinter && t115.getTime() > zmanim.minchaGedola.getTime()) minchaTimeStr = fmt(t115);
  }
  buildCard(grid, CONFIG.labels.mincha, minchaTimeStr);

  buildCard(grid, CONFIG.labels.plag_hamincha, fmtWithSeconds(zmanim.plagHamincha));
  buildCard(grid, CONFIG.labels.shkiah, fmtWithSeconds(zmanim.sunset));
  if (sunThu) buildCard(grid, CONFIG.labels.maariv1, fmt(zmanim.sunset), CONFIG.labels.maariv1 + " (בשקיעה)");

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
  if (sunThu) buildCard(grid, CONFIG.labels.maariv3, toTimeStringFromHM(CONFIG.times.maariv3_fixed.hour, CONFIG.times.maariv3_fixed.minute));

  const flags = [];
  if (bein) flags.push(CONFIG.labels.bein_hazmanim);
  if (legal) flags.push("חג ציבורי (USA)");
  if (isRoshChodesh) flags.push(CONFIG.labels.rosh_chodesh);
  if (flags.length) flagsDiv.innerHTML = flags.join(" • "); else flagsDiv.textContent = "יום רגיל";
}

function render() { const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); setHeader(now); renderDay(today, "todayGrid", "todayFlags"); renderDay(tomorrow, "tomorrowGrid", "tomorrowFlags"); }

console.log("Main zmanim script loaded (no SunCalc dependency)");
render();
setInterval(render, 60 * 1000);
