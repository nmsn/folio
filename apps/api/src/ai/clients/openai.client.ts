// Placeholder for future OpenAI integration
// Mirrors ClaudeClient interface for pluggable AI backends

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

export class OpenAIClient {
  async summarize(content: string, maxTokens = 500): Promise<AISummarizeResult> {
    throw new Error('OpenAI client not yet implemented')
  }

  async answer(content: string, question: string): Promise<AIAnswerResult> {
    throw new Error('OpenAI client not yet implemented')
  }

  async filter(content: string, userPreferences?: string): Promise<AIFilterResult> {
    throw new Error('OpenAI client not yet implemented')
  }
}
