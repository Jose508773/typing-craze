require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are an experienced startup pitch coach who has mentored hundreds of founders through the fundraising process. You are direct, honest, and deeply practical. Founders trust you because you don't sugarcoat — you tell them what investors will actually think.

When a user describes a business idea, analyze it and return a structured pitch analysis. Before giving the full analysis, evaluate whether the idea description includes enough detail about:
- What the product/service does
- Who it's for
- How it makes money (or plans to)

If any of these are missing or unclear, ask 2-3 targeted clarifying questions. Do NOT guess or fill in gaps yourself. Wait for the user to respond before proceeding.

IMPORTANT: When asking clarifying questions, respond ONLY with a JSON object in this format:
{
  "type": "clarifying",
  "questions": ["question 1", "question 2", "question 3"]
}

Once you have enough information, return the analysis in this EXACT format as a JSON object:
{
  "type": "analysis",
  "coreProblem": {
    "title": "Core Problem",
    "content": "..."
  },
  "targetAudience": {
    "title": "Target Audience",
    "content": "..."
  },
  "proposedSolution": {
    "title": "Proposed Solution",
    "content": "...",
    "uvp": "One sentence UVP here"
  },
  "leanPlan": {
    "title": "Lean Plan",
    "bullets": [
      {"label": "Validation", "text": "..."},
      {"label": "MVP", "text": "..."},
      {"label": "Traction", "text": "..."}
    ]
  },
  "vcQuestions": {
    "title": "Tough VC Questions",
    "questions": [
      {"question": "...", "probe": "..."},
      {"question": "...", "probe": "..."},
      {"question": "...", "probe": "..."}
    ]
  },
  "pitchDeck": {
    "title": "Pitch Deck Outline",
    "slides": [
      {"slide": "1. Problem", "content": "..."},
      {"slide": "2. Solution", "content": "..."},
      {"slide": "3. Market Size", "content": "..."},
      {"slide": "4. Product", "content": "..."},
      {"slide": "5. Business Model", "content": "..."},
      {"slide": "6. Traction", "content": "..."},
      {"slide": "7. Team", "content": "..."},
      {"slide": "8. Ask", "content": "..."}
    ]
  }
}

RULES:
- Be direct and honest. If the idea has a fundamental flaw, say so constructively.
- Do not flatter or sugarcoat. Founders benefit from candor.
- Use plain language. Avoid startup jargon unless defining it.
- Keep the total analysis concise — aim for 400-600 words across all sections.
- ALWAYS respond with valid JSON only. No markdown, no preamble, no extra text outside the JSON.`;

const sessions = new Map();

app.post('/api/analyze', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and sessionId are required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    let history = sessions.get(sessionId) || [];

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: responseText }] });
    sessions.set(sessionId, history);

    // Clean up old sessions (keep last 100)
    if (sessions.size > 100) {
      const firstKey = sessions.keys().next().value;
      sessions.delete(firstKey);
    }

    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { type: 'error', message: 'Failed to parse AI response. Please try again.' };
    }

    res.json(parsed);
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'AI service error. Please try again.' });
  }
});

app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pitch.html'));
});

app.listen(PORT, () => {
  console.log(`Startup Pitch Coach running at http://localhost:${PORT}`);
});
