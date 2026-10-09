/**
 * The Third Party — Interactive Storybook
 * OpenAI Responses API (scene + illustration) + AI video (Luma / Replicate / Runway)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

// Load .env
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
} catch (_) {}

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const LUMA_KEY = process.env.LUMA_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const RUNWAY_KEY = process.env.RUNWAYML_API_SECRET;
const VIDEO_PROVIDER = (process.env.VIDEO_PROVIDER || 'auto').toLowerCase();

const PUBLIC = path.join(__dirname, '../public');
const videoJobs = new Map();
const tempImages = new Map();

const SYSTEM_INSTRUCTIONS = `You are a master storyteller creating an interactive illustrated storybook called "The Third Party".

RULES:
1. Write in a vivid, immersive second-person narrative style ("You...").
2. Each scene should be 2-4 short paragraphs, atmospheric and cinematic.
3. ALWAYS end your text response with exactly three distinct choices for what happens next, formatted as:
   CHOICE 1: [short action]
   CHOICE 2: [short action]
   CHOICE 3: [short action]
4. Keep character appearance consistent across scenes. Include distinctive visual details in the prose so illustrations stay consistent.
5. Maintain continuity of setting, tone, and previous events.
6. When generating images, describe the scene in a painterly storybook illustration style: rich colors, dramatic lighting, detailed character design matching prior descriptions.
7. Do not include the choices in the image — only the visual scene.
8. Respond ONLY with the story prose followed by the three CHOICE lines. No extra commentary.`;

function extractChoices(text) {
  const choices = [];
  const regex = /CHOICE\s*[123]:\s*(.+)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    choices.push(match[1].trim());
  }
  if (choices.length < 3) {
    const lines = text.split('\n').filter((l) => l.trim().match(/^\d[\.\)]\s+/));
    lines.slice(0, 3).forEach((l) => choices.push(l.replace(/^\d[\.\)]\s+/, '').trim()));
  }
  while (choices.length < 3) choices.push('Continue exploring...');
  return choices.slice(0, 3);
}

function stripChoices(text) {
  return text
    .replace(/CHOICE\s*[123]:\s*.+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getImageFromResponse(response) {
  const imgCall = (response.output || []).find((o) => o.type === 'image_generation_call');
  return imgCall && imgCall.result ? imgCall.result : null;
}

function getTextFromResponse(response) {
  if (response.output_text) return response.output_text;
  const msg = (response.output || []).find((o) => o.type === 'message');
  if (msg && Array.isArray(msg.content)) {
    const part = msg.content.find((c) => c.type === 'output_text' || c.type === 'text');
    if (part) return part.text || '';
  }
  let t = '';
  for (const item of response.output || []) {
    if (item.type === 'message' && item.content) {
      for (const c of item.content) {
        if (c.text) t += c.text;
      }
    }
  }
  return t;
}

function buildMotionPrompt(sceneText, character, setting) {
  const short = sceneText.slice(0, 400).replace(/\n+/g, ' ').trim();
  return (
    `Cinematic storybook animation, painterly style. ` +
    `Character: ${character || 'the protagonist'}. Setting: ${setting || 'the scene'}. ` +
    `Scene: ${short}. ` +
    `Gentle camera drift, subtle character movement, atmospheric particles, soft dramatic lighting, ` +
    `rich colors, 5 second clip, no text, no UI.`
  );
}

function resolveVideoProvider() {
  if (VIDEO_PROVIDER === 'off') return null;
  if (VIDEO_PROVIDER === 'luma' && LUMA_KEY) return 'luma';
  if (VIDEO_PROVIDER === 'replicate' && REPLICATE_TOKEN) return 'replicate';
  if (VIDEO_PROVIDER === 'runway' && RUNWAY_KEY) return 'runway';
  if (LUMA_KEY) return 'luma';
  if (REPLICATE_TOKEN) return 'replicate';
  if (RUNWAY_KEY) return 'runway';
  return null;
}

// NOTE: Full video provider implementations and HTTP server continue in the complete source.
// Please copy the full server/index.js from the local project if this stub is incomplete.
console.error('Incomplete server stub - use the full file from the project artifacts.');
process.exit(1);
