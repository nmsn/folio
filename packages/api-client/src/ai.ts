import { apiClient } from './client';
import { AIAgentRequestSchema } from '@folio/shared/schemas';

export const aiApi = {
  summarize: (articleId: string) => {
    const parsed = AIAgentRequestSchema.parse({ articleId, action: 'summarize' });
    return apiClient.post('/ai/summarize', parsed);
  },

  answer: (articleId: string, question: string) => {
    const parsed = AIAgentRequestSchema.parse({ articleId, action: 'answer', question });
    return apiClient.post('/ai/answer', parsed);
  },

  filter: (articleId: string) => {
    const parsed = AIAgentRequestSchema.parse({ articleId, action: 'filter' });
    return apiClient.post('/ai/filter', parsed);
  },
};