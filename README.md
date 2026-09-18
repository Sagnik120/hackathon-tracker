# Hack/Track

A static site that tracks all your hackathons in one place: a day-by-day timeline, a calendar, and a detail page per hackathon. Pure HTML/CSS/JS — no build step, no server needed.

## Open it

Just double-click `index.html`, or for best results (some browsers block `fetch()` on local files) serve the folder:

```
cd hackathon-tracker
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

To use it from your phone: put the folder on any free static host (GitHub Pages, Netlify, Vercel — drag-and-drop the folder) and open the link on your phone. It's fully responsive.

## Deploying on Render (Free)

1. Sign in to [render.com](https://render.com) with GitHub.
2. Click **New +** → **Static Site**.
3. Select your repository (`hackathon-tracker`).
4. Configure:
   - **Build Command**: *(Leave empty)*
   - **Publish Directory**: `.`
5. Click **Create Static Site**. Any future `git push` will auto-deploy in seconds!

## The only file you ever need to edit

`data/hackathons.json`

Every page — timeline, calendar, search, and each detail page — is generated from this one file. Add a hackathon, delete one, or fix a date/time here and everything updates automatically; you never touch the HTML/CSS/JS.

Structure of one hackathon entry:

```json
{
  "id": "unique-slug-no-spaces",
  "name": "Full hackathon name",
  "shortName": "Short label for cards/chips",
  "organizer": "Who's running it",
  "domain": ["Tag one", "Tag two"],
  "teamSize": "1–4 members",
  "mode": "Online / Offline / Hybrid",
  "prize": "₹50,000",
  "link": "https://... (optional, shows an 'Official page' link)",
  "color": "violet | teal | amber | indigo | rose",
  "rounds": [
    {
      "name": "Round name",
      "start": "2026-09-17T11:00:00-04:00",
      "end": "2026-09-17T14:00:00-04:00",
      "mode": "Online",
      "description": "What happens in this round."
    }
  ]
}
```

Notes:
- Dates **must** include a timezone offset (`+05:30` for India, `-04:00` for US Eastern, etc.) so "live now / starting soon / completed" is calculated correctly no matter who's viewing.
- If a round is a single instant (a deadline, an announcement) just set `start` and `end` to the same value.
- `color` picks which accent color the hackathon uses across the whole site — pick any of the five, reuse across hackathons freely.
- Status (Live / Starting soon / Upcoming / Completed) is never set by hand — it's computed live from the current date and time.
- To delete a hackathon, delete its whole `{ ... }` block from the `hackathons` array. To add one, copy an existing block and edit it.

## Pages

- `index.html` — **Timeline**: every round from every hackathon, grouped by date, filterable by status.
- `calendar.html` — **Calendar**: month grid, click any day to see what's due; color-coded per hackathon.
- `hackathon.html` — **All hackathons** list; add `?id=your-id` (or click through) to see one hackathon's full stage-by-stage detail page.

## Search

The search box (on every page) is typo-tolerant: it ignores case, extra spaces and punctuation, and uses fuzzy matching so a misspelled or partial hackathon name still finds the right result.

## Dynamic Status Engine

Statuses update live relative to current local time without manual editing:
- **Live now**: Ongoing round (`now >= start && now <= end`).
- **Starting soon**: Starts within 72 hours (`hoursToStart <= 72`).
- **Upcoming**: Scheduled further out.
- **Completed**: End date has passed (`now > end`).

## Animated Custom Cursor

On desktop pointing devices, a physics-based trailing ring and pinpoint dot replace the default OS cursor with magnetic hover expansion and active click pulsing. Touch devices seamlessly fall back to native touch.

## Files

```
hackathon-tracker/
├── index.html          Timeline page
├── calendar.html        Calendar page
├── hackathon.html       List + detail page (?id=...)
├── data/
│   └── hackathons.json  ← the only file you edit
├── css/
│   └── styles.css
└── js/
    ├── core.js          data loading, status logic, fuzzy search, cursor, clock
    ├── timeline.js
    ├── calendar.js
    └── detail.js
```
