import { DateTime } from "https://cdn.jsdelivr.net/npm/luxon@3.5.0/+esm";
import { GeoLocation, Zmanim, HebrewDate } from "https://cdn.jsdelivr.net/npm/@hebcal/core@2.4.0/+esm";

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09009044926275,
  lon: -74.04906956474558,
  elevation: 0,

  // Shacharis times
  shacharis: {
    default: "6:45",
    roshChodesh: "6:30",
    shach2: "7:30",
    shach3: "8:45",
  },

  // Mincha times
  mincha: {
    default: "1:45pm",
    sunday: "12:45pm",
    winterSunday: "12:45pm",
  },

  // Maariv times
  maariv: {
    fixed2: "8:15pm",
    fixed3: "9:45pm",
  },

  // Winter months (0-indexed: 0=Jan, 1=Feb, 11=Dec)
  winterMonths: [11, 0, 1, 2],

  // US Federal holidays
  federalHolidays: [
    "01-01", // New Year's Day
    "07-04", // Independence Day
    "12-25", // Christmas
  ],
};

function buildRow(grid, label, timeText, extra = "") {
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

function fmtTime(dateTime) {
  return dateTime.toFormat("h:mm a");
}

function isWinterMonth(date) {
  const m0 = date.month - 1; // Convert to 0-indexed
  return CONFIG.winterMonths.includes(m0);
}

function isUSFederalHoliday(date) {
  const month = date.month.toString().padStart(2, "0");
  const day = date.day.toString().padStart(2, "0");
  const mmdd = `${month}-${day}`;
  
  if (CONFIG.federalHolidays.includes(mmdd)) return true;
  
  // Labor Day: 1st Monday in September
  if (date.month === 9) {
    const first = date.set({ day: 1 });
    const weekday = first.weekday;
    const delta = (1 - weekday + 7) % 7;
    const firstMonday = first.plus({ days: delta });
    if (date.hasSame(firstMonday, "day")) return true;
  }
  
  // Memorial Day: Last Monday in May
  if (date.month === 5) {
    const last = date.set({ day: date.daysInMonth });
    const weekday = last.weekday;
    const delta = (weekday - 1);
    const lastMonday = last.minus({ days: delta });
    if (date.hasSame(lastMonday, "day")) return true;
  }
  
  // Thanksgiving: 4th Thursday in November
  if (date.month === 11) {
    const first = date.set({ day: 1 });
    const weekday = first.weekday;
    const delta = (4 - weekday + 7) % 7;
    const firstThu = first.plus({ days: delta });
    const fourthThu = firstThu.plus({ weeks: 3 });
    if (date.hasSame(fourthThu, "day")) return true;
  }
  
  return false;
}

async function render() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  
  try {
    const now = DateTime.now().setZone(CONFIG.tz);
    const date = now;
    
    // Update header
    document.getElementById("refreshLine").textContent = `Local time: ${fmtTime(now)}`;
    
    // Get Hebrew date for flags
    const hdate = new HebrewDate(date.toJSDate());
    const isRoshChodesh = hdate.isRoshChodesh();
    
    // Compute zmanim
    const geo = new GeoLocation("Location", CONFIG.lat, CONFIG.lon, CONFIG.elevation);
    const zim = new Zmanim(date.toJSDate(), geo, { timeZone: CONFIG.tz });
    
    const isSunday = date.weekday === 7;
    const isMonThu = [1, 2, 3, 4].includes(date.weekday);
    const isWinter = isWinterMonth(date);
    const isLegalHoliday = isUSFederalHoliday(date);
    
    // Update title
    const weekdayStr = date.toFormat("cccc");
    const flagsLine = [
      `Rosh Chodesh: ${isRoshChodesh ? "Yes" : "No"}`,
      `US Holiday: ${isLegalHoliday ? "Yes" : "No"}`,
    ].join(" | ");
    
    document.getElementById("todayLine").textContent = 
      `${weekdayStr} • ${date.toFormat("MMM dd, yyyy")} • ${flagsLine}`;
    
    // SHACHARIS
    if (date.weekday >= 1 && date.weekday <= 5) { // Mon-Fri
      const shach1 = isRoshChodesh ? CONFIG.shacharis.roshChodesh : CONFIG.shacharis.default;
      buildRow(grid, "Shacharis 1", shach1);
      buildRow(grid, "Shacharis 2", CONFIG.shacharis.shach2);
    } else if (isSunday) {
      buildRow(grid, "Shacharis 1", CONFIG.shacharis.default);
      buildRow(grid, "Shacharis 2", CONFIG.shacharis.shach2);
    }
    
    // Shacharis 3 on Sunday or legal holidays
    if (isSunday || isLegalHoliday) {
      buildRow(grid, "Shacharis 3", CONFIG.shacharis.shach3, "Sun + major US federal holidays only");
    }
    
    // MINCHA
    let minchaTime = CONFIG.mincha.default;
    if (isSunday || isLegalHoliday) {
      minchaTime = isWinter ? CONFIG.mincha.winterSunday : CONFIG.mincha.sunday;
    }
    buildRow(grid, "Mincha", minchaTime);
    
    // MAARIV
    const shkiah = zim.shkiah();
    if (shkiah && (isSunday || isMonThu)) {
      buildRow(grid, "Maariv 1 (Shkiah)", fmtTime(DateTime.fromJSDate(shkiah, { zone: CONFIG.tz })));
    }
    
    buildRow(grid, "Maariv 2", CONFIG.maariv.fixed2);
    
    // Maariv 3 on Sun-Thu
    if (isSunday || isMonThu) {
      buildRow(grid, "Maariv 3", CONFIG.maariv.fixed3);
    }
    
  } catch (e) {
    console.error("Render error:", e);
    const msg = e?.message ?? String(e);
    document.getElementById("todayLine").textContent = `Error: ${msg}`;
    buildRow(grid, "Status", "Error", msg);
  }
}

render();
setInterval(render, 60 * 1000);