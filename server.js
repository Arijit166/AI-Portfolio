import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve your static HTML

// List of model endpoints to try (in order of preference)
const GEMINI_MODELS = [
  'gemini-1.5-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
  'gemini-1.5-pro-latest',
  'gemini-2.5-flash-exp'  // If you have access to newer models
];

async function tryGeminiRequest(contents, apiKey) {
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      
      const requestBody = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      };
      
      const result = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      console.log(`Model ${model} response status:`, result.status);

      if (result.ok) {
        const data = await result.json();
        console.log(`Success with model: ${model}`);
        return { success: true, data };
      } else {
        const errorText = await result.text();
        console.log(`Model ${model} failed with status ${result.status}:`, errorText);
        // Continue to next model
      }
    } catch (error) {
      console.log(`Model ${model} failed with error:`, error.message);
      // Continue to next model
    }
  }
  
  return { success: false, error: 'All models failed' };
}

app.post('/api/gemini', async (req, res) => {
  const { contents } = req.body;
  
  // Check if API key exists
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in environment variables');
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  // Log the API key (first 10 characters only for security)
  console.log('Using API key starting with:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
  
  try {
    console.log('Making request to Gemini API...');
    console.log('Contents:', JSON.stringify(contents, null, 2));
    
    const result = await tryGeminiRequest(contents, process.env.GEMINI_API_KEY);
    
    if (result.success) {
      res.json(result.data);
    } else {
      console.error('All Gemini models failed');
      return res.status(500).json({ 
        error: 'All Gemini models failed. Please check your API key and try again.',
        details: result.error
      });
    }
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Failed to fetch from Gemini API', details: err.message });
  }
});

// Test endpoint to check if your API key works
app.get('/api/test', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ error: 'No API key configured' });
  }
  
  try {
    const testContents = [{
      parts: [{ text: "Hello, this is a test message. Please respond with 'API is working!'" }]
    }];
    
    const result = await tryGeminiRequest(testContents, process.env.GEMINI_API_KEY);
    
    if (result.success) {
      res.json({ 
        status: 'success', 
        response: result.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text'
      });
    } else {
      res.json({ status: 'failed', error: result.error });
    }
  } catch (error) {
    res.json({ status: 'error', message: error.message });
  }
});

app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});