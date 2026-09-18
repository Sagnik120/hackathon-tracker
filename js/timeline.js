(async function(){
  let hackathons = [];
  try {
    hackathons = await loadData();
  } catch (err){
    document.getElementById('timeline').innerHTML =
      `<p style="color:var(--rose)">Couldn't load data/hackathons.json — ${err.message}</p>`;
    return;
  }

  wireSearchBox(hackathons);

  const events = flattenEvents(hackathons);
  const now = new Date();

  // hero stats
  const live = hackathons.filter(h => hackathonStatus(h, now) === 'live').length;
  const upcoming = hackathons.filter(h => ['upcoming','soon'].includes(hackathonStatus(h, now))).length;
  const done = hackathons.filter(h => hackathonStatus(h, now) === 'done').length;
  document.getElementById('hero-stats').innerHTML = `
    <div class="hero-stat"><b>${hackathons.length}</b><span>Hackathons tracked</span></div>
    <div class="hero-stat"><b>${live}</b><span>Live right now</span></div>
    <div class="hero-stat"><b>${upcoming}</b><span>Still to come</span></div>
    <div class="hero-stat"><b>${done}</b><span>Completed</span></div>
  `;

  let activeFilter = 'all';
  let activeRange = 'today';

  function dayKey(d){
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function isSameDay(a,b){ return dayKey(a) === dayKey(b); }
  function startOfToday(){ return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }

  function render(opts = {}){
    const todayStart = startOfToday();
    const filtered = events.filter(ev => {
      if (activeFilter !== 'all' && roundStatus(ev.round, now) !== activeFilter) return false;
      // "From today onward": keep anything still in progress or not yet started,
      // i.e. its window hasn't fully ended before today began.
      if (activeRange === 'today' && ev.end < todayStart) return false;
      return true;
    });

    const timelineEl = document.getElementById('timeline');
    if (!filtered.length){
      if (activeFilter === 'done' && activeRange === 'today'){
        timelineEl.innerHTML = `
          <div class="empty-note" style="margin-left:0;">
            No completed milestones from today onward.
            <button class="filter-chip" id="switch-to-all" style="margin-top:8px; display:inline-flex;">View whole timeline with completed events →</button>
          </div>`;
        const switchBtn = document.getElementById('switch-to-all');
        if (switchBtn){
          switchBtn.addEventListener('click', () => {
            document.querySelectorAll('#range-toggle [data-range]').forEach(c => c.classList.remove('active'));
            const allBtn = document.querySelector('#range-toggle [data-range="all"]');
            if (allBtn) allBtn.classList.add('active');
            activeRange = 'all';
            render();
          });
        }
      } else {
        timelineEl.innerHTML = `<p class="empty-note" style="margin-left:0;">Nothing matches this filter.</p>`;
      }
      return;
    }

    // In "From today onward" mode, ongoing events that started earlier are shown under Today
    // so the timeline actually begins from Today, not past weeks.
    const mapped = filtered.map(ev => {
      const effectiveDate = (activeRange === 'today' && ev.start < todayStart) ? todayStart : ev.start;
      return { ev, effectiveDate };
    });

    mapped.sort((a, b) => a.effectiveDate - b.effectiveDate || a.ev.start - b.ev.start);

    // group by day
    const groups = [];
    let currentKey = null, currentGroup = null;
    mapped.forEach(({ev, effectiveDate}) => {
      const key = dayKey(effectiveDate);
      if (key !== currentKey){
        currentGroup = { date: effectiveDate, key, items: [] };
        groups.push(currentGroup);
        currentKey = key;
      }
      currentGroup.items.push(ev);
    });

    timelineEl.innerHTML = groups.map(g => {
      const isToday = isSameDay(g.date, now);
      const dow = g.date.toLocaleDateString(undefined, { weekday:'short' });
      const dom = g.date.toLocaleDateString(undefined, { day:'numeric' });
      const mon = g.date.toLocaleDateString(undefined, { month:'short', year:'numeric' });
      const eventsHTML = g.items.map(ev => {
        const col = colorFor(ev.hackathon.color);
        const status = roundStatus(ev.round, now);
        const sameInstant = ev.start.getTime() === ev.end.getTime();
        const multiDay = !sameInstant && !isSameDay(ev.start, ev.end);
        const displayName = ev.hackathon.shortName || ev.hackathon.name;
        return `<a class="event-card" style="--c:var(${col.c})" href="hackathon.html?id=${encodeURIComponent(ev.hackathon.id)}">
          <div class="event-top">
            <span class="event-time">${fmtTime(ev.start)}${!sameInstant && isSameDay(ev.start, ev.end) ? ' – ' + fmtTime(ev.end) : ''}</span>
            ${statusPillHTML(status)}
          </div>
          <div class="event-title">${ev.round.name}</div>
          <div class="event-hack"><b>${displayName}</b> · ${ev.round.mode || ''}</div>
          <div class="event-range">
            <div class="start-cell"><span>Starts</span><b>${fmtDateTime(ev.start)}</b></div>
            ${!sameInstant ? `<div class="end-cell"><span>Ends / Deadline</span><b>${fmtDateTime(ev.end)}</b></div>` : ''}
            ${multiDay ? `<span class="multiday-flag">Runs ${Math.ceil((ev.end - ev.start)/864e5)} days</span>` : ''}
          </div>
        </a>`;
      }).join('');

      return `<div class="day-group ${isToday ? 'is-today' : ''}">
        <div class="day-head">
          <div class="day-date"><span class="dow">${dow}${isToday ? ' · Today' : ''}</span><span class="dom">${dom}</span><span class="mon">${mon}</span></div>
        </div>
        <div class="day-dot"></div>
        <div class="day-events">${eventsHTML}</div>
      </div>`;
    }).join('');

    if (opts.scrollToToday){
      const todayGroup = timelineEl.querySelector('.day-group.is-today');
      if (todayGroup) todayGroup.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  document.getElementById('filters').addEventListener('click', e => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    document.querySelectorAll('#filters .filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
  });

  document.getElementById('range-toggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    document.querySelectorAll('#range-toggle [data-range]').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeRange = btn.dataset.range;
    render({ scrollToToday: activeRange === 'today' });
  });

  render({ scrollToToday: true });
})();
