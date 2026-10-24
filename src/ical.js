// An iCalendar feed (RFC 5545): one all-day event per seat, on its term end.
// Subscribe to it from any calendar app.

export function calendar(result, { name = "Available board seats", now = new Date() } = {}) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const events = result.ending
    .filter((s) => !s.past)
    .flatMap((s) => [
      "BEGIN:VEVENT",
      `UID:seat-${s.seat_id}-${s.term_end}@jurisdictional-example-available-board-seats`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${s.term_end.replaceAll("-", "")}`,
      `SUMMARY:${text(`Term ends: ${s.seat}, ${s.body}`)}`,
      `DESCRIPTION:${text(`${s.holder}'s term on the ${s.body} (${s.jurisdiction}) ends. Check how to apply or run.`)}`,
      `URL:${s.url}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jurisdictional//example-available-board-seats//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${text(name)}`,
    ...events,
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n") + "\r\n";
}

// TEXT values escape backslash, semicolon, comma and newline (RFC 5545 §3.3.11).
function text(value) {
  return value.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

// Lines longer than 75 octets continue on the next line after a space (§3.1).
function fold(line) {
  const bytes = Buffer.from(line);
  if (bytes.length <= 75) return line;

  const parts = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    // Never split a multi-byte UTF-8 character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    parts.push(bytes.subarray(start, end).toString());
    start = end;
  }
  return parts.join("\r\n ");
}
