const CONFIG = {
  tz: "America/New_York",
  lat: 41.09009044926275,
  lon: -74.04906956474558,

  shacharis: {
    default: "6:45",
    roshChodesh: "6:30",
    shach2: "7:30",
    shach3: "8:45",
  },

  mincha: {
    default: "1:45pm",
    sunday: "12:45pm",
  },

  maariv: {
    fixed2: "8:15pm",
    fixed3: "9:45pm",
  },

  winterMonths: [11, 0, 1, 2],
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

function getWeekday(date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

function formatDate(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTime12(hours, minutes) {
  const ampm = hours >= 12 ? "pm" : "am";
  const h = hours % 12 || 12;
  const m = String(minutes).padStart(2, "0");
  return `${h}:${m}${ampm}`;
}

function isWinterMonth(date) {
  const m = date.getMonth();
  return CONFIG.winterMonths.includes(m);
}

function isUSFederalHoliday(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = date.getDay();
  
  // New Year's Day
  if (month === 1 && day === 1) return true;
  
  // Independence Day
  if (month === 7 && day === 4) return true;
  
  // Christmas
  if (month === 12 && day === 25) return true;
  
  // Labor Day: 1st Monday in September
  if (month === 9 && weekday === 1 && day <= 7) return true;
  
  // Memorial Day: Last Monday in May
  if (month === 5 && weekday === 1 && day >= 25) return true;
  
  // Thanksgiving: 4th Thursday in November
  if (month === 11 && weekday === 4 && day >= 22 && day <= 28) return true;
  
  return false;
}

function render() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  
  const now = new Date();
  const date = now;
  
  // Update header
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("refreshLine").textContent = `Local time: ${hours}:${mins}`;
  
  const isSunday = date.getDay() === 0;
  const isMonThu = [1, 2, 3, 4].includes(date.getDay());
  const isWinter = isWinterMonth(date);
  const isLegalHoliday = isUSFederalHoliday(date);
  
  const weekdayStr = getWeekday(date);
  const dateStr = formatDate(date);
  
  document.getElementById("todayLine").textContent = 
    `${weekdayStr} • ${dateStr}`;
  
  // SHACHARIS
  if (date.getDay() >= 1 && date.getDay() <= 5) { // Mon-Fri
    buildRow(grid, "Shacharis 1", CONFIG.shacharis.default);
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
    minchaTime = CONFIG.mincha.sunday;
  }
  buildRow(grid, "Mincha", minchaTime);
  
  // MAARIV
  buildRow(grid, "Maariv 2", CONFIG.maariv.fixed2);
  
  // Maariv 3 on Sun-Thu
  if (isSunday || isMonThu) {
    buildRow(grid, "Maariv 3", CONFIG.maariv.fixed3);
  }
}

console.log("Script initialized successfully");
render();
setInterval(render, 60 * 1000);