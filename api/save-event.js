// api/save-event.js
// Receives a new conference + slots from the UI, appends to events.json via GitHub API

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER   = 'cataalamos217';
const REPO_NAME    = 'reveleer-cal-server';
const FILE_PATH    = 'events.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { events: newEvents } = req.body;
  if (!newEvents || !Array.isArray(newEvents) || newEvents.length === 0) {
    return res.status(400).json({ error: 'No events provided' });
  }

  try {
    // 1. Get current file from GitHub (need SHA for update)
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    const fileData = await getRes.json();
    const sha = fileData.sha;
    const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    // 2. Append new events
    const updated = { events: [...current.events, ...newEvents] };
    const encoded = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');

    // 3. Commit back to GitHub
    const putRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Add event via Calendeer UI`,
          content: encoded,
          sha
        })
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: 'GitHub write failed', detail: err });
    }

    return res.status(200).json({ ok: true, added: newEvents.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
