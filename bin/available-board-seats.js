#!/usr/bin/env node
// Usage:
//   available-board-seats "300 Hemlock St, Vacaville, CA 95688"
//   available-board-seats --days 180 --lat 38.3649 --lng -121.9999
//   available-board-seats --ics seats.ics "300 Hemlock St, Vacaville, CA 95688"
//   available-board-seats --json "300 Hemlock St, Vacaville, CA 95688"
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { juricode } from "../src/jurisdictional.js";
import { watch, formatText } from "../src/watch.js";
import { calendar } from "../src/ical.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    lat: { type: "string" },
    lng: { type: "string" },
    days: { type: "string", default: "365" },
    ics: { type: "string" },
    json: { type: "boolean", default: false },
  },
});

try {
  const days = Number(values.days);
  if (!Number.isInteger(days) || days < 0) throw new Error("--days must be a whole number of days.");

  const data = await juricode({ address: positionals.join(" ") || undefined, lat: values.lat, lng: values.lng });
  const result = watch(data, { days });

  console.log(values.json ? JSON.stringify(result, null, 2) : formatText(result));

  if (values.ics) {
    await writeFile(values.ics, calendar(result));
    const events = result.ending.filter((s) => !s.past).length;
    console.error(`Wrote ${events} events to ${values.ics}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
