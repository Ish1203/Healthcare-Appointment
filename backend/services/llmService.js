const https = require('https');

// Groq uses an OpenAI-compatible chat completions API.
// Free models available: "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a clinical assistant. Always respond with ONLY valid JSON, no markdown formatting, no code fences, no explanation text before or after the JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]?.message?.content) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error(parsed.error?.message || 'No content in Groq response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return a JSON object with exactly these fields:
- urgency_level: one of "Low", "Medium", or "High"
- chief_complaint: a 1-2 sentence summary of the main complaint
- suggested_questions: an array of exactly 3 questions the doctor should ask

Respond ONLY with valid JSON, no markdown, no explanation.

Symptoms: ${symptoms}`;

  try {
    const response = await callGroq(prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      success: true,
      urgency_level: parsed.urgency_level || 'Medium',
      chief_complaint: parsed.chief_complaint || '',
      suggested_questions: parsed.suggested_questions || [],
      raw: response,
    };
  } catch (err) {
    console.error('LLM pre-visit error:', err.message);
    return {
      success: false,
      urgency_level: 'Medium',
      chief_complaint: 'Unable to generate summary. Please review symptoms manually.',
      suggested_questions: ['What is the duration of symptoms?', 'Any previous history?', 'Current medications?'],
      raw: '',
    };
  }
}

async function generatePostVisitSummary(notes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary. Return a JSON object with:
- summary: a warm, easy-to-understand paragraph (max 150 words) explaining the diagnosis and treatment
- medication_schedule: array of objects with {medicine, dosage, frequency, instructions}
- follow_up_steps: array of 2-4 actionable steps the patient should take

Respond ONLY with valid JSON, no markdown.

Clinical notes: ${notes}`;

  try {
    const response = await callGroq(prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      success: true,
      summary: parsed.summary || '',
      medication_schedule: parsed.medication_schedule || [],
      follow_up_steps: parsed.follow_up_steps || [],
      raw: response,
    };
  } catch (err) {
    console.error('LLM post-visit error:', err.message);
    return {
      success: false,
      summary: 'Post-visit summary unavailable. Please contact the clinic for details.',
      medication_schedule: [],
      follow_up_steps: ['Follow doctor instructions', 'Take prescribed medications', 'Schedule follow-up if needed'],
      raw: '',
    };
  }
}

module.exports = { generatePreVisitSummary, generatePostVisitSummary };