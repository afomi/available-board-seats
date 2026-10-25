# Available board seats

> **A [Jurisdictional](https://jurisdictional.org) prototype.**
> Jurisdictional is the open, sourced map of who governs every U.S. address; this app shows what one call to its API can do.
> Fork it.

For any U.S. address, find the board, commission and council seats you could fill: the ones open now, and the ones whose terms end soon.
Residents learn when to apply or run, and can subscribe to the same list as a calendar feed.

This is an open-source prototype of idea 03 on [jurisdictional.org/developers](https://jurisdictional.org/developers).
It is one call to the free [Jurisdictional API](https://jurisdictional.org/llms.txt):

```
GET https://jurisdictional.org/api/v1/juricode?address=…&include=seats
```

Each seat that represents the address comes back with its holder and, where it is on file, the holder's `term_end`.

Node 20 or later, no dependencies.

## Try it

In your browser: [afomi.github.io/available-board-seats](https://afomi.github.io/available-board-seats/).
That page is `index.html`, served by GitHub Pages; it calls the API from your browser and offers the list as a one-time `.ics` download.
A calendar subscription that refreshes needs the server below.

From the command line:

```sh
node bin/available-board-seats.js "300 Hemlock St, Vacaville, CA 95688"
node bin/available-board-seats.js --days 180 --lat 38.3649 --lng -121.9999
node bin/available-board-seats.js --ics seats.ics "300 Hemlock St, Vacaville, CA 95688"
node bin/available-board-seats.js --json "300 Hemlock St, Vacaville, CA 95688"
```

```
Terms ending by 2027-10-24:
  2027-03-31  Planning Commission, Planning Commissioner, Seat 1: Joseph Dingman
  …

Open now (no holder on file):
  Parks & Recreation Commission, Parks & Recreation Commissioner, Seat 3

37 more seats have a holder but no term end on file.
```

The output has three parts:

- **Ending**: a holder's term ends within `--days` (default 365).
  A term end already past, with the holder still on file, is marked as a holdover.
- **Open**: seats with no holder on file.
- **Unknown**: seats whose holder has no term end on file are counted, never dropped silently.

## Subscribe in a calendar

```sh
npm start        # http://localhost:3000
```

| Route | What it does |
| --- | --- |
| `GET /` | The same page as GitHub Pages. |
| `GET /seats?address=…&days=365` | The watch list as JSON (`lat` and `lng` also work). |
| `GET /calendar.ics?address=…&days=365` | An iCalendar (RFC 5545) feed: one all-day event per seat on its term end. |

Host it somewhere public, then add `https://your-host/calendar.ics?address=…` to Google Calendar ("From URL"), Apple Calendar ("New Calendar Subscription") or Outlook.
Calendar apps refresh the feed on their own schedule, so new term dates show up as the data fills in.

## Files

- `src/jurisdictional.js`: the API call.
- `src/watch.js`: sorts seats into ending, open and unknown, and formats the text.
- `src/ical.js`: the iCalendar feed, with RFC 5545 text escaping and line folding.
- `index.html`: the page; it imports `src/jurisdictional.js`, `src/watch.js` and `src/ical.js` in the browser.
- `src/server.js`: serves the page, the JSON and the calendar routes.
- `bin/available-board-seats.js`: the command line.
- `test/`: run with `npm test`, against a recorded API response (no network).

## What the data does and does not cover

Term dates are sparse today.
For the example address, 13 of 52 seats have a term end on file, all on Vacaville's Planning and Parks & Recreation commissions.
Most elected seats have a holder but no term dates yet.
The "unknown" count is that gap, shown on purpose.

Filling it is the other half of this prototype: an AI agent on the [MCP server](https://jurisdictional.org/developers) can gather a body's roster, with term dates, from its official page and propose it with sources.

## Ideas to take it further

- Email or text a digest when a seat enters the window.
- Link each event to the body's application page or the next election.
- Watch a whole city or county instead of one address (`/api/v1/jurisdictions/:id/bodies`, then `/api/v1/bodies/:id/positions`).

## Point it at another server

```sh
JURISDICTIONAL_BASE_URL=http://localhost:4000 npm start
```

## Use a token

Without a token the API allows 100 requests a day from your IP.
A free token, from [jurisdictional.org/auth/cli](https://jurisdictional.org/auth/cli), allows 2,000:

```sh
JURISDICTIONAL_TOKEN=jur_free_… npm start
```

## License

MIT.
Data from the Jurisdictional API carries its own sourcing; see each record's provenance.
