export const runtime = 'edge';

interface AnalyzeRequest {
  fsText: string;
  oiText: string;
}

interface TieOutItem {
  metric: string;
  financialValue: string;
  oiValue: string;
  variance: string;
  status: 'Matched' | 'Inconsistent';
  sourcePage: string;
}

interface ChecklistResult {
  hasMDA: boolean;
  hasBRSR: boolean;
  hasDirectorsResponsibility: boolean;
  unexplainedRatioVariances: string[];
}

interface MaterialInconsistency {
  description: string;
  source: string;
}

interface AnalyzeResponse {
  tieOutLedger: TieOutItem[];
  checklist: ChecklistResult;
  materialInconsistencies: MaterialInconsistency[];
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenRouter API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { fsText, oiText } = await request.json() as AnalyzeRequest;

    if (!fsText || !oiText) {
      return new Response(
        JSON.stringify({ error: 'Both financial statements and annual report text are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/CAArmaanShariff/sa-720-checklist',
        'X-Title': 'SA 720 Checklist AI Analysis'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
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
      console.error('OpenRouter API error:', errorText);
      return new Response(
        JSON.stringify({ error: `AI analysis failed: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI model' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract JSON from response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Could not parse AI response as JSON' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]) as AnalyzeResponse;

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
