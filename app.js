const HYPE_LINES = [
  "you locked in",
  "slay bestie",
  "okayyyyy growth era",
  "you ate that",
  "control looks good on you",
  "main character discipline",
  "absolute star behavior",
  "no vape just power",
  "bestie you did THAT",
  "hold the line legend",
  "this is your villain arc but healthy"
];

function pickHypeLine() {
  return HYPE_LINES[Math.floor(Math.random() * HYPE_LINES.length)];
}

function parseTimestamp(ts) {
  // 13-02-26 07:27 PM
  const m = ts.trim().match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  const dd = parseInt(m[1], 10);
  const MM = parseInt(m[2], 10) - 1;
  const yy = parseInt(m[3], 10);
  let hh = parseInt(m[4], 10);
  const mm = parseInt(m[5], 10);
  const ap = m[6].toUpperCase();

  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;

  return new Date(2000 + yy, MM, dd, hh, mm, 0, 0);
}

function dayKey(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}-${mm}-${yy}`;
}

function windowLabel(d) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 22) return "Evening";
  return "Late night";
}

function computeStreak(dayTimes) {
  const days = [...dayTimes].sort((a, b) => a - b);
  if (!days.length) return 0;

  let best = 1;
  let cur = 1;

  for (let i = 1; i < days.length; i++) {
    const diff = (days[i] - days[i - 1]) / (24 * 3600 * 1000);
    if (diff === 1) cur += 1;
    else {
      best = Math.max(best, cur);
      cur = 1;
    }
  }
  return Math.max(best, cur);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(s => s.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    const obj = {};
    header.forEach((h, idx) => obj[h] = (parts[idx] ?? "").trim());
    rows.push(obj);
  }

  return rows;
}

function latestDate(rows) {
  let latest = null;
  for (const r of rows) {
    const d = parseTimestamp(r.timestamp || "");
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

function periodRange(mode, anchor) {
  if (!anchor) return null;

  const start = new Date(anchor);
  const end = new Date(anchor);

  if (mode === "week") {
    const day = (start.getDay() + 6) % 7; // Monday start
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime() + 7 * 24 * 3600 * 1000);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function inRange(d, range) {
  return d >= range.start && d < range.end;
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

document.getElementById("generate").addEventListener("click", async () => {
  const file = document.getElementById("file").files[0];
  if (!file) {
    setStatus("Please upload habits_log.csv");
    return;
  }

  const habit = document.getElementById("habit").value;
  const period = document.getElementById("period").value;

  const text = await file.text();
  const rows = parseCSV(text);

  const anchor = latestDate(rows);
  if (!anchor) {
    setStatus("No valid timestamps found. Check timestamp format in CSV.");
    return;
  }

  const range = periodRange(period, anchor);

  const filtered = [];
  for (const r of rows) {
    if ((r.habit || "") !== habit) continue;
    if ((r.status || "").toLowerCase() !== "success") continue;

    const d = parseTimestamp(r.timestamp || "");
    if (!d || !inRange(d, range)) continue;

    const minutes = parseInt(r.minutes || "0", 10) || 0;
    filtered.push({ d, minutes });
  }

  const total = filtered.reduce((s, x) => s + x.minutes, 0);
  const wins = filtered.length;
  const maxM = filtered.reduce((m, x) => Math.max(m, x.minutes), 0);
  const avgM = wins ? Math.round(total / wins) : 0;

  const byDay = new Map();
  const dayTimes = new Set();
  const windows = {};

  for (const x of filtered) {
    const k = dayKey(x.d);
    byDay.set(k, (byDay.get(k) || 0) + x.minutes);

    const dayTime = new Date(x.d.getFullYear(), x.d.getMonth(), x.d.getDate()).getTime();
    dayTimes.add(dayTime);

    const w = windowLabel(x.d);
    windows[w] = (windows[w] || 0) + 1;
  }

  let bestDay = "—";
  let bestDayM = 0;
  for (const [k, v] of byDay.entries()) {
    if (v > bestDayM) {
      bestDayM = v;
      bestDay = k;
    }
  }

  let topWindow = "—";
  let topCount = 0;
  for (const [k, v] of Object.entries(windows)) {
    if (v > topCount) {
      topCount = v;
      topWindow = k;
    }
  }

  const streakD = computeStreak(dayTimes);
  const totalH = Math.floor(total / 60);
  const totalM = total % 60;

  const score = total;

  document.getElementById("periodLabel").textContent = period === "week" ? "WEEKLY WRAPPED" : "MONTHLY WRAPPED";
  document.getElementById("title").textContent = habit === "VAPE_FREE" ? "Vape Free Wrapped" : "Focus Wrapped";
  document.getElementById("habitLabel").textContent = habit;

  document.getElementById("totalH").textContent = totalH;
  document.getElementById("totalM").textContent = totalM;
  document.getElementById("wins").textContent = wins;
  document.getElementById("maxM").textContent = maxM;
  document.getElementById("avgM").textContent = avgM;
  document.getElementById("bestDay").textContent = bestDay;
  document.getElementById("bestDayM").textContent = bestDayM;
  document.getElementById("streakD").textContent = streakD;
  document.getElementById("topWindow").textContent = topWindow;
  document.getElementById("badge").textContent = `Control Score: ${score}`;

  document.getElementById("hypeLine").textContent = pickHypeLine();

  document.getElementById("download").disabled = false;

  if (!wins) setStatus("No matching wins found in selected period.");
  else setStatus("Wrapped generated. Download PNG when ready.");
});

document.getElementById("download").addEventListener("click", async () => {
  const card = document.getElementById("card");

  setStatus("Rendering PNG...");
  const canvas = await html2canvas(card, { scale: 2, backgroundColor: null });

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "habit_wrapped.png";
  a.click();

  setStatus("Downloaded habit_wrapped.png");
});
