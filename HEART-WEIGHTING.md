# KPAB Heart Weighting System

## The Idea
Clicking the heart on a currently playing track gives it +1 love.
Tracks with enough love get auto-requested back into rotation more often.

## Architecture (no admin API key needed)

```
[Browser] --heart click--> [Pi: tiny JSON API] --stores--> hearts.json
                                                    |
                                    [cron: every 30min] --reads hearts.json
                                            |
                                    picks a hearted track randomly
                                    (weighted by heart count)
                                            |
                                    POST /api/station/1/request/{request_id}
                                    (public endpoint, no auth needed)
```

## How It Works

### 1. Heart Click (frontend)
- User clicks heart on currently playing track
- POST to `https://kpab.fm/api/hearts` with `{ song_id, song_text }`
- Rate limited: 1 heart per song per IP per 24h
- No account needed

### 2. Heart Storage (Pi backend)
- Tiny Python/Node script behind nginx
- Stores in `/home/pibulus/pibulus-os/data/hearts.json`:
  ```json
  {
    "b8cb484754c22984bf35f0766d263ed0": {
      "text": "Jose Gonzalez - Tjomme",
      "hearts": 7,
      "last_hearted": "2026-03-29T19:00:00Z",
      "last_requested": "2026-03-29T15:00:00Z"
    }
  }
  ```

### 3. Auto-Request Cron (every 30min)
- Reads hearts.json
- Picks a track weighted by heart count (more hearts = more likely)
- Skips if already requested in last 2 hours
- Maps song_id -> request_id via the public `/api/station/1/requests` list
- POSTs to `/api/station/1/request/{request_id}`
- AzuraCast handles the rest (queues it up naturally)

## What We Need

### On the Pi
- [ ] A tiny HTTP endpoint for heart storage (Flask/Express/Deno)
- [ ] nginx proxy pass for `/api/hearts` -> the endpoint
- [ ] hearts.json data file
- [ ] Cron script to auto-request hearted tracks

### On the Frontend
- [ ] Wire up heart click to POST song_id
- [ ] Show heart count on the button (optional, nice feedback)
- [ ] Rate limit in localStorage (prevent spam before it hits server)

## AzuraCast API Reference (what's public)

| Endpoint | Auth? | Notes |
|---|---|---|
| `GET /api/nowplaying/1` | No | Current song with `song.id` |
| `GET /api/station/1/requests` | No | 12,674 requestable tracks with `request_id` + `song.id` |
| `POST /api/station/1/request/{request_id}` | No | Queue a song request |
| `GET /api/station/1/playlists` | YES | Need admin API key |
| `GET /api/station/1/files` | YES | Need admin API key |

## The Beauty
- No admin API key required
- Hearts from ALL listeners affect rotation
- Self-regulating: AzuraCast's own request throttling prevents spam
- Hearted tracks naturally float to the top over time
- Zero changes to AzuraCast config needed

## Optional: Admin API Key Unlocks
If you create an API key in AzuraCast admin panel:
- Could create a "Fan Favorites" playlist
- Move hearted tracks there with higher rotation weight
- More precise control, but the request-based system works great without it
