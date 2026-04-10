const fs = require('fs');
const path = require('path');

function toUTC(date, time) {
  // Chicago CDT is UTC-5 in April
  const offset = 5;
  const [h, m] = time.split(':').map(Number);
  const utcH = (h + offset) % 24;
  return `${date}T${String(utcH).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`;
}

function toGCal(date, time) {
  const offset = 5;
  const [h, m] = time.split(':').map(Number);
  const utcH = (h + offset) % 24;
  return `${date.replace(/-/g,'')}T${String(utcH).padStart(2,'0')}${String(m).padStart(2,'0')}00Z`;
}

function enc(s) {
  return encodeURIComponent(s || '');
}

// Outlook/Office 365 compose URLs treat body as HTML — use <br> for line breaks
function encOutlook(s) {
  return encodeURIComponent((s || '').replace(/\n/g, '<br>'));
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const eventsPath = path.join(process.cwd(), 'events.json');
  const data = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

  const { id } = req.query;

  if (!id) {
    const list = data.events.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      url: `/api/event/${e.id}`
    }));
    return res.status(200).json({ events: list });
  }

  const event = data.events.find(e => e.id === id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const utcStart = toUTC(event.date, event.startTime);
  const utcEnd   = toUTC(event.date, event.endTime);
  const gcStart  = toGCal(event.date, event.startTime);
  const gcEnd    = toGCal(event.date, event.endTime);

  const baseUrl = `https://${req.headers.host}`;
  const eventUrl = `${baseUrl}/api/event/${event.id}`;

  const links = {
    google:     `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(event.title)}&dates=${gcStart}/${gcEnd}&details=${enc(event.description)}&location=${enc(event.location)}`,
    outlook:    event.icsUrl,
    outlookcom: `https://outlook.live.com/calendar/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${utcStart}&enddt=${utcEnd}&subject=${enc(event.title)}&body=${encOutlook(event.description)}&location=${enc(event.location)}`,
    office365:  `https://outlook.office.com/calendar/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${utcStart}&enddt=${utcEnd}&subject=${enc(event.title)}&body=${encOutlook(event.description)}&location=${enc(event.location)}`,
    yahoo:      `https://calendar.yahoo.com/?v=60&title=${enc(event.title)}&st=${gcStart}&et=${gcEnd}&desc=${enc(event.description)}&in_loc=${enc(event.location)}`,
    apple:      event.icsUrl
  };

  const accept = req.headers['accept'] || '';

  if (accept.includes('text/calendar') || req.query.format === 'ical') {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Reveleer//CalGen//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DESCRIPTION:${event.description.replace(/\n/g,'\\n').replace(/,/g,'\\,')}`,
      `X-ALT-DESC;FMTTYPE=text/html:${event.descriptionHtml}`,
      `UID:reveleer-${event.id}@reveleer.com`,
      `SUMMARY:${event.title}`,
      `DTSTART;TZID=America/Chicago:${event.date.replace(/-/g,'')}T${event.startTime.replace(':','')}00`,
      `DTEND;TZID=America/Chicago:${event.date.replace(/-/g,'')}T${event.endTime.replace(':','')}00`,
      `LOCATION:${event.location.replace(/,/g,'\\,')}`,
      'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
      'X-MICROSOFT-CDO-BUSYSTATUS:BUSY',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    return res.status(200).send(ics);
  }

  return res.status(200).json({ ...event, links, eventUrl });
};
