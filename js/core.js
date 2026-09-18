/* ===========================================================
   core.js — shared across all pages
   Loads data/hackathons.json (the single file you edit),
   computes live status, provides fuzzy search, drives the
   custom cursor and the live clock.
=========================================================== */

const COLOR_VARS = {
  violet: { c: '--violet', soft: '--violet-soft' },
  teal:   { c: '--teal',   soft: '--teal-soft'   },
  amber:  { c: '--amber',  soft: '--amber-soft'  },
  indigo: { c: '--indigo', soft: '--indigo-soft' },
  rose:   { c: '--rose',   soft: '--rose-soft'   },
};

function colorFor(key){ return COLOR_VARS[key] || COLOR_VARS.indigo; }

async function loadData(){
  const res = await fetch('data/hackathons.json', { cache: 'no-store' });
  if(!res.ok) throw new Error('Could not load data/hackathons.json');
  const json = await res.json();
  return json.hackathons || [];
}

/* Flatten every hackathon into a list of {hackathon, round, start, end} events */
function flattenEvents(hackathons){
  const events = [];
  hackathons.forEach(h => {
    (h.rounds || []).forEach(r => {
      events.push({
        hackathon: h,
        round: r,
        start: new Date(r.start),
        end: new Date(r.end || r.start),
      });
    });
  });
  events.sort((a,b) => a.start - b.start);
  return events;
}

/* Status of a single round relative to now */
function roundStatus(round, now = new Date()){
  const start = new Date(round.start);
  const end = new Date(round.end || round.start);
  if (now > end) return 'done';
  if (now >= start && now <= end) return 'live';
  const hoursToStart = (start - now) / 36e5;
  if (hoursToStart <= 72) return 'soon';
  return 'upcoming';
}

/* Overall status of a hackathon = status of its "current" round */
function hackathonStatus(hackathon, now = new Date()){
  const rounds = hackathon.rounds || [];
  if (!rounds.length) return 'upcoming';
  const live = rounds.find(r => roundStatus(r, now) === 'live');
  if (live) return 'live';
  const soon = rounds.find(r => roundStatus(r, now) === 'soon');
  if (soon) return 'soon';
  const allDone = rounds.every(r => roundStatus(r, now) === 'done');
  if (allDone) return 'done';
  return 'upcoming';
}

const STATUS_LABEL = { live: 'Live now', soon: 'Starting soon', upcoming: 'Upcoming', done: 'Completed' };

function statusPillHTML(status){
  return `<span class="pill status-${status}">${STATUS_LABEL[status]}</span>`;
}

function fmtDate(d){
  return d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
}
function fmtTime(d){
  return d.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
}
function fmtDateTime(d){ return `${fmtDate(d)} · ${fmtTime(d)}`; }

/* ---------------- fuzzy search ----------------
   Normalizes case/spacing/punctuation, then uses Levenshtein
   distance (with a small tolerance relative to word length) so
   typos, wrong case, extra spaces, singular/plural etc. still
   match the right hackathon. */
function normalize(s){
  return (s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a, b){
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++){
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++){
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,          // deletion
        dp[j - 1] + 1,      // insertion
        prev + (a[i-1] === b[j-1] ? 0 : 1) // substitution
      );
      prev = tmp;
    }
  }
  return dp[n];
}

/* Best fuzzy-match score (0..1, higher = better) of query against text */
function fuzzyScore(query, text){
  const q = normalize(query);
  const t = normalize(text);
  if (!q) return 0;
  if (t.includes(q)) return 1; // direct substring, case/space-insensitive
  // token-level: best match of query against any word or short phrase in text
  const words = t.split(' ');
  let best = 0;
  for (let i = 0; i < words.length; i++){
    for (let span = 1; span <= 3 && i + span <= words.length; span++){
      const chunk = words.slice(i, i + span).join(' ');
      if (Math.abs(chunk.length - q.length) > Math.max(4, q.length * 0.6)) continue;
      const dist = levenshtein(q, chunk);
      const tolerance = Math.max(1, Math.floor(q.length * 0.34)); // allow ~1/3 char typos
      if (dist <= tolerance){
        const score = 1 - dist / Math.max(q.length, chunk.length, 1);
        if (score > best) best = score;
      }
    }
  }
  return best * 0.92; // slightly below an exact substring match
}

function searchHackathons(hackathons, query){
  const q = normalize(query);
  if (!q) return [];
  const scored = hackathons.map(h => {
    const fields = [h.name, h.shortName, h.organizer, (h.domain||[]).join(' ')];
    const score = Math.max(...fields.map(f => fuzzyScore(query, f || '')));
    return { h, score };
  }).filter(x => x.score > 0.32);
  scored.sort((a,b) => b.score - a.score);
  return scored.map(x => x.h);
}

/* ---------------- custom cursor ---------------- */
function initCursor(){
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    if (!document.body.classList.contains('cursor-active')) {
      document.body.classList.add('cursor-active');
    }
  });

  window.addEventListener('mousedown', () => {
    ring.classList.add('is-down');
  });
  window.addEventListener('mouseup', () => {
    ring.classList.remove('is-down');
  });

  document.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-active');
  });
  document.addEventListener('mouseenter', () => {
    document.body.classList.add('cursor-active');
  });

  function raf(){
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(raf);
  }
  raf();

  const hoverables = 'a, button, .filter-chip, .range-btn, .cal-chip, .search-input, input, .cal-btn, [role="button"], [role="tab"]';
  document.addEventListener('mouseover', e => {
    if (e.target.closest && e.target.closest(hoverables)) ring.classList.add('is-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest && e.target.closest(hoverables)) ring.classList.remove('is-hover');
  });
}

/* ---------------- live clock ---------------- */
function initClock(el){
  if (!el) return;
  function tick(){
    const now = new Date();
    el.textContent = now.toLocaleString(undefined, {
      weekday:'short', day:'numeric', month:'short',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------------- shared search box wiring ---------------- */
function wireSearchBox(hackathons){
  const input = document.querySelector('.search-input');
  const results = document.querySelector('.search-results');
  if (!input || !results) return;

  function render(query){
    if (!query.trim()){ results.classList.remove('open'); results.innerHTML=''; return; }
    const hits = searchHackathons(hackathons, query).slice(0, 8);
    if (!hits.length){
      results.innerHTML = `<div class="search-empty">No hackathon matches “${query}”. Try a shorter word.</div>`;
      results.classList.add('open');
      return;
    }
    results.innerHTML = hits.map(h => {
      const status = hackathonStatus(h);
      const meta = [h.organizer, STATUS_LABEL[status]].filter(Boolean).join(' · ');
      return `<a class="search-hit" href="hackathon.html?id=${encodeURIComponent(h.id)}">
        <div class="hit-name">${h.name}</div>
        <div class="hit-meta">${meta}</div>
      </a>`;
    }).join('');
    results.classList.add('open');
  }

  input.addEventListener('input', e => render(e.target.value));
  input.addEventListener('focus', e => { if (e.target.value.trim()) results.classList.add('open'); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) results.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initClock(document.querySelector('.live-clock'));
});
