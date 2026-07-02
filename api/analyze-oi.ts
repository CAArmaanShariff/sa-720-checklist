import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both Groq (FREE) and OpenRouter (paid)
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!GROQ_API_KEY && !OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: 'No API key configured. Add GROQ_API_KEY (free) or OPENROUTER_API_KEY to Vercel environment variables.'
    });
  }

  // Prefer Groq (free) over OpenRouter (paid)
  const useGroq = !!GROQ_API_KEY;
  const API_KEY = useGroq ? GROQ_API_KEY : OPENROUTER_API_KEY;

  try {
    const { fsText, oiText } = req.body || {};

    if (!fsText || !oiText) {
      return res.status(400).json({ error: 'Both financial statements and annual report text are required' });
    }

    const systemPrompt = `You are a strict Indian Statutory Auditor performing an SA 720 review. Your job is to read the 'Other Information' (Annual Report) and cross-check it against the 'Audited Financial Statements'. 

You must identify material inconsistencies. Check for:

1. Quantitative Tie-Out: Extract key metrics (Revenue, Net Profit, Debt-Equity Ratio, Net Worth) from the narrative sections (MD&A, Directors' Report) and compare them exactly to the Audited Financials.

2. Ratio Analysis (SEBI LODR Reg 34 / Schedule V): Identify any key financial ratios disclosed. If a ratio has changed by 25% or more compared to the previous year, verify if the management has provided a detailed explanation in the MD&A.

3. Qualitative Compliance (Companies Act Sec 134 & SEBI LODR): Verify the physical presence of the Directors' Responsibility Statement, MD&A, BRSR, and Corporate Governance Report.

Return your response strictly as a JSON object matching this structure:
{
  "tieOutLedger": [
    { "metric": "Revenue", "financialValue": "X", "oiValue": "Y", "variance": "Z", "status": "Matched | Inconsistent", "sourcePage": "Page X of Annual Report" }
  ],
  "checklist": {
    "hasMDA": true/false,
    "hasBRSR": true/false,
    "hasDirectorsResponsibility": true/false,
    "unexplainedRatioVariances": ["list of ratios > 25% change with missing explanations"]
  },
  "materialInconsistencies": [
    { "description": "Detailed explanation of the contradiction", "source": "e.g., MD&A page 14 vs Note 5 of FS" }
  ]
}`;

    const userPrompt = `AUDITED FINANCIAL STATEMENTS:
\`\`\`
${fsText.substring(0, 50000)}
\`\`\`

OTHER INFORMATION (ANNUAL REPORT):
\`\`\`
${oiText.substring(0, 50000)}
\`\`\`

Please analyze these documents and return the JSON response.`;

    // Call API (Groq or OpenRouter)
    const apiUrl = useGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    
    const model = useGroq 
      ? 'llama-3.3-70b-versatile'  // FREE on Groq
      : 'anthropic/claude-sonnet-4';  // Paid on OpenRouter
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
    
    // Add OpenRouter-specific headers
    if (!useGroq) {
      headers['HTTP-Referer'] = 'https://github.com/CAArmaanShariff/sa-720-checklist';
      headers['X-Title'] = 'SA 720 Checklist AI Analysis';
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${useGroq ? 'Groq' : 'OpenRouter'} API error:`, errorText);
      return res.status(500).json({ error: `AI analysis failed: ${response.status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'No response from AI model' });
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw AI response:', content);
      return res.status(500).json({ error: 'Could not parse AI response as JSON' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed'
    });
  }
}
