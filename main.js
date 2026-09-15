// main.js — NOAA-based solar calculations for halachic times

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09034,
  lon: -74.04837,
  elevation: 0,

  labels: {
    zman_krias_shema: "Zman Krias Shema / זמן קריאת שמע",
    chatzos: "Chatzos / חצות",
    mincha_gedola: "Mincha Gedola / מנחה גדולה",
    plag_hamincha: "Plag Hamincha / פלג המנחה",
    shkiah: "Shkiah (Sunset) / שקיעה",
    maariv: "Maariv / מעריב",
    shabbat: "Shabbat Shalom / שבת שלום",
  },
};

// --- Utilities & rendering
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: CONFIG.tz });
function fmt(d) { if (!d) return "—"; return timeFmt.format(d); }

function buildCard(grid, label, timeText, extra = "") { 
  const card = document.createElement("div"); 
  card.className = "card"; 
  const row = document.createElement("div"); 
  row.className = "row"; 
  const labelEl = document.createElement("div"); 
  labelEl.className = "label hebrew"; 
  labelEl.textContent = label; 
  const timeEl = document.createElement("div"); 
  timeEl.className = "time small"; 
  timeEl.textContent = timeText; 
  row.appendChild(labelEl); 
  row.appendChild(timeEl); 
  card.appendChild(row); 
  if (extra) { const fine = document.createElement("div"); fine.className = "fine"; fine.textContent = extra; card.appendChild(fine); } 
  grid.appendChild(card); 
}

function buildShabbatCard(grid) { 
  const card = document.createElement("div"); 
  card.className = "card shabbat"; 
  card.style.gridColumn = "1 / -1"; 
  card.style.textAlign = "center"; 
  card.style.padding = "20px"; 
  const label = document.createElement("div"); 
  label.className = "label hebrew"; 
  label.textContent = CONFIG.labels.shabbat; 
  const time = document.createElement("div"); 
  time.className = "time"; 
  time.textContent = "🕯️"; 
  card.appendChild(label); 
  card.appendChild(time); 
  grid.appendChild(card); 
}

function isShabbat(jsDate) { return jsDate.getDay() === 6; }

function setHeader(now) { 
  const hebDays = ["Sunday / ראשון", "Monday / שני", "Tuesday / שלישי", "Wednesday / רביעי", "Thursday / חמישי", "Friday / שישי", "Saturday / שבת"]; 
  const dayName = hebDays[now.getDay()]; 
  const dateStr = now.toLocaleDateString("en-US"); 
  document.getElementById("todayLine").textContent = `${dayName}, ${dateStr}`; 
  document.getElementById("refreshLine").textContent = `Updated: ${fmt(now)}`; 
}

// --- NOAA Solar Calculations
function toJulian(date) { return date.getTime() / 86400000 + 2440587.5; }
function julianCenturies(jd) { return (jd - 2451545.0) / 36525.0; }
function geomMeanLongSun(t) { let L = 280.46646 + t * (36000.76983 + t * 0.0003032); L = (L % 360 + 360) % 360; return L; }
function geomMeanAnomalySun(t) { return 357.52911 + t * (35999.05029 - 0.0001537 * t); }
function eccEarthOrbit(t) { return 0.016708634 - t * (0.000042037 + 0.0000001267 * t); }
function toRad(d) { return d * Math.PI / 180.0; }
function toDeg(r) { return r * 180.0 / Math.PI; }
function sunEqOfCenter(t) { 
  const m = geomMeanAnomalySun(t); 
  const mr = toRad(m); 
  return Math.sin(mr) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(mr * 2) * (0.019993 - 0.000101 * t) + Math.sin(mr * 3) * 0.000289; 
}
function sunTrueLong(t) { return geomMeanLongSun(t) + sunEqOfCenter(t); }
function sunApparentLong(t) { 
  const o = sunTrueLong(t); 
  const omega = 125.04 - 1934.136 * t; 
  return o - 0.00569 - 0.00478 * Math.sin(toRad(omega)); 
}
function meanObliquityOfEcliptic(t) { 
  const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813)); 
  return 23 + (26 + (seconds / 60)) / 60; 
}
function obliquityCorrection(t) { 
  const e0 = meanObliquityOfEcliptic(t); 
  const omega = 125.04 - 1934.136 * t; 
  return e0 + 0.00256 * Math.cos(toRad(omega)); 
}
function sunDeclination(t) { 
  const e = obliquityCorrection(t); 
  const lambda = sunApparentLong(t); 
  return toDeg(Math.asin(Math.sin(toRad(e)) * Math.sin(toRad(lambda)))); 
}
function equationOfTime(t) { 
  const epsilon = obliquityCorrection(t); 
  const L0 = geomMeanLongSun(t); 
  const e = eccEarthOrbit(t); 
  const M = geomMeanAnomalySun(t); 
  const y = Math.tan(toRad(epsilon) / 2); 
  return 229.18 * (y * y * Math.sin(2 * toRad(L0)) - 2 * e * Math.sin(toRad(M)) + 4 * e * y * y * Math.sin(toRad(M)) * Math.cos(2 * toRad(L0)) - 0.5 * y * y * y * y * Math.sin(4 * toRad(L0)) - 1.25 * e * e * Math.sin(2 * toRad(M))); 
}
function hourAngleSunrise(lat, solarDec, solarZenithDeg = 90.8333) { 
  const latRad = toRad(lat); 
  const sdRad = toRad(solarDec); 
  const cosH = (Math.cos(toRad(solarZenithDeg)) - Math.sin(latRad) * Math.sin(sdRad)) / (Math.cos(latRad) * Math.cos(sdRad)); 
  return (cosH > 1) ? null : ((cosH < -1) ? 180 : toDeg(Math.acos(cosH))); 
}
function solarNoonUTC(jd, longitude) { 
  const t = julianCenturies(jd); 
  const Etime = equationOfTime(t); 
  return (720 - 4 * longitude - Etime); 
}
function sunriseSunsetUTC(jd, lat, lon) { 
  const t = julianCenturies(jd); 
  const solarDec = sunDeclination(t); 
  const ha = hourAngleSunrise(lat, solarDec); 
  if (ha === null) return { sunriseUTCmin: null, sunsetUTCmin: null }; 
  const Etime = equationOfTime(t); 
  const eqTime = 720 * Etime; 
  const solNoonUTC = solarNoonUTC(jd, lon); 
  const sunriseUTCmin = solNoonUTC - 4 * ha - eqTime; 
  const sunsetUTCmin = solNoonUTC + 4 * ha - eqTime; 
  return { sunriseUTCmin, sunsetUTCmin }; 
}
function minuteToDateUTC(jd, minutesUTC) { 
  const dayMillis = minutesUTC * 60000; 
  const base = (jd - 2440587.5) * 86400000; 
  return new Date(Math.round(base + dayMillis)); 
}
function sunAltitude(date, lat, lon) { 
  const jd = toJulian(date); 
  const t = julianCenturies(jd); 
  const solarDec = sunDeclination(t); 
  const Etime = equationOfTime(t); 
  const utcMinutes = (date.getUTCHours() * 60 + date.getUTCMinutes()) - (Etime); 
  const latRad = toRad(lat); 
  const sdRad = toRad(solarDec); 
  const hourRad = toRad((utcMinutes / 4.0)); 
  return toDeg(Math.asin(Math.sin(latRad) * Math.sin(sdRad) + Math.cos(latRad) * Math.cos(sdRad) * Math.cos(hourRad))); 
}
function findTimeAtAltitude(start, end, targetDeg, lat, lon, iterations = 48) { 
  let low = start.getTime(); 
  let high = end.getTime(); 
  for (let i = 0; i < iterations; i++) { 
    const mid = Math.floor((low + high) / 2); 
    const testDate = new Date(mid); 
    const alt = sunAltitude(testDate, lat, lon); 
    if (alt > targetDeg) { high = mid; } else { low = mid; } 
  } 
  return new Date(Math.floor((low + high) / 2)); 
}

function computeZmanimForDate(jsDate) {
  try {
    const jd = toJulian(new Date(Date.UTC(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate())));
    const rst = sunriseSunsetUTC(jd, CONFIG.lat, CONFIG.lon);
    if (rst.sunriseUTCmin == null || rst.sunsetUTCmin == null) {
      console.error("Sunrise/sunset calculation failed");
      return null;
    }
    const sunrise = minuteToDateUTC(jd, rst.sunriseUTCmin);
    const sunset = minuteToDateUTC(jd, rst.sunsetUTCmin);
    const dayLengthMs = sunset.getTime() - sunrise.getTime();
    const shaaMs = dayLengthMs / 12.0;
    const minchaGedola = new Date(sunrise.getTime() + shaaMs * 6.5);
    const plagHamincha = new Date(sunrise.getTime() + shaaMs * 10.75);
    const chatzos = new Date(sunrise.getTime() + shaaMs * 6);
    const sofZmanShma = new Date(sunrise.getTime() + shaaMs * 3);
    const searchStart = new Date(sunset.getTime());
    const searchEnd = new Date(sunset.getTime() + 4 * 3600 * 1000);
    const tzais = findTimeAtAltitude(searchStart, searchEnd, -8.5, CONFIG.lat, CONFIG.lon);
    return { sunrise, sunset, minchaGedola, plagHamincha, chatzos, tzais, sofZmanShma };
  } catch (e) {
    console.error("Error in zmanim calculation:", e);
    return null;
  }
}

async function renderDay(jsDate, containerId, flagsId) { 
  const grid = document.getElementById(containerId); 
  const flagsDiv = document.getElementById(flagsId); 
  grid.innerHTML = ""; 
  flagsDiv.innerHTML = ""; 
  
  const zmanim = computeZmanimForDate(jsDate);
  
  if (!zmanim) {
    grid.textContent = "Unable to calculate zmanim";
    return;
  }
  
  buildCard(grid, CONFIG.labels.zman_krias_shema, fmt(zmanim.sofZmanShma), "GRA");
  buildCard(grid, CONFIG.labels.chatzos, fmt(zmanim.chatzos));
  buildCard(grid, CONFIG.labels.mincha_gedola, fmt(zmanim.minchaGedola));
  buildCard(grid, CONFIG.labels.plag_hamincha, fmt(zmanim.plagHamincha));
  buildCard(grid, CONFIG.labels.shkiah, fmt(zmanim.sunset));
  buildCard(grid, CONFIG.labels.maariv, fmt(zmanim.tzais));
}

async function render() { 
  const now = new Date(); 
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
  const tomorrow = new Date(today); 
  tomorrow.setDate(today.getDate() + 1); 
  
  setHeader(now);
  
  if (isShabbat(today)) {
    document.getElementById("todayGrid").innerHTML = "";
    buildShabbatCard(document.getElementById("todayGrid"));
  } else {
    await renderDay(today, "todayGrid", "todayFlags");
  }
  
  if (isShabbat(tomorrow)) {
    document.getElementById("tomorrowGrid").innerHTML = "";
    buildShabbatCard(document.getElementById("tomorrowGrid"));
  } else {
    await renderDay(tomorrow, "tomorrowGrid", "tomorrowFlags");
  }
}

// Initialize and start rendering
render();
setInterval(render, 60 * 1000);
