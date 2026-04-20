// api/delete-event.js — removes one slot by ID from events.json via GitHub API

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER   = 'cataalamos217';
const REPO_NAME    = 'reveleer-cal-server';
const FILE_PATH    = 'events.json';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { id, conference } = req.body;
  if (!id && !conference) return res.status(400).json({ error: 'No id or conference provided' });

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    const fileData = await getRes.json();
    const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    const filter = conference
      ? e => e.conference !== conference
      : e => e.id !== id;
    const label = conference ? `conference ${conference}` : `slot ${id}`;
    const updated = { events: current.events.filter(filter) };
    const encoded = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');

    const putRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Delete ${label}`, content: encoded, sha: fileData.sha })
      }
    );
    if (!putRes.ok) return res.status(500).json({ error: 'GitHub write failed' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
