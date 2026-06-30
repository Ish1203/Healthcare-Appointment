const https = require('https');

async function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content && parsed.content[0]) {
            resolve(parsed.content[0].text);
          } else {
            reject(new Error('No content in response'));
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
    const response = await callClaude(prompt);
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
    const response = await callClaude(prompt);
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
