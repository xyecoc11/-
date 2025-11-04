import type { RevenueKPIs, Insight } from './types';

const SYSTEM_PROMPT = `You are a revenue analyst for Whop creators. Output max 3 bullet insights in JSON with title/body/severity. Focus on churn spikes, failed payments, and trend deltas.`;

/**
 * Generates AI insights from KPIs using OpenRouter (Google Gemini 2.5 Flash Lite model).
 * Returns fallback insights if OPENROUTER_API_KEY is missing.
 */
export async function summarizeTrends(kpis: RevenueKPIs, notes?: string): Promise<Insight[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Safe fallback when AI is disabled
    return [
      {
        title: 'AI Insights Disabled',
        body: 'OpenRouter API key not configured. Enable AI insights by setting OPENROUTER_API_KEY in environment.',
        severity: 'info',
      },
    ];
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ kpis, notes }) },
    ];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
        'X-Title': 'Whop Revenue Intelligence',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    const insights = parsed?.insights || parsed;
    
    if (!Array.isArray(insights)) {
      throw new Error('Invalid insights format');
    }

    return insights.slice(0, 3).map((ins: any) => ({
      title: ins.title || 'Untitled',
      body: ins.body || '',
      severity: ['info', 'warn', 'critical'].includes(ins.severity) ? ins.severity : 'info',
    }));
  } catch (error: any) {
    console.error('[AI] Error generating insights:', error);
    return [
      {
        title: 'AI Insights Error',
        body: error?.message || 'Failed to generate AI insights',
        severity: 'warn',
      },
    ];
  }
}
