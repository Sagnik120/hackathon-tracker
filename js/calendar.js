(async function(){
  let hackathons = [];
  try {
    hackathons = await loadData();
  } catch (err){
    document.getElementById('cal-grid').innerHTML =
      `<p style="color:var(--rose)">Couldn't load data/hackathons.json — ${err.message}</p>`;
    return;
  }
  wireSearchBox(hackathons);

  document.getElementById('legend').innerHTML = hackathons.map(h => {
    const col = colorFor(h.color);
    return `<a class="legend-item" style="--c:var(${col.c}); text-decoration:none;" href="hackathon.html?id=${encodeURIComponent(h.id)}"><span class="legend-dot"></span>${h.shortName || h.name}</a>`;
  }).join('');

  const events = flattenEvents(hackathons);
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth(); // 0-indexed

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  document.getElementById('cal-dow').innerHTML = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');

  function isSameDay(a, b){
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  // index events by local day key (based on start date, spanning multi-day rounds too)
  function eventsOnDay(y, m, d){
    const dayStart = new Date(y, m, d, 0, 0, 0);
    const dayEnd = new Date(y, m, d, 23, 59, 59);
    return events.filter(ev => ev.start <= dayEnd && ev.end >= dayStart);
  }

  function openDrawer(y, m, d){
    const list = eventsOnDay(y, m, d);
    const dateObj = new Date(y, m, d);
    document.getElementById('drawer-date').textContent = dateObj.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const body = document.getElementById('drawer-body');
    if (!list.length){
      body.innerHTML = `<p style="color:var(--ink-faint)">Nothing scheduled this day.</p>`;
    } else {
      body.innerHTML = list.map(ev => {
        const col = colorFor(ev.hackathon.color);
        const status = roundStatus(ev.round, now);
        const sameInstant = ev.start.getTime() === ev.end.getTime();
        const sameDay = !sameInstant && isSameDay(ev.start, ev.end);
        const multiDay = !sameInstant && !sameDay;
        const displayName = ev.hackathon.shortName || ev.hackathon.name;
        return `<a class="event-card" style="--c:var(${col.c}); margin-bottom:10px;" href="hackathon.html?id=${encodeURIComponent(ev.hackathon.id)}">
          <div class="event-top">
            <span class="event-time">${fmtTime(ev.start)}${sameDay ? ' – ' + fmtTime(ev.end) : ''}</span>
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
    }
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer-backdrop').classList.add('open');
  }

  function closeDrawer(){
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('open');
  }
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);

  function render(){
    document.getElementById('cal-title').textContent =
      new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month:'long', year:'numeric' });

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++){
      cells.push({ day: daysInPrevMonth - startWeekday + 1 + i, out: true });
    }
    for (let d = 1; d <= daysInMonth; d++){
      cells.push({ day: d, out: false });
    }
    while (cells.length % 7 !== 0){
      cells.push({ day: cells.length - (startWeekday + daysInMonth) + 1, out: true });
    }

    const gridEl = document.getElementById('cal-grid');
    gridEl.innerHTML = cells.map(cell => {
      if (cell.out){
        return `<div class="cal-cell out"></div>`;
      }
      const isToday = cell.day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
      const dayEvents = eventsOnDay(viewYear, viewMonth, cell.day);
      const maxShow = 3;
      const chips = dayEvents.slice(0, maxShow).map(ev => {
        const col = colorFor(ev.hackathon.color);
        const displayName = ev.hackathon.shortName || ev.hackathon.name;
        const title = `${displayName} — ${ev.round.name}\nStarts: ${fmtDateTime(ev.start)}\nEnds: ${fmtDateTime(ev.end)}`;
        return `<button class="cal-chip" style="--c:var(${col.c}); --c-soft:var(${col.soft})" data-id="${ev.hackathon.id}" title="${title}">${displayName}</button>`;
      }).join('');
      const more = dayEvents.length > maxShow ? `<span class="cal-more">+${dayEvents.length - maxShow} more</span>` : '';
      return `<div class="cal-cell ${isToday ? 'today' : ''}" data-y="${viewYear}" data-m="${viewMonth}" data-d="${cell.day}">
        <span class="cal-daynum">${cell.day}</span>
        ${chips}${more}
      </div>`;
    }).join('');

    gridEl.querySelectorAll('.cal-cell:not(.out)').forEach(cellEl => {
      cellEl.addEventListener('click', () => {
        openDrawer(+cellEl.dataset.y, +cellEl.dataset.m, +cellEl.dataset.d);
      });
    });
    gridEl.querySelectorAll('.cal-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `hackathon.html?id=${encodeURIComponent(chip.dataset.id)}`;
      });
    });
  }

  document.getElementById('cal-prev').addEventListener('click', () => {
    viewMonth--; if (viewMonth < 0){ viewMonth = 11; viewYear--; } render();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    viewMonth++; if (viewMonth > 11){ viewMonth = 0; viewYear++; } render();
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    viewYear = now.getFullYear(); viewMonth = now.getMonth(); render();
  });

  render();
})();
