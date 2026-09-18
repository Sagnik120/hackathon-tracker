(async function(){
  const main = document.getElementById('main');
  let hackathons = [];
  try {
    hackathons = await loadData();
  } catch (err){
    main.innerHTML = `<p style="color:var(--rose)">Couldn't load data/hackathons.json — ${err.message}</p>`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const now = new Date();

  if (!id){
    renderList();
  } else {
    const h = hackathons.find(x => x.id === id);
    if (!h){
      main.innerHTML = `<section class="hero"><h1>Hackathon not found</h1><p class="lede">It may have been removed from data/hackathons.json. <a href="hackathon.html">See all hackathons →</a></p></section>`;
    } else {
      renderDetail(h);
    }
  }

  function renderList(){
    main.innerHTML = `
      <section class="hero">
        <p class="hero-eyebrow">Full roster</p>
        <h1>Every hackathon you're in.</h1>
        <p class="lede">Open one to see its full round-by-round breakdown, dates and description.</p>
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input focus-ring" type="text" placeholder="Search a hackathon — typos are fine" aria-label="Search hackathons">
          <div class="search-results"></div>
        </div>
      </section>
      <div class="section-lead">
        <h2>All hackathons</h2>
        <span class="count-note">${hackathons.length} tracked</span>
      </div>
      <div class="hlist" id="hlist"></div>
    `;
    wireSearchBox(hackathons);

    const sorted = [...hackathons].sort((a,b) => {
      const order = { live: 0, soon: 1, upcoming: 2, done: 3 };
      return order[hackathonStatus(a, now)] - order[hackathonStatus(b, now)];
    });

    document.getElementById('hlist').innerHTML = sorted.map(h => {
      const col = colorFor(h.color);
      const status = hackathonStatus(h, now);
      const rounds = h.rounds || [];
      const nextRound = rounds.find(r => roundStatus(r, now) !== 'done') || rounds[rounds.length - 1];
      const nextRoundText = nextRound ? `${nextRound.name} — ${fmtDate(new Date(nextRound.start))}` : '';
      const metaText = [h.organizer, nextRoundText].filter(Boolean).join(' · ');
      return `<a class="hcard" style="--c:var(${col.c})" href="hackathon.html?id=${encodeURIComponent(h.id)}">
        <div>
          <div class="hcard-name">${h.name}</div>
          <div class="hcard-meta">${metaText}</div>
        </div>
        <div class="hcard-right">${statusPillHTML(status)}</div>
      </a>`;
    }).join('');
  }

  function renderDetail(h){
    const col = colorFor(h.color);
    const status = hackathonStatus(h, now);
    document.title = `${h.name} — Hack/Track`;

    main.innerHTML = `
      <div class="detail-hero" style="--c:var(${col.c})">
        <a class="detail-back" href="hackathon.html">&larr; All hackathons</a>
        <div>${statusPillHTML(status)}</div>
        <h1 class="detail-title">${h.name}</h1>
        <div class="detail-tags">
          ${(h.domain||[]).map(d => `<span class="tag">${d}</span>`).join('')}
        </div>
        <div class="detail-meta-grid">
          <div class="meta-box"><span>Organizer</span><b>${h.organizer || '—'}</b></div>
          <div class="meta-box"><span>Team size</span><b>${h.teamSize || '—'}</b></div>
          <div class="meta-box"><span>Mode</span><b>${h.mode || '—'}</b></div>
          <div class="meta-box"><span>Prize</span><b>${h.prize || '—'}</b></div>
        </div>
        ${h.link ? `<p style="margin-bottom:26px;"><a href="${h.link}" target="_blank" rel="noopener" style="color:var(${col.c}); font-weight:600; text-decoration:none;">Official page ↗</a></p>` : ''}
      </div>

      <div class="section-lead" style="margin-bottom:6px;">
        <h2>Round-by-round timeline</h2>
        <span class="count-note">${(h.rounds||[]).length} stage${(h.rounds||[]).length === 1 ? '' : 's'}</span>
      </div>

      <div class="stages" style="--c:var(${col.c}); margin-top:24px;">
        ${(h.rounds||[]).map(r => {
          const rStatus = roundStatus(r, now);
          const start = new Date(r.start);
          const end = new Date(r.end || r.start);
          const sameInstant = start.getTime() === end.getTime();
          return `<div class="stage ${rStatus === 'done' ? 'is-done' : ''}" style="--c:var(${col.c})">
            <div class="stage-dot"></div>
            <div class="stage-card">
              <div class="stage-head">
                <span class="stage-name">${r.name}</span>
                ${statusPillHTML(rStatus)}
              </div>
              <div class="stage-when">${sameInstant ? fmtDateTime(start) : `${fmtDateTime(start)} &nbsp;→&nbsp; ${fmtDateTime(end)}`}</div>
              <p class="stage-desc">${r.description || ''}</p>
              <div class="stage-mode">Mode: ${r.mode || 'Not specified'}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }
})();
