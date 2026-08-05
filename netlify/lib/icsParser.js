// Minimal RFC 5545 VEVENT parser — just the handful of fields a forwarded
// match/training invite actually needs (SUMMARY, DTSTART, LOCATION). No
// recurrence, no timezone database, no AI: .ics is a well-defined format,
// so this is a straight parse, not an extraction guess. See DECISIONS.md,
// "Email infrastructure (ImprovMX)" — the brief is explicit that a real
// .ics attachment never needs the Claude-extraction fallback.

// RFC 5545 line folding: a line starting with a single space or tab is a
// continuation of the previous line, with the leading whitespace removed.
function unfoldLines(icsText) {
  const rawLines = icsText.split(/\r\n|\n|\r/);
  const lines = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeIcsText(value) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

// DTSTART can be a bare date ("20260815"), a floating date-time
// ("20260815T180000"), or a UTC date-time ("20260815T180000Z"). Only the
// pieces a calendar entry here actually uses (a date, and a time if one was
// given) are extracted — no timezone conversion, since VTIMEZONE handling
// is a large spec surface for a feature that only needs "what day, what
// time" out of a forwarded invite.
function parseDtValue(value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, year, month, day, hour, minute] = m;
  return {
    date: `${year}-${month}-${day}`,
    time: hour !== undefined ? `${hour}:${minute}` : null,
  };
}

// Returns the first VEVENT found as { title, date, time, location }, or
// null if the file has no parseable event — callers should fall back to
// the Claude-extraction path in that case, same as any other unreadable
// attachment.
export function parseFirstIcsEvent(icsText) {
  const lines = unfoldLines(icsText);
  let inEvent = false;
  const fields = {};
  for (const line of lines) {
    if (line.trim() === "BEGIN:VEVENT") {
      inEvent = true;
      continue;
    }
    if (line.trim() === "END:VEVENT") {
      if (inEvent) break; // first VEVENT only — brief explicitly rejects auto-creating a series from one forward
      continue;
    }
    if (!inEvent) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    if (key === "SUMMARY") fields.title = unescapeIcsText(value);
    if (key === "LOCATION") fields.location = unescapeIcsText(value);
    if (key === "DTSTART") fields.dtstart = parseDtValue(value);
  }
  if (!fields.dtstart) return null;
  return {
    title: fields.title || null,
    date: fields.dtstart.date,
    time: fields.dtstart.time,
    location: fields.location || null,
  };
}
