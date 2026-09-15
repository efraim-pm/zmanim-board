// main.js — Using kosher-zmanim library for accurate halachic times

const CONFIG = {
  tz: "America/New_York",
  lat: 41.0903,
  lon: -74.0484,
  location: "Englewood, NY",

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
    document.getElementById("todayGrid").innerHTML = "<div class='card' style='grid-column: 1/-1; padding: 20px; text-align: center; color: #ff6b6b;'><strong>Error loading zmanim library</strong><br><small>" + e.message + "</small></div>";
  }
}

init();
