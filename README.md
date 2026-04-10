# Reveleer Calendar Link Server

Hosts event data so Office 365 (and all calendar platforms) render
formatted descriptions properly — without needing AddEvent.

## Files
- `events.json` — all 16 ACDIS demo slots (edit this to add future events)
- `api/event/[id].js` — serves each event's data + calendar links
- `api/events.js` — lists all events
- `public/index.html` — dashboard showing all events and links
- `vercel.json` — Vercel deployment config

## Deploy to Vercel (step by step)

1. Go to github.com → create a new repository called `reveleer-cal-server`
2. Upload all these files to the repository
3. Go to vercel.com → "Add New Project" → import from GitHub
4. Select the `reveleer-cal-server` repo → click Deploy
5. Done! Your server is live at `reveleer-cal-server.vercel.app`

## API Usage

### Get all events
GET /api/events

### Get one event + all calendar links
GET /api/event/acdis-apr21-1230pm

### Use in Office 365 email button
The `links.office365` field in the API response contains the correct
URL to use in HubSpot email templates for Office 365 users.

## Adding future events
Edit `events.json` and add a new object to the `events` array.
Redeploy to Vercel (automatic if connected to GitHub — just push).
