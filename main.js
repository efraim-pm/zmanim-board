// main.js — Using kosher-zmanim library for halachic time calculations

let zmanCalculator = null;

const CONFIG = {
  tz: "America/New_York",
  lat: 41.09034,
  lon: -74.04837,
  elevation: 0,

  labels: {
    shacharis1: "Shacharis I / שחרית א׳",
    shacharis2: "Shacharis II / שחרית ב׳",
    shacharis3: "Shacharis III / שחרית ג׳",
    zman_krias_shema: "Zman Krias Shema / זמן קריאת שמע",
    chatzos: "Chatzos / חצות",
    mincha_gedola: "Mincha Gedola / מנחה גדולה",
    mincha: "Mincha / מנחה",
    plag_hamincha: "Plag Hamincha / פלג המנחה",
    maariv1: "Maariv I / מעריב א׳",
    maariv2: "Maariv II / מעריב ב׳",
    maariv3: "Maariv III / מעריב ג׳",
    shkiah: "Shkiah (Sunset) / שקיעה",
    rosh_chodesh: "Rosh Chodesh / ראש חודש",
    bein_hazmanim: "Bein Hazmanim / בין הזמנים",
    shabbat: "Shabbat Shalom / שבת שלום",
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
  },

  bein_hazmanim: [],
};

// --- Utilities & rendering
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: CONFIG.tz });
function fmt(d) { if (!d) return "—"; return timeFmt.format(d); }
function toTimeStringFromHM(hh, mm) { const dt = new Date(); dt.setHours(hh, mm, 0, 0); return timeFmt.format(dt); }
function roundToNearest5Minutes(d) { const mins = d.getHours() * 60 + d.getMinutes(); const r = Math.round(mins / 5) * 5; const hh = Math.floor(r / 60); const mm = r % 60; return { hh, mm }; }

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

async function computeZmanimForDate(jsDate) {
  if (!zmanCalculator) return null;
  
  try {
    // Set the date for calculation
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();
    
    const options = {
      date: jsDate,
      location: {
        latitude: CONFIG.lat,
        longitude: CONFIG.lon,
        timeZoneId: CONFIG.tz,
      }
    };
    
    const zman = new zmanCalculator(options);
    
    return {
      sunrise: zman.getSunrise(),
      sunset: zman.getSunset(),
      sofZmanShmaGRA: zman.getSofZmanShmaGRA(),
      sofZmanTfilaGRA: zman.getSofZmanTfilaGRA(),
      minchaGedola: zman.getMinchaGedola(),
      minchaKetana: zman.getMinchaKetana(),
      plagHamincha: zman.getPlagHamincha(),
      tzais: zman.getTzais(),
      chatzos: zman.getChatzos(),
    };
  } catch (e) {
    console.error("Error computing zmanim:", e);
    return null;
  }
}

function setHeader(now) { 
  const hebDays = ["Sunday / ראשון", "Monday / שני", "Tuesday / שלישי", "Wednesday / רביעי", "Thursday / חמישי", "Friday / שישי", "Saturday / שבת"]; 
  const dayName = hebDays[now.getDay()]; 
  const dateStr = now.toLocaleDateString("en-US"); 
  document.getElementById("todayLine").textContent = `${dayName}, ${dateStr}`; 
  const now2 = new Date(); 
  document.getElementById("refreshLine").textContent = `Updated: ${timeFmt.format(now2)}`; 
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
  
  // Build cards for key zmanim
  buildCard(grid, CONFIG.labels.zman_krias_shema, fmt(zmanim.sofZmanShmaGRA), "GRA");
  buildCard(grid, CONFIG.labels.chatzos, fmt(zmanim.chatzos));
  buildCard(grid, CONFIG.labels.mincha_gedola, fmt(zmanim.minchaGedola));
  buildCard(grid, CONFIG.labels.plag_hamincha, fmt(zmanim.plagHamincha));
  buildCard(grid, CONFIG.labels.shkiah, fmt(zmanim.sunset));
  buildCard(grid, CONFIG.labels.maariv2, fmt(toTimeStringFromHM(20, 15)));
  buildCard(grid, CONFIG.labels.maariv3, fmt(toTimeStringFromHM(21, 45)));
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

async function init() {
  // Dynamically import kosher-zmanim
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/kosher-zmanim@2.2.1/+esm");
    zmanCalculator = mod.KosherZmanim;
    console.log("kosher-zmanim library loaded successfully");
  } catch (e) {
    console.error('Failed to load kosher-zmanim via CDN:', e);
    return;
  }

  await render();
  setInterval(render, 60 * 1000);
}

init();
