/**
 * Temporary verification: run the ilica Responses API through DSH's own
 * pi-ai stream translation + block assembler and print the assembled tool-call
 * blocks. Confirms the configured protocol yields non-empty tool-call ids.
 */
import { readFileSync } from 'node:fs'
import { openAIResponsesApi } from '@earendil-works/pi-ai/api/openai-responses.lazy'
import type { Context, Model, SimpleStreamOptions } from '@earendil-works/pi-ai'
import { BlockAssembler } from './packages/llm/llm/src/assembler.ts'
import { toStreamChunks } from './packages/llm/llm-pi-ai/src/stream.ts'

const creds = readFileSync('/home/lgsj/.dsh/multi-user/users/admin/home/.credentials.yaml', 'utf8')
const key = /^\s*ILICA_API_KEY:\s*(\S+)\s*$/m.exec(creds)?.[1]
if (key === undefined) throw new Error('ILICA_API_KEY missing')

const model = {
  id: 'codex-auto-review',
  name: 'codex-auto-review',
  api: 'openai-responses',
  provider: 'ilica',
  baseUrl: 'https://ilica.cn/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128_000,
  maxTokens: 4096,
} as unknown as Model<'openai-responses'>

const context = {
  messages: [{ role: 'user', content: [{ type: 'text', text: '为“调整政策解读页面解析过程区域背景样式”创建 3 条待办。' }] }],
  tools: [{
    name: 'todo_write',
    description: 'Create and manage the task list.',
    parameters: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: { content: { type: 'string' }, status: { type: 'string' } },
            required: ['content', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  }],
} as unknown as Context

const options = { apiKey: key, toolChoice: 'required' } as unknown as SimpleStreamOptions
const chunks = toStreamChunks(openAIResponsesApi().streamSimple(model, context, options), 128_000, undefined, model.id)
const assembler = new BlockAssembler()
for await (const chunk of chunks) {
  if (chunk.type === 'tool-call-delta' || chunk.type === 'block-end') {
    console.log('chunk', chunk.type, JSON.stringify(chunk).slice(0, 110))
  }
  assembler.push(chunk)
}
console.log('finish:', JSON.stringify(assembler.finish))
for (const block of assembler.blocks()) {
  if (block.type === 'tool-call') {
    console.log(`TOOL-CALL id=${JSON.stringify(block.id)} name=${JSON.stringify(block.name)} args=${block.arguments.slice(0, 60)}`)
    if (block.id.length === 0) { console.error('FAIL: empty tool-call id'); process.exit(1) }
  } else {
    console.log(block.type, JSON.stringify(block).slice(0, 80))
  }
}
const toolCalls = assembler.blocks().filter(b => b.type === 'tool-call')
if (toolCalls.length === 0) { console.error('FAIL: model returned no tool call'); process.exit(2) }
console.log('PASS: no empty tool-call id')
