// From a juricode response, the seats a resident could act on:
//   ending   — a holder's term ends within `days` (or has already ended: a holdover)
//   open     — no holder on file
//   unknown  — a holder with no term end on file (counted, so the gap is visible)

export function watch(data, { today = new Date(), days = 365 } = {}) {
  const start = isoDate(today);
  const end = isoDate(new Date(Date.parse(start) + days * 86_400_000));
  const result = { from: start, to: end, ending: [], open: [], unknown: 0 };

  for (const jurisdiction of data.jurisdictions) {
    for (const seat of jurisdiction.seats) {
      const entry = {
        seat_id: seat.id,
        seat: seat.label,
        body: seat.body.name,
        jurisdiction: jurisdiction.display_name ?? jurisdiction.name,
        holder: seat.holder?.full_name ?? null,
        term_end: seat.holder?.term_end ?? null,
        url: `https://jurisdictional.org/bodies/${seat.body.id}`,
      };

      if (!seat.holder) {
        result.open.push(entry);
      } else if (!entry.term_end) {
        result.unknown += 1;
      } else if (entry.term_end <= end) {
        result.ending.push({ ...entry, past: entry.term_end < start });
      }
    }
  }

  result.ending.sort((a, b) => a.term_end.localeCompare(b.term_end) || a.seat.localeCompare(b.seat));
  return result;
}

export function formatText(result) {
  const lines = [`Terms ending by ${result.to}:`];

  for (const s of result.ending) {
    const when = s.past ? `${s.term_end} (past; holdover)` : s.term_end;
    lines.push(`  ${when}  ${s.body}, ${s.seat}: ${s.holder}`);
  }
  if (result.ending.length === 0) lines.push("  none on file");

  lines.push("", "Open now (no holder on file):");
  for (const s of result.open) lines.push(`  ${s.body}, ${s.seat}`);
  if (result.open.length === 0) lines.push("  none");

  lines.push("", `${result.unknown} more seats have a holder but no term end on file.`);
  return lines.join("\n");
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}
