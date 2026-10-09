# The Third Party

An interactive illustrated **and animated** storybook powered by the **OpenAI Responses API** plus AI video (Luma, Replicate, or Runway).

Describe a character and setting → get a vivid scene, a still illustration, three choices, and a short cinematic clip that animates the moment.

## Features

- OpenAI **Responses API** + `image_generation` tool for story + stills
- Multi-turn continuity via `previous_response_id`
- **AI video clips** per scene (async, non-blocking)
  - **Luma** Dream Machine (Ray 2) — preferred when `LUMA_API_KEY` is set
  - **Replicate** (configurable model) — when `REPLICATE_API_TOKEN` is set
  - **Runway** Gen-4 / Gen-4.5 — when `RUNWAYML_API_SECRET` is set
- Still image shows first; clip crossfades in when ready
- Polished storybook UI, starters, loading states, restart
- API keys stay on the server

## Quick start

```bash
cd the-third-party
cp .env.example .env
# Set OPENAI_API_KEY (required)
# Set at least one of: LUMA_API_KEY, REPLICATE_API_TOKEN, RUNWAYML_API_SECRET
node server/index.js
```

Open [http://localhost:3000](http://localhost:3000).

## How video works

1. Scene text + still image are generated via OpenAI (same as before).
2. Server immediately starts a background video job using a motion prompt derived from the scene, character, and setting.
3. Response includes `videoJobId`. Frontend polls `GET /api/video-status/:id` every 3s.
4. When status is `ready`, the clip URL is played over the still (muted, looped).

| Provider | Env var | Notes |
|----------|---------|--------|
| Luma | `LUMA_API_KEY` | Text-to-video (Ray 2). Image-to-video if `PUBLIC_BASE_URL` is set |
| Replicate | `REPLICATE_API_TOKEN` | Configurable via `REPLICATE_VIDEO_MODEL` |
| Runway | `RUNWAYML_API_SECRET` | Image-to-video or text-to-video |

Set `VIDEO_PROVIDER=off` to disable clips entirely.

## API

| Endpoint | Purpose |
|----------|---------|
| `POST /api/start` | Start story → scene, image, choices, `responseId`, `videoJobId` |
| `POST /api/continue` | Continue → next scene + new video job |
| `GET /api/video-status/:id` | `{ status, videoUrl?, error?, provider }` |
| `GET /api/health` | Keys / provider status |

## Project structure

```
the-third-party/
├── server/index.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── package.json
└── README.md
```

## Tips

- Video generation typically takes 20–90 seconds. The still and choices appear immediately.
- For stronger character consistency in clips, set `PUBLIC_BASE_URL` to a publicly reachable host so providers can use image-to-video from the still.
- Costs: OpenAI (text + image) + whichever video API you enable. Start with Luma or a low-cost Replicate model for testing.

## License

MIT
