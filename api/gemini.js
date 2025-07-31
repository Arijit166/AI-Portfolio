export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST supported' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const contents = req.body.contents;

  const GEMINI_MODELS = [
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
    'gemini-1.5-pro-latest',
    'gemini-2.5-flash-exp'
  ];

  async function tryGeminiRequest(contents, apiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const result = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 150
              }
            })
          }
        );

        if (result.ok) {
          const data = await result.json();
          return { success: true, data };
        }
      } catch (err) {
        // Try next model
      }
    }
    return { success: false, error: 'All models failed' };
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const result = await tryGeminiRequest(contents, apiKey);
    if (result.success) {
      return res.status(200).json(result.data);
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
