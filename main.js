// main.js — Using kosher-zmanim library for accurate halachic times

const CONFIG = {
  tz: "America/New_York",
  lat: 41.1456,
  lon: -74.1220,
  location: "Chestnut Ridge, NY",

  labels: {
    alosDeg: "Alos 16.1° / עלות 16.1°",
    sunrise: "Sunrise / הנץ החמה",
    sofZmanShmaGRA: "Sof Zman Shma GR\"A / סוף זמן שמע גר״א",
    sofZmanTfilaGRA: "Sof Zman Tfila GR\"A / סוף זמן תפלה גר״א",
    chatzos: "Chatzos / חצות היום",
    minchaGedola: "Mincha Gedola / מנחה גדולה",
    plagHamincha: "Plag Hamincha / פלג המנחה",
    sunset: "Shkiah / שקיעת החמה",
    tzaisGeonim: "Tzais Gaonim 8.5° / צאת גאונים 8.5°",
    tzais72: "Tzais 72 Minutes / צאת 72 דקות",
    shabbat: "Shabbat Shalom / שבת שלום",
  },
};

const timeFmt = new Intl.DateTimeFormat("en-US", { 
  hour: "numeric", 
  minute: "2-digit", 
  hour12: true, 
  timeZone: CONFIG.tz 
});

function fmt(d) { 
  if (!d) return "—"; 
  return timeFmt.format(d); 
}

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

function isShabbat(jsDate) { 
  return jsDate.getDay() === 6; 
}

function setHeader(now) { 
  const hebDays = ["Sunday / ראשון", "Monday / שני", "Tuesday / שלישי", "Wednesday / רביעי", "Thursday / חמישי", "Friday / שישי", "Saturday / שבת"]; 
  const dayName = hebDays[now.getDay()]; 
  const dateStr = now.toLocaleDateString("en-US"); 
  document.getElementById("todayLine").textContent = `${dayName}, ${dateStr}`; 
  document.getElementById("refreshLine").textContent = `Updated: ${fmt(now)}`; 
}

let ZmanimCalendar = null;
let GeoLocation = null;

async function computeZmanimForDate(jsDate) {
  if (!ZmanimCalendar || !GeoLocation) {
    console.error("kosher-zmanim library not loaded");
    return null;
  }

  try {
    const location = new GeoLocation(CONFIG.location, CONFIG.lat, CONFIG.lon, 0, CONFIG.tz);
    const cal = new ZmanimCalendar(location);
    cal.setDate(jsDate);
    
    return {
      alos161: cal.getAlos16Point1Degrees(),
      sunrise: cal.getSunrise(),
      sofZmanShmaGRA: cal.getSofZmanShmaGRA(),
      sofZmanTfilaGRA: cal.getSofZmanTfilaGRA(),
      chatzos: cal.getChatzos(),
      minchaGedola: cal.getMinchaGedola(),
      plagHamincha: cal.getPlagHamincha(),
      sunset: cal.getSunset(),
      tzaisGeonim: cal.getTzaisGeonim8Point5Degrees(),
      tzais72: cal.getTzaisAchutzeiTechilet(),
    };
  } catch (e) {
    console.error("Error computing zmanim:", e);
    return null;
  }
}

async function renderDay(jsDate, containerId, flagsId) { 
  const grid = document.getElementById(containerId); 
  const flagsDiv = document.getElementById(flagsId); 
  grid.innerHTML = ""; 
  flagsDiv.innerHTML = ""; 
  
  const zmanim = await computeZmanimForDate(jsDate);
  
  if (!zmanim) {
    grid.textContent = "Unable to calculate zmanim";
    return;
  }
  
  buildCard(grid, CONFIG.labels.alosDeg, fmt(zmanim.alos161));
  buildCard(grid, CONFIG.labels.sunrise, fmt(zmanim.sunrise));
  buildCard(grid, CONFIG.labels.sofZmanShmaGRA, fmt(zmanim.sofZmanShmaGRA));
  buildCard(grid, CONFIG.labels.sofZmanTfilaGRA, fmt(zmanim.sofZmanTfilaGRA));
  buildCard(grid, CONFIG.labels.chatzos, fmt(zmanim.chatzos));
  buildCard(grid, CONFIG.labels.minchaGedola, fmt(zmanim.minchaGedola));
  buildCard(grid, CONFIG.labels.plagHamincha, fmt(zmanim.plagHamincha));
  buildCard(grid, CONFIG.labels.sunset, fmt(zmanim.sunset));
  buildCard(grid, CONFIG.labels.tzaisGeonim, fmt(zmanim.tzaisGeonim));
  buildCard(grid, CONFIG.labels.tzais72, fmt(zmanim.tzais72));
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

// Hebrew calendar functions
const HEBREW_MONTHS = [
  "ניסן", "אייר", "סיוון", "תמוז", "אב", "אלול",
  "תשרי", "חשוון", "כסלו", "טבת", "שבט", "אדר"
];

const HEBREW_DAYS = [
  "ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"
];

const ZMANIM_LABELS = [
  { key: "alos161", hebrew: "עלות 16.1°", english: "Alos 16.1°" },
  { key: "sunrise", hebrew: "הנץ החמה", english: "Sunrise (sea level)" },
  { key: "sofZmanShmaGRA", hebrew: "סוף זמן שמע גר״א", english: "Sof Zman Shma GRA" },
  { key: "sofZmanTfilaGRA", hebrew: "סוף זמן תפלה גר״א", english: "Sof Zman Tfila GRA" },
  { key: "chatzos", hebrew: "חצות היום", english: "Chatzos" },
  { key: "minchaGedola", hebrew: "מנחה גדולה", english: "Mincha Gedola" },
  { key: "plagHamincha", hebrew: "פלג המנחה", english: "Plag Hamincha" },
  { key: "sunset", hebrew: "שקיעת החמה", english: "Sunset" },
  { key: "tzaisGeonim", hebrew: "צאת גאונים 8.5°", english: "Tzais Geonim 8.5°" },
  { key: "tzais72", hebrew: "צאת 72 דקות", english: "Tzais 72 Minutes" },
];

let currentMonth = null;
let currentYear = null;

function getHebrewDateInfo(jsDate) {
  const month = jsDate.getMonth();
  const day = jsDate.getDate();
  
  let hebrewMonth = month - 8;
  if (hebrewMonth <= 0) hebrewMonth += 12;
  if (hebrewMonth > 12) hebrewMonth -= 12;

  return {
    hebrew: `${day} ${HEBREW_MONTHS[hebrewMonth - 1]}`,
    dayOfWeek: HEBREW_DAYS[jsDate.getDay()]
  };
}

async function renderDayCard(jsDate) {
  const card = document.createElement("div");
  card.className = "day-card";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToCheck = new Date(jsDate);
  dateToCheck.setHours(0, 0, 0, 0);

  if (dateToCheck.getTime() === today.getTime()) {
    card.classList.add("today");
  }

  if (isShabbat(jsDate)) {
    card.classList.add("shabbat");
  }

  const header = document.createElement("div");
  header.className = "day-header";

  const dateInfo = document.createElement("div");
  const hebrewInfo = getHebrewDateInfo(jsDate);
  dateInfo.innerHTML = `
    <div class="day-date">${jsDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
    <div class="day-hebrew">${hebrewInfo.dayOfWeek} ${hebrewInfo.hebrew}</div>
  `;

  const badge = document.createElement("div");
  if (isShabbat(jsDate)) {
    badge.className = "day-badge";
    badge.textContent = "Shabbat";
  } else if (dateToCheck.getTime() === today.getTime()) {
    badge.className = "day-badge today";
    badge.textContent = "Today";
  }

  header.appendChild(dateInfo);
  if (badge.textContent) header.appendChild(badge);
  card.appendChild(header);

  const zmanimDiv = document.createElement("div");
  zmanimDiv.className = "zmanim-list";

  if (isShabbat(jsDate)) {
    const shabbatMsg = document.createElement("div");
    shabbatMsg.style.textAlign = "center";
    shabbatMsg.style.padding = "20px";
    shabbatMsg.style.color = "var(--warning)";
    shabbatMsg.textContent = "🕯️ Shabbat Shalom 🕯️";
    zmanimDiv.appendChild(shabbatMsg);
  } else {
    const zmanim = await computeZmanimForDate(jsDate);
    if (zmanim) {
      ZMANIM_LABELS.forEach(label => {
        const zmanItem = document.createElement("div");
        zmanItem.className = "zman-item";

        const labelEl = document.createElement("div");
        labelEl.className = "zman-label";
        labelEl.textContent = label.hebrew;

        const timeEl = document.createElement("div");
        timeEl.className = "zman-time";
        timeEl.textContent = fmt(zmanim[label.key]);

        zmanItem.appendChild(labelEl);
        zmanItem.appendChild(timeEl);
        zmanimDiv.appendChild(zmanItem);
      });
    } else {
      const errorMsg = document.createElement("div");
      errorMsg.style.color = "var(--muted)";
      errorMsg.textContent = "Unable to calculate zmanim";
      zmanimDiv.appendChild(errorMsg);
    }
  }

  card.appendChild(zmanimDiv);
  return card;
}

async function renderMonth(month, year) {
  currentMonth = month;
  currentYear = year;

  const container = document.getElementById("calendarContainer");
  container.innerHTML = '<div class="loading"><div class="spinner"></div><div style="margin-top: 12px;">Loading calendar...</div></div>';

  const monthTitle = document.getElementById("monthTitle");
  monthTitle.textContent = `${new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })} / ${HEBREW_MONTHS[month]}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const calendarGrid = document.createElement("div");
  calendarGrid.className = "calendar-grid";

  for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
    const jsDate = new Date(year, month, d);
    const card = await renderDayCard(jsDate);
    calendarGrid.appendChild(card);
  }

  container.innerHTML = "";
  container.appendChild(calendarGrid);
}

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    
    btn.classList.add("active");
    document.getElementById(tabName).classList.add("active");
    
    if (tabName === "month" && !currentMonth) {
      const now = new Date();
      renderMonth(now.getMonth(), now.getFullYear());
      
      document.getElementById("prevBtn").addEventListener("click", () => {
        const date = new Date(currentYear, currentMonth - 1, 1);
        renderMonth(date.getMonth(), date.getFullYear());
      });

      document.getElementById("nextBtn").addEventListener("click", () => {
        const date = new Date(currentYear, currentMonth + 1, 1);
        renderMonth(date.getMonth(), date.getFullYear());
      });
    }
  });
});

// Load the kosher-zmanim library
async function init() {
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/kosher-zmanim@3.2.3/dist/bundle.mjs");
    ZmanimCalendar = mod.ZmanimCalendar;
    GeoLocation = mod.GeoLocation;
    console.log("✓ kosher-zmanim library loaded successfully");
    await render();
    setInterval(render, 60 * 1000);
  } catch (e) {
    console.error("Failed to load kosher-zmanim library:", e);
    document.getElementById("todayGrid").innerHTML = "<div class='card' style='grid-column: 1/-1; padding: 20px; text-align: center; color: #ff6b6b;'><strong>Error loading zmanim library</strong></div>";
  }
}

init();