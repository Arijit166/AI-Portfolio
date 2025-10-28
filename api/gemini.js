// api/gemini.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const contents = req.body.contents;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const GEMINI_MODELS = [
      'gemini-2.0-flash-exp',
      'gemini-2.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ];

    async function tryGeminiRequest(contents, apiKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const response = await fetch(
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

          if (response.ok) {
            const data = await response.json();
            if (data && data.candidates && data.candidates.length > 0) {
              return { success: true, data };
            }
          }
        } catch (err) {
          console.error(`Model ${model} failed:`, err);
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
}