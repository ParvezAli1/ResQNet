// ============================================
//  ResQNet AI — Claude API + Offline Fallback
// ============================================

// Configure locally with EXPO_PUBLIC_CLAUDE_API_KEY in .env.local.
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are ResQNet AI — an emergency disaster response assistant.
You help triage SOS signals, prioritize rescues, match helpers to survivors,
and provide survival advice. Be concise, calm, and actionable.
Lives depend on your responses.
IMPORTANT: Always return raw JSON when asked. Never wrap in markdown code blocks.`;


// ============================================
//  Core API Call
// ============================================

export const askClaude = async (prompt) => {
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    // Get the response data
    const data = await response.json();

    // Check if API returned an error
    if (!response.ok) {
      console.log('Claude API error:', data.error?.message || 'Unknown error');
      return null;
    }

    // Safely access the response text
    if (
      data &&
      data.content &&
      Array.isArray(data.content) &&
      data.content.length > 0 &&
      data.content[0].text
    ) {
      return data.content[0].text;
    }

    console.log('Claude response unexpected:', JSON.stringify(data));
    return null;
  } catch (error) {
    console.log('Claude network error:', error.message);
    return null;
  }
};


// ============================================
//  Helper — Clean JSON from Claude
// ============================================

const cleanJSON = (text) => {
  if (!text) return null;

  // Remove markdown code blocks if Claude wraps them
  let cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Find the JSON part (array or object)
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);

  if (arrayMatch) return arrayMatch[0];
  if (objectMatch) return objectMatch[0];

  return cleaned;
};


// ============================================
//  Offline Fallback — Keyword Triage
// ============================================

const offlineTriage = (survivors) => {
  const criticalWords = [
    'trapped', 'collapsed', 'bleeding', 'unconscious',
    'dying', 'crush', 'buried', 'pinned', 'suffocating',
  ];
  const highWords = [
    'medical', 'injured', 'child', 'elderly', 'fever',
    'broken', 'pregnant', 'diabetic', 'heart', 'asthma',
  ];
  const mediumWords = [
    'flood', 'water', 'food', 'stranded', 'rescue',
    'stuck', 'hungry', 'thirsty', 'cold', 'shelter',
  ];

  return survivors.map((s) => {
    const msg = (s.message || '').toLowerCase();
    let urgency = 'LOW';

    if (criticalWords.some((w) => msg.includes(w))) {
      urgency = 'CRITICAL';
    } else if (highWords.some((w) => msg.includes(w))) {
      urgency = 'HIGH';
    } else if (mediumWords.some((w) => msg.includes(w))) {
      urgency = 'MEDIUM';
    }

    return { senderId: s.senderId, urgency };
  });
};


// ============================================
//  Offline Fallback — Distance Matching
// ============================================

const offlineMatch = (survivor, helpers) => {
  if (!helpers || helpers.length === 0) return null;

  // Pick the first helper (already sorted by distance)
  const best = helpers[0];
  return {
    helperId: best.senderId,
    reason: `Closest available helper with skills: ${best.skills || 'General help'}`,
  };
};


// ============================================
//  Offline Fallback — Survival Tips
// ============================================

const offlineTips = (situation) => {
  const tips = {
    earthquake: `1. Drop, cover, and hold on under sturdy furniture
2. Stay away from windows and heavy objects
3. After shaking stops, exit building carefully`,

    flood: `1. Move to higher ground immediately
2. Never walk or drive through flood water
3. Signal for help from rooftop if trapped`,

    fire: `1. Stay low to avoid smoke inhalation
2. Feel doors before opening — hot means fire behind
3. Cover mouth with wet cloth while escaping`,

    default: `1. Stay calm and conserve your energy
2. Signal for help using light, sound, or bright cloth
3. Stay hydrated — ration water carefully`,
  };

  const sit = (situation || '').toLowerCase();

  if (sit.includes('earthquake') || sit.includes('collapse')) return tips.earthquake;
  if (sit.includes('flood') || sit.includes('water')) return tips.flood;
  if (sit.includes('fire') || sit.includes('burn')) return tips.fire;

  return tips.default;
};


// ============================================
//  AI Triage — Prioritize SOS Signals
// ============================================

export const triageSOS = async (survivors) => {
  // Safety check
  if (!survivors || survivors.length === 0) return [];

  // Try Claude AI first
  try {
    const prompt = `Triage these SOS signals by urgency (CRITICAL / HIGH / MEDIUM / LOW).
Return ONLY a raw JSON array. No markdown, no code blocks, no explanation.
Format: [{"senderId":"id","urgency":"LEVEL"}]

SOS Signals:
${survivors.map((s) => `- ID: ${s.senderId}, Message: "${s.message || 'No message'}"`).join('\n')}`;

    const result = await askClaude(prompt);

    if (result) {
      const cleaned = cleanJSON(result);
      if (cleaned) {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (error) {
    console.log('AI triage failed, using offline:', error.message);
  }

  // Offline fallback
  console.log('Using offline keyword triage');
  return offlineTriage(survivors);
};


// ============================================
//  AI Match — Find Best Helper for Survivor
// ============================================

export const matchHelperToSurvivor = async (survivor, helpers) => {
  // Safety check
  if (!survivor) return null;
  if (!helpers || helpers.length === 0) return null;

  // Try Claude AI first
  try {
    const prompt = `Match the best helper for this disaster survivor.
Return ONLY raw JSON. No markdown, no code blocks, no explanation.
Format: {"helperId":"id","reason":"one sentence reason"}

SURVIVOR:
- ID: ${survivor.senderId}
- Message: "${survivor.message || 'Needs help'}"
- Location: ${survivor.latitude}, ${survivor.longitude}

AVAILABLE HELPERS:
${helpers.map((h) => `- ID: ${h.senderId}, Skills: ${h.skills || 'General'}, Distance: ${h.distance ? h.distance.toFixed(1) + 'km' : 'unknown'}`).join('\n')}`;

    const result = await askClaude(prompt);

    if (result) {
      const cleaned = cleanJSON(result);
      if (cleaned) {
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.helperId) {
          return parsed;
        }
      }
    }
  } catch (error) {
    console.log('AI match failed, using offline:', error.message);
  }

  // Offline fallback
  console.log('Using offline distance matching');
  return offlineMatch(survivor, helpers);
};


// ============================================
//  AI Survival Tips
// ============================================

export const getSurvivalTips = async (situation) => {
  // Try Claude AI first
  try {
    const prompt = `You are helping disaster survivors. Give exactly 3 short survival tips for this situation: "${situation || 'general disaster'}".
Format as a numbered list. Keep each tip under 15 words. No extra text.`;

    const result = await askClaude(prompt);
    if (result) return result;
  } catch (error) {
    console.log('AI tips failed, using offline:', error.message);
  }

  // Offline fallback
  console.log('Using offline survival tips');
  return offlineTips(situation);
};


// ============================================
//  AI Chat — General Questions
// ============================================

export const askResQNetAI = async (question) => {
  // Try Claude AI first
  try {
    const result = await askClaude(question);
    if (result) return result;
  } catch (error) {
    console.log('AI chat failed:', error.message);
  }

  // Offline fallback
  return 'AI is offline. Please check your internet connection and try again.';
};