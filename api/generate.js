export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { businessName, ownerName, city, industry, painPoint, emailType } = req.body;

  if (!businessName) return res.status(400).json({ error: 'Business name is required' });

  const typeLabels = {
    quick: 'Quick Question style (conversational, one question at the end, under 80 words)',
    team: 'Team/Info@ style (slightly more formal, addressed to the team, under 100 words)',
    followup: 'Follow-up #2 style (brief, references previous email, under 60 words, no hard sell)'
  };

  const systemPrompt = `You are a cold email copywriter for Meerakapp™ Solutions, a B2B SaaS company selling a done-for-you automated SMS response system to small home service contractors. The product texts missed calls back within 30 seconds automatically — contractors never lose a lead while on a job again.

Your cold emails follow these strict rules:
- Under 120 words total (body only, excluding subject)
- No spam trigger openers like "I hope this finds you well" or "My name is..."
- No hype, no pressure, no bullet points
- Start with a specific observation about their business
- One clear pain point: missed calls = lost revenue
- One soft CTA: a question or a short calendar link offer
- Sound like a real person wrote it, not a marketing tool
- Always include a subject line on the first line formatted exactly as: SUBJECT: [subject line here]
- Then a blank line
- Then the email body
- Sign off as: Abu | Meerakapp™`;

  const userPrompt = `Write a cold email for this prospect:

Business: ${businessName}
${ownerName ? `Owner: ${ownerName}` : 'Owner name unknown — do not use a name'}
${city ? `City: ${city}` : ''}
Industry: ${industry || 'HVAC'}
${painPoint ? `Pain point observed: ${painPoint}` : 'Use a common pain point for this industry: slow lead response, missed calls going to voicemail'}
Email type: ${typeLabels[emailType] || typeLabels.quick}

Remember: SUBJECT line first, then blank line, then email body. Keep it human, specific, and under 120 words.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Anthropic API error');
    }

    const text = data.content?.[0]?.text || '';
    res.status(200).json({ result: text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
