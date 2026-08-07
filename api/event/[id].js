const fs = require('fs');
const path = require('path');

function toGCal(date, time) {
  return `${date.replace(/-/g,'')}T${time.replace(':','')}00`;
}

function enc(s) {
  return encodeURIComponent(s || '');
}

function encOutlook(s) {
  return encodeURIComponent((s || '').replace(/\n/g, '<br>'));
}

// Timezone UTC offsets (standard and daylight)
const TZ_OFFSETS = {
  'America/New_York':    { std: '-05:00', dst: '-04:00', dstMonths: [3,4,5,6,7,8,9,10] },
  'America/Chicago':     { std: '-06:00', dst: '-05:00', dstMonths: [3,4,5,6,7,8,9,10] },
  'America/Denver':      { std: '-07:00', dst: '-06:00', dstMonths: [3,4,5,6,7,8,9,10] },
  'America/Los_Angeles': { std: '-08:00', dst: '-07:00', dstMonths: [3,4,5,6,7,8,9,10] },
};

const TZ_VCAL = {
  'America/New_York': [
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Chicago': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Chicago',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'TZNAME:CDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Denver': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Denver',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0600',
    'TZNAME:MDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0700',
    'TZNAME:MST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Los_Angeles': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
};

function getOffset(timezone, dateStr) {
  const tz = TZ_OFFSETS[timezone] || TZ_OFFSETS['America/Chicago'];
  const month = parseInt(dateStr.split('-')[1], 10);
  return tz.dstMonths.includes(month) ? tz.dst : tz.std;
}

function toLocal(date, time, timezone) {
  const offset = getOffset(timezone || 'America/Chicago', date);
  return `${date}T${time}:00${offset}`;
}

function getGCalTz(timezone) {
  const map = {
    'America/New_York': 'America%2FNew_York',
    'America/Chicago':  'America%2FChicago',
    'America/Denver':   'America%2FDenver',
    'America/Los_Angeles': 'America%2FLos_Angeles',
  };
  return map[timezone] || 'America%2FChicago';
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

  const tz       = event.timezone || 'America/Chicago';
  const gcStart  = toGCal(event.date, event.startTime);
  const gcEnd    = toGCal(event.date, event.endTime);
  const baseUrl  = `https://${req.headers.host}`;
  const eventUrl = `${baseUrl}/api/event/${event.id}`;
  const icalUrl  = `${baseUrl}/api/event/${event.id}?format=ical`;
  const localStart = toLocal(event.date, event.startTime, tz);
  const localEnd   = toLocal(event.date, event.endTime, tz);

  const links = {
    google:     `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(event.title)}&dates=${gcStart}/${gcEnd}&details=${enc(event.description)}&location=${enc(event.location)}&ctz=${getGCalTz(tz)}`,
    outlook:    icalUrl,
    outlookcom: `https://outlook.live.com/calendar/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${enc(localStart)}&enddt=${enc(localEnd)}&subject=${enc(event.title)}&body=${encOutlook(event.description)}&location=${enc(event.location)}`,
    office365:  `https://outlook.office.com/calendar/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${enc(localStart)}&enddt=${enc(localEnd)}&subject=${enc(event.title)}&body=${encOutlook(event.description)}&location=${enc(event.location)}`,
    yahoo:      `https://calendar.yahoo.com/?v=60&title=${enc(event.title)}&st=${gcStart}&et=${gcEnd}&desc=${enc(event.description)}&in_loc=${enc(event.location)}`,
    apple:      icalUrl
  };

  const accept = req.headers['accept'] || '';

  if (accept.includes('text/calendar') || req.query.format === 'ical') {
    const vtimezone = TZ_VCAL[tz] || TZ_VCAL['America/Chicago'];
    const dtStart   = `DTSTART;TZID=${tz}:${event.date.replace(/-/g,'')}T${event.startTime.replace(':','')}00`;
    const dtEnd     = `DTEND;TZID=${tz}:${event.date.replace(/-/g,'')}T${event.endTime.replace(':','')}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Reveleer//CalGen//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      vtimezone,
      'BEGIN:VEVENT',
      `DESCRIPTION:${event.description.replace(/\n/g,'\\n').replace(/,/g,'\\,')}`,
      `X-ALT-DESC;FMTTYPE=text/html:${event.descriptionHtml}`,
      `UID:reveleer-${event.id}@reveleer.com`,
      `SUMMARY:${event.title}`,
      dtStart,
      dtEnd,
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
    res.setHeader('Content-Disposition', `attachment; filename="${event.id}.ics"`);
    return res.status(200).send(ics);
  }

  return res.status(200).json({ ...event, links, eventUrl });
};
