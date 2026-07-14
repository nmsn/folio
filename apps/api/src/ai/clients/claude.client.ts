import Anthropic from '@anthropic-ai/sdk'

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

export class ClaudeClient {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    })
  }

  async summarize(content: string, maxTokens = 500): Promise<AISummarizeResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: `Please summarize the following article concisely:\n\n${content.slice(0, 10000)}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    return {
      summary: text,
      keyPoints: text.split('\n').filter((line) => line.trim().startsWith('-')),
    }
  }

  async answer(content: string, question: string): Promise<AIAnswerResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Based on the following article, answer the question.\n\nArticle:\n${content.slice(0, 10000)}\n\nQuestion: ${question}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    return {
      answer: text,
      sources: [],
    }
  }

  async filter(content: string, userPreferences?: string): Promise<AIFilterResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Analyze if this article is relevant to the user's interests.\n\nArticle:\n${content.slice(0, 5000)}\n\nUser preferences: ${userPreferences || 'General interest'}\n\nRespond with only a JSON object: {"relevant": true/false, "reason": "brief reason", "score": 0-10}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    try {
      const parsed = JSON.parse(text)
      return {
        relevant: parsed.relevant,
        reason: parsed.reason || '',
        score: parsed.score || 5,
      }
    } catch {
      return { relevant: true, reason: 'Parse error', score: 5 }
    }
  }
}
