import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const eventsPath = path.join(process.cwd(), 'events.json');
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

  const list = events.events.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    url: `/api/event/${e.id}`
  }));

  return res.status(200).json({ events: list, total: list.length });
}
