import { Module } from '@nestjs/common'
import { ClaudeClient } from './clients/claude.client'
import { OpenAIClient } from './clients/openai.client'

@Module({
  providers: [ClaudeClient, OpenAIClient],
  exports: [ClaudeClient, OpenAIClient],
})
export class AiModule {}
