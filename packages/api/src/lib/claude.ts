export interface AISummarizeResult {
  summary: string
  keyPoints: string[]
}

export interface AIAnswerResult {
  answer: string
  sources: string[]
}

export interface AIFilterResult {
  relevant: boolean
  reason: string
  score: number
}

/**
 * Claude Messages API via fetch (Workers-compatible, no Node SDK).
 */
export class ClaudeClient {
  constructor(private apiKey: string) {}

  private async complete(prompt: string, maxTokens = 500): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Claude API error ${res.status}: ${body}`)
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>
    }
    const block = data.content.find((c) => c.type === 'text')
    return block?.text || ''
  }

  async summarize(content: string, maxTokens = 500): Promise<AISummarizeResult> {
    const text = await this.complete(
      `Please summarize the following article concisely:\n\n${content.slice(0, 10000)}`,
      maxTokens,
    )
    return {
      summary: text,
      keyPoints: text.split('\n').filter((line) => line.trim().startsWith('-')),
    }
  }

  async answer(content: string, question: string): Promise<AIAnswerResult> {
    const text = await this.complete(
      `Based on the following article, answer the question.\n\nArticle:\n${content.slice(0, 10000)}\n\nQuestion: ${question}`,
    )
    return { answer: text, sources: [] }
  }

  async filter(content: string, userPreferences?: string): Promise<AIFilterResult> {
    const text = await this.complete(
      `Analyze if this article is relevant to the user's interests.\n\nArticle:\n${content.slice(0, 5000)}\n\nUser preferences: ${userPreferences || 'General interest'}\n\nRespond with only a JSON object: {"relevant": true/false, "reason": "brief reason", "score": 0-10}`,
      200,
    )
    try {
      const parsed = JSON.parse(text) as AIFilterResult
      return {
        relevant: !!parsed.relevant,
        reason: parsed.reason || '',
        score: parsed.score ?? 5,
      }
    } catch {
      return { relevant: true, reason: 'Parse error', score: 5 }
    }
  }
}
