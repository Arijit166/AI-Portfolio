const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const contents = req.body.contents;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const GEMINI_MODELS = [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ];

    async function tryGeminiRequest(contents, apiKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const fetch = (await import('node-fetch')).default;
          const result = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 200
                }
              })
            }
          );

          if (result.ok) {
            const data = await result.json();
            if (data && data.candidates && data.candidates.length > 0) {
              return { success: true, data };
            }
          }
        } catch (err) {
          console.error(`Model ${model} failed:`, err); // FIXED
          continue;
        }
      }
      return { success: false, error: 'All models failed' };
    }

    const result = await tryGeminiRequest(contents, apiKey);
    if (result.success) {
      return res.status(200).json(result.data);
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`); // FIXED
});