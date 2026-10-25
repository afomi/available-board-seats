import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { watch, formatText } from "../src/watch.js";
import { calendar } from "../src/ical.js";
import { app } from "../src/server.js";

// A recorded GET /api/v1/juricode?address=300 Hemlock St, Vacaville, CA 95688&include=seats
const { data } = JSON.parse(await readFile(new URL("fixtures/vacaville.json", import.meta.url), "utf8"));
const today = new Date("2026-10-24T12:00:00Z");

test("a resident sees seats whose term ends within the window, soonest first", () => {
  const result = watch(data, { today, days: 365 });

  assert.equal(result.to, "2027-10-24");
  assert.ok(result.ending.length > 0);
  assert.ok(result.ending.every((s) => s.term_end <= "2027-10-24"));
  assert.deepEqual(
    result.ending.map((s) => s.term_end),
    result.ending.map((s) => s.term_end).toSorted(),
  );
  assert.ok(result.ending.some((s) => s.body === "Planning Commission" && s.holder === "Joseph Dingman"));
});

test("a term that already ended, with the holder still seated, is flagged as a holdover", () => {
  const result = watch(data, { today: new Date("2027-06-01T00:00:00Z"), days: 30 });
  const dingman = result.ending.find((s) => s.holder === "Joseph Dingman");

  assert.equal(dingman.past, true);
  assert.match(formatText(result), /2027-03-31 \(past; holdover\)  Planning Commission, Planning Commissioner, Seat 1: Joseph Dingman/);
});

test("open seats are listed, and seats with no term end on file are counted, not hidden", () => {
  const result = watch(data, { today, days: 365 });

  assert.ok(result.open.some((s) => s.seat === "Parks & Recreation Commissioner, Seat 3"));
  assert.ok(result.unknown > 0);
  assert.match(formatText(result), new RegExp(`${result.unknown} more seats have a holder but no term end on file\\.`));
});

test("the calendar is valid iCalendar: CRLF lines of at most 75 octets, escaped text, all-day events", () => {
  const result = watch(data, { today, days: 365 });
  const ics = calendar(result, { now: today });
  const lines = ics.split("\r\n");

  assert.equal(lines[0], "BEGIN:VCALENDAR");
  assert.equal(lines.at(-2), "END:VCALENDAR");
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 75), "a line is longer than 75 octets");
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, result.ending.length);
  assert.match(ics, /DTSTART;VALUE=DATE:20270331/);
  assert.match(ics, /DTSTAMP:20261024T120000Z/);

  const unfolded = ics.replace(/\r\n /g, "");
  assert.match(unfolded, /SUMMARY:Term ends: Planning Commissioner\\, Seat 1\\, Planning Commission/);
});

test("folding never splits a multi-byte character", () => {
  const seat = { seat_id: 1, seat: "Señor ".repeat(20), body: "Ñ", jurisdiction: "J", holder: "H", term_end: "2027-01-01", url: "u", past: false };
  const ics = calendar({ ending: [seat] }, { now: today });

  assert.ok(!ics.includes("�"));
  assert.match(ics.replace(/\r\n /g, ""), /Señor Señor/);
});

test("GET /calendar.ics serves a subscribable feed", async (t) => {
  const server = app({ lookup: async ({ address }) => ({ ...data, address }) }).listen(0);
  t.after(() => server.close());

  const response = await fetch(
    `http://localhost:${server.address().port}/calendar.ics?address=300+Hemlock+St,+Vacaville,+CA+95688&days=1000`,
  );
  const body = await response.text();

  assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
  assert.match(body, /X-WR-CALNAME:Available board seats: 300 Hemlock St\\, Vacaville\\, CA 95688/);
  assert.match(body, /BEGIN:VEVENT/);
});

test("a bad days value is refused, not defaulted", async (t) => {
  const server = app({ lookup: async () => data }).listen(0);
  t.after(() => server.close());

  const response = await fetch(`http://localhost:${server.address().port}/seats?address=x&days=soon`);

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "days must be a whole number of days." });
});

test("the server serves the same static page as GitHub Pages", async (t) => {
  const server = app().listen(0);
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;

  const page = await fetch(`${base}/`);
  assert.match(await page.text(), /import \{ calendar \} from "\.\/src\/ical\.js"/);

  for (const module of ["jurisdictional", "watch", "ical"]) {
    const response = await fetch(`${base}/src/${module}.js`);
    assert.equal(response.headers.get("content-type"), "text/javascript");
  }
});
