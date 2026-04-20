// api/update-event.js — updates one slot by ID in events.json via GitHub API

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER   = 'cataalamos217';
const REPO_NAME    = 'reveleer-cal-server';
const FILE_PATH    = 'events.json';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const { id, updates } = req.body;
  if (!id || !updates) return res.status(400).json({ error: 'No id or updates provided' });

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    const fileData = await getRes.json();
    const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    const updated = { events: current.events.map(e => e.id === id ? { ...e, ...updates } : e) };
    const encoded = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');

    const putRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Update event slot ${id}`, content: encoded, sha: fileData.sha })
      }
    );
    if (!putRes.ok) return res.status(500).json({ error: 'GitHub write failed' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
