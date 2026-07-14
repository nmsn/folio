import type { CloudflareEnv } from '@folio/api/env'
import { handleFeedFetch, type FeedFetchMessage } from './feed-fetch.handler'
import {
  handleArticleFulltext,
  type ArticleFulltextMessage,
} from './article-fulltext.handler'
import { handleAiSummary, type AiSummaryMessage } from './ai-summary.handler'
import { handleAiAnswer, type AiAnswerMessage } from './ai-answer.handler'
import { handleAiFilter, type AiFilterMessage } from './ai-filter.handler'

export type QueueMessage =
  | FeedFetchMessage
  | ArticleFulltextMessage
  | AiSummaryMessage
  | AiAnswerMessage
  | AiFilterMessage

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: CloudflareEnv,
) {
  for (const message of batch.messages) {
    try {
      const body = message.body
      switch (body.type) {
        case 'feed.fetch':
          await handleFeedFetch(env, body.feedId)
          break
        case 'article.fulltext-fetch':
          await handleArticleFulltext(env, body)
          break
        case 'ai.summarize':
          await handleAiSummary(env, body)
          break
        case 'ai.answer':
          await handleAiAnswer(env, body)
          break
        case 'ai.filter':
          await handleAiFilter(env, body)
          break
        default:
          console.warn('Unknown queue message', body)
      }
      message.ack()
    } catch (error) {
      console.error('Queue message failed', error)
      message.retry()
    }
  }
}
