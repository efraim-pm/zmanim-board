import { ZmanimCalendar, GeoLocation } from 'https://cdn.jsdelivr.net/npm/@kosherjava/zmanim@3.1.1/+esm';

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09009044926275,
  lon: -74.04906956474558,
  elevation: 0,
  
  // Hebrew labels
  labels: {
    shacharis1: "שחרית א'",
    shacharis2: "שחרית ב'",
    shacharis3: "שחרית ג'",
    zman_krias_shema: "זמן קריאת שמע",
    chatzos: "חצות",
    mincha_gedola: "מנחה גדולה",
    mincha: "מנחה",
    plag_hamincha: "פלג המנחה",
    maariv1: "מעריב א'",
    maariv2: "מעריב ב'",
    maariv3: "מעריב ג'",
    shkiah: "שקיעה",
    rosh_chodesh: "ראש חודש",
    bein_hazmanim: "בין הזמנים",
  },
  
  times: {
    shacharis1: "6:45",
    shacharis2: "7:30",
    shacharis3: "8:45",
    mincha_default: "1:45pm",
    mincha_sunday: "12:45pm",
    mincha_sunthurs: "1:15pm",
    maariv2: "8:15pm",
    maariv3: "9:45pm",
  },
  
  // Bein Hazmanim (9 Av - 3rd day of Sukkot approximately)
  bein_hazmanim: [
    { from: "2026-08-09", to: "2026-09-24" },
  ],
  
  // US Legal Holidays (for Shacharis 3 eligibility)
  legal_holidays: [
    "01-01", // New Year's Day
    "07-04", // Independence Day  
    "12-25", // Christmas
  ],
};

function formatTime12WithSeconds(date) {
  if (!date) return "—";
  const hours = date.getHours() % 12 || 12;
  const mins = String(date.getMinutes()).padStart(2, "0");
  const secs = String(date.getSeconds()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "pm" : "am";
  return `${hours}:${mins}:${secs}${ampm}`;
}

function formatTime12(date) {
  if (!date) return "—";
  const hours = date.getHours() % 12 || 12;
  const mins = String(date.getMinutes()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "pm" : "am";
  return `${hours}:${mins}${ampm}`;
}

function isBeinHazmanim(jsDate) {
  const dateStr = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`;
  return CONFIG.bein_hazmanim.some(range => dateStr >= range.from && dateStr <= range.to);
}

function isLegalHoliday(jsDate) {
  const mmdd = `${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`;
  // Check fixed holidays
  if (CONFIG.legal_holidays.includes(mmdd)) return true;
  
  // Labor Day: 1st Monday in September
  if (jsDate.getMonth() === 8) {
    const first = new Date(jsDate.getFullYear(), 8, 1);
    const firstMonday = new Date(first);
    firstMonday.setDate(first.getDate() + (1 - first.getDay() + 7) % 7);
    if (jsDate.toDateString() === firstMonday.toDateString()) return true;
  }
  
  return false;
}

function isShabbat(jsDate) {
  return jsDate.getDay() === 6;
}

function isSunday(jsDate) {
  return jsDate.getDay() === 0;
}

function isMonThu(jsDate) {
  return [1, 2, 3, 4].includes(jsDate.getDay());
}

function isSunThu(jsDate) {
  return [0, 1, 2, 3, 4].includes(jsDate.getDay());
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
  card.innerHTML = "<div style='font-size: 18px; font-weight: 600;'>שבת שלום</div>";
  grid.appendChild(card);
}

function roundToNearest5(minutes) {
  return Math.round(minutes / 5) * 5;
}

function renderDay(jsDate, containerId, flagsId, sectionId) {
  const grid = document.getElementById(containerId);
  const flagsDiv = document.getElementById(flagsId);
  const section = document.getElementById(sectionId);
  
  grid.innerHTML = "";
  flagsDiv.innerHTML = "";
  section.classList.remove("shabbat", "bein-hazmanim");
  
  const shabbat = isShabbat(jsDate);
  const beinHazmanim = isBeinHazmanim(jsDate);
  const isLegal = isLegalHoliday(jsDate);
  const sunday = isSunday(jsDate);
  const sunThu = isSunThu(jsDate);
  
  if (shabbat) {
    section.classList.add("shabbat");
    buildShabbatCard(grid);
    return;
  }
  
  if (beinHazmanim) {
    section.classList.add("bein-hazmanim");
  }
  
  try {
    const cal = new ZmanimCalendar(
      new GeoLocation("Custom", CONFIG.lat, CONFIG.lon, CONFIG.elevation, CONFIG.tz),
      jsDate
    );
    
    // SHACHARIS
    buildCard(grid, CONFIG.labels.shacharis1, CONFIG.times.shacharis1);
    buildCard(grid, CONFIG.labels.shacharis2, CONFIG.times.shacharis2);
    
    // Shacharis 3: Sundays, Legal Holidays, and Bein Hazmanim only
    if (sunday || isLegal || beinHazmanim) {
      buildCard(grid, CONFIG.labels.shacharis3, CONFIG.times.shacharis3);
    }
    
    // ZMAN KRIAS SHEMA (with seconds)
    const zmKrias = cal.getGra3HoursBeforeSunset();
    if (zmKrias) {
      buildCard(grid, CONFIG.labels.zman_krias_shema, formatTime12WithSeconds(zmKrias));
    }
    
    // CHATZOS (with seconds)
    const chatzos = cal.getChatzos();
    if (chatzos) {
      buildCard(grid, CONFIG.labels.chatzos, formatTime12WithSeconds(chatzos));
    }
    
    // MINCHA GEDOLA (with seconds)
    const minchaGedola = cal.getMinchaGedola();
    if (minchaGedola) {
      buildCard(grid, CONFIG.labels.mincha_gedola, formatTime12WithSeconds(minchaGedola));
    }
    
    // MINCHA - with special times for Sunday/Legal holidays and Sun-Thu
    let minchaTime = CONFIG.times.mincha_default;
    let minchaExtra = "";
    
    if ((sunday || isLegal) && minchaGedola) {
      // Try 12:45pm on Sunday/Legal holidays
      const time1245 = new Date(jsDate);
      time1245.setHours(12, 45, 0, 0);
      if (time1245 > minchaGedola) {
        minchaTime = CONFIG.times.mincha_sunday;
        minchaExtra = "";
      }
    } else if (sunThu && minchaGedola) {
      // Try 1:15pm on Sun-Thu if Mincha Gedola is at or before 1:15pm
      const time115 = new Date(jsDate);
      time115.setHours(13, 15, 0, 0);
      if (time115 > minchaGedola && minchaGedola.getHours() < 13 || (minchaGedola.getHours() === 13 && minchaGedola.getMinutes() <= 15)) {
        minchaTime = CONFIG.times.mincha_sunthurs;
        minchaExtra = "";
      }
    }
    
    buildCard(grid, CONFIG.labels.mincha, minchaTime, minchaExtra);
    
    // PLAG HAMINCHA (with seconds)
    const plagHamincha = cal.getPlagHamincha();
    if (plagHamincha) {
      buildCard(grid, CONFIG.labels.plag_hamincha, formatTime12WithSeconds(plagHamincha));
    }
    
    // SHKIAH (with seconds)
    const shkiah = cal.getSeaLevelSunset();
    if (shkiah) {
      buildCard(grid, CONFIG.labels.shkiah, formatTime12WithSeconds(shkiah));
    }
    
    // MAARIV 1 (Sun-Thu at Shkiah)
    if (sunThu && shkiah) {
      buildCard(grid, CONFIG.labels.maariv1, formatTime12(shkiah), "(at Shkiah)");
    }
    
    // MAARIV 2 - Dynamic based on 8.5 degree nightfall
    let maariv2Time = CONFIG.times.maariv2;
    let maariv2Extra = "";
    
    try {
      const tzais85 = cal.getTzais85();
      if (tzais85) {
        const time815 = new Date(jsDate);
        time815.setHours(20, 15, 0, 0);
        
        if (time815 >= tzais85) {
          // Dynamic: use rounded 8.5 degree time
          const mins = roundToNearest5(tzais85.getHours() * 60 + tzais85.getMinutes());
          const hours = Math.floor(mins / 60);
          const minutesRemainder = mins % 60;
          maariv2Time = `${hours % 12 || 12}:${String(minutesRemainder).padStart(2, "0")}${hours >= 12 ? "pm" : "am"}`;
          maariv2Extra = "(Dynamic, 8.5°)";
        }
      }
    } catch (e) {
      console.warn("Could not calculate Tzais 8.5:", e);
    }
    
    buildCard(grid, CONFIG.labels.maariv2, maariv2Time, maariv2Extra);
    
    // MAARIV 3 (Sun-Thu)
    if (sunThu) {
      buildCard(grid, CONFIG.labels.maariv3, CONFIG.times.maariv3);
    }
    
  } catch (e) {
    console.error("Error rendering day:", e);
    buildCard(grid, "Error", "—", e.message);
  }
  
  // RENDER FLAGS
  const flagsArray = [];
  if (beinHazmanim) flagsArray.push("⏱️ " + CONFIG.labels.bein_hazmanim);
  if (isLegal) flagsArray.push("🇺🇸 Legal Holiday");
  
  if (flagsArray.length > 0) {
    flagsDiv.innerHTML = flagsArray.map(f => `<div class='flag active'>${f}</div>`).join("");
  } else {
    flagsDiv.innerHTML = "<div class='flag'>יום רגיל</div>";
  }
}

function render() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Update header
  const dayName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"][now.getDay()];
  document.getElementById("todayLine").textContent = `${dayName} • ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("refreshLine").textContent = `${hours}:${mins}`;
  document.getElementById("status").textContent = "✓ Last update: " + hours + ":" + mins;
  
  // Render both days
  renderDay(now, "todayGrid", "todayFlags", "todaySection");
  renderDay(tomorrow, "tomorrowGrid", "tomorrowFlags", "tomorrowSection");
}

console.log("Zmanim board initialized");
render();
setInterval(render, 60 * 1000);