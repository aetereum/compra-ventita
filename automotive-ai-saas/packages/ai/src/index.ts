import type { 
  AIProvider, 
  AIModel, 
  AIProviderType, 
  AIModelType, 
  AIModelCapability,
  AIRequest, 
  AIResponse, 
  AIMessage, 
  AITool, 
  AIToolCall,
  AIUsage,
} from '@automotive/types';

export interface AIProviderAdapter {
  chat(request: AIRequest): Promise<AIResponse>;
  streamChat(request: AIRequest): AsyncIterable<AIResponse>;
  embeddings(texts: string[], model: string): Promise<number[][]>;
  listModels(): Promise<AIModel[]>;
}

export class OpenAIProvider implements AIProviderAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        tool_choice: request.toolChoice,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.mapResponse(data, request.id);
  }

  async *streamChat(request: AIRequest): AsyncIterable<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        tool_choice: request.toolChoice,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              yield this.mapStreamResponse(parsed, request.id);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(texts: string[], model = 'text-embedding-3-small'): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: texts, model }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }

  async listModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.data
      .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1'))
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        type: 'CHAT' as AIModelType,
        contextWindow: this.getContextWindow(m.id),
        maxOutputTokens: this.getMaxOutputTokens(m.id),
        capabilities: this.getCapabilities(m.id),
        costPer1kInputTokens: this.getInputCost(m.id),
        costPer1kOutputTokens: this.getOutputCost(m.id),
        supportsStreaming: true,
        supportsFunctions: this.supportsFunctions(m.id),
        supportsVision: this.supportsVision(m.id),
      }));
  }

  private mapMessage(msg: AIMessage): any {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    return {
      role: msg.role,
      content: msg.content.map(c => {
        if (c.type === 'text') return { type: 'text', text: c.text };
        if (c.type === 'image_url') return { type: 'image_url', image_url: c.imageUrl };
        return { type: 'text', text: '' };
      }),
    };
  }

  private mapTool(tool: AITool): any {
    return {
      type: 'function',
      function: tool.function,
    };
  }

  private mapResponse(data: any, requestId: string): AIResponse {
    const choice = data.choices[0];
    return {
      id: data.id as any,
      requestId: requestId as any,
      model: data.model,
      choices: [{
        index: 0,
        message: {
          role: choice.message.role,
          content: choice.message.content || '',
          toolCalls: choice.message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        },
        finishReason: choice.finish_reason,
      }],
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        costUsd: this.calculateCost(data.model, data.usage.prompt_tokens, data.usage.completion_tokens),
      },
      createdAt: new Date().toISOString() as any,
    };
  }

  private mapStreamResponse(data: any, requestId: string): AIResponse {
    const choice = data.choices[0];
    return {
      id: data.id as any,
      requestId: requestId as any,
      model: data.model,
      choices: [{
        index: 0,
        message: {
          role: choice.delta?.role || 'assistant',
          content: choice.delta?.content || '',
          toolCalls: choice.delta?.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        },
        finishReason: choice.finish_reason,
      }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
      createdAt: new Date().toISOString() as any,
    };
  }

  private getContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 128000;
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5')) return 16384;
    return 4096;
  }

  private getMaxOutputTokens(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 4096;
    if (modelId.includes('gpt-4')) return 4096;
    if (modelId.includes('gpt-3.5')) return 4096;
    return 2048;
  }

  private getCapabilities(modelId: string): AIModelCapability[] {
    const caps: AIModelCapability[] = ['CHAT'];
    if (this.supportsFunctions(modelId)) caps.push('FUNCTION_CALLING');
    if (this.supportsVision(modelId)) caps.push('VISION');
    return caps;
  }

  private supportsFunctions(modelId: string): boolean {
    return modelId.includes('gpt-4') || modelId.includes('gpt-3.5-turbo');
  }

  private supportsVision(modelId: string): boolean {
    return modelId.includes('gpt-4o') || modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4-vision');
  }

  private getInputCost(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 0.005;
    if (modelId.includes('gpt-4-turbo')) return 0.01;
    if (modelId.includes('gpt-4')) return 0.03;
    if (modelId.includes('gpt-3.5')) return 0.0005;
    return 0.01;
  }

  private getOutputCost(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 0.015;
    if (modelId.includes('gpt-4-turbo')) return 0.03;
    if (modelId.includes('gpt-4')) return 0.06;
    if (modelId.includes('gpt-3.5')) return 0.0015;
    return 0.02;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1000) * this.getInputCost(model) + (outputTokens / 1000) * this.getOutputCost(model);
  }
}

export class AnthropicProvider implements AIProviderAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const messages = request.messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        system: systemMessage?.content,
        messages: messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        tool_choice: this.mapToolChoice(request.toolChoice),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens || 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.mapResponse(data, request.id);
  }

  async *streamChat(request: AIRequest): AsyncIterable<AIResponse> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const messages = request.messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        system: systemMessage?.content,
        messages: messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        tool_choice: this.mapToolChoice(request.toolChoice),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens || 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'message_delta' || parsed.type === 'content_block_delta') {
                yield this.mapStreamResponse(parsed, request.id);
              }
            } catch {}
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(texts: string[], model: string): Promise<number[][]> {
    // Anthropic doesn't have embeddings API yet
    throw new Error('Embeddings not supported by Anthropic');
  }

  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        type: 'CHAT',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        capabilities: ['CHAT', 'FUNCTION_CALLING', 'VISION', 'REASONING'],
        costPer1kInputTokens: 0.003,
        costPer1kOutputTokens: 0.015,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        type: 'CHAT',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        capabilities: ['CHAT', 'FUNCTION_CALLING', 'VISION', 'REASONING'],
        costPer1kInputTokens: 0.015,
        costPer1kOutputTokens: 0.075,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        type: 'CHAT',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        capabilities: ['CHAT', 'FUNCTION_CALLING', 'VISION'],
        costPer1kInputTokens: 0.00025,
        costPer1kOutputTokens: 0.00125,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true,
      },
    ];
  }

  private mapMessage(msg: AIMessage): any {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    return {
      role: msg.role,
      content: msg.content.map(c => {
        if (c.type === 'text') return { type: 'text', text: c.text };
        if (c.type === 'image_url') return { type: 'image', source: { type: 'url', url: c.imageUrl?.url } };
        return { type: 'text', text: '' };
      }),
    };
  }

  private mapTool(tool: AITool): any {
    return {
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    };
  }

  private mapToolChoice(choice?: string): any {
    if (!choice || choice === 'auto') return { type: 'auto' };
    if (choice === 'none') return { type: 'none' };
    if (choice === 'required') return { type: 'any' };
    return { type: 'auto' };
  }

  private mapResponse(data: any, requestId: string): AIResponse {
    const content = data.content[0];
    return {
      id: data.id as any,
      requestId: requestId as any,
      model: data.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content.type === 'text' ? content.text : '',
          toolCalls: data.content
            .filter((c: any) => c.type === 'tool_use')
            .map((c: any) => ({
              id: c.id,
              type: 'function' as const,
              function: { name: c.name, arguments: JSON.stringify(c.input) },
            })),
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 
                      data.stop_reason === 'max_tokens' ? 'length' :
                      data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      }],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        costUsd: (data.usage.input_tokens / 1000) * 0.003 + (data.usage.output_tokens / 1000) * 0.015,
      },
      createdAt: new Date().toISOString() as any,
    };
  }

  private mapStreamResponse(data: any, requestId: string): AIResponse {
    return {
      id: data.message_id || crypto.randomUUID() as any,
      requestId: requestId as any,
      model: '',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.delta?.text || '',
        },
        finishReason: data.delta?.stop_reason === 'end_turn' ? 'stop' : 
                      data.delta?.stop_reason === 'max_tokens' ? 'length' : undefined,
      }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
      createdAt: new Date().toISOString() as any,
    };
  }
}

export class CloudflareAIProvider implements AIProviderAdapter {
  private ai: any; // Cloudflare Workers AI binding
  private accountId: string;
  private apiToken: string;

  constructor(ai: any, accountId?: string, apiToken?: string) {
    this.ai = ai;
    this.accountId = accountId;
    this.apiToken = apiToken;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    if (this.ai) {
      // Use Workers AI binding
      const response = await this.ai.run(request.model, {
        messages: request.messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        tool_choice: request.toolChoice,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false,
      });

      return this.mapWorkersResponse(response, request.id, request.model);
    } else if (this.accountId && this.apiToken) {
      // Use REST API
      return this.chatViaREST(request);
    }
    throw new Error('Cloudflare AI not configured');
  }

  async *streamChat(request: AIRequest): AsyncIterable<AIResponse> {
    if (this.ai) {
      const stream = await this.ai.run(request.model, {
        messages: request.messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        yield this.mapWorkersStreamChunk(chunk, request.id, request.model);
      }
    } else if (this.accountId && this.apiToken) {
      // REST streaming not fully implemented
      const response = await this.chatViaREST(request);
      yield response;
    }
  }

  async embeddings(texts: string[], model = '@cf/baai/bge-base-en-v1.5'): Promise<number[][]> {
    if (this.ai) {
      const response = await this.ai.run(model, { text: texts });
      return response.data;
    }
    throw new Error('Embeddings require Workers AI binding');
  }

  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: '@cf/meta/llama-3-8b-instruct',
        name: 'Llama 3 8B Instruct',
        type: 'CHAT',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: ['CHAT', 'FUNCTION_CALLING'],
        costPer1kInputTokens: 0,
        costPer1kOutputTokens: 0,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: false,
      },
      {
        id: '@cf/meta/llama-3-70b-instruct',
        name: 'Llama 3 70B Instruct',
        type: 'CHAT',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: ['CHAT', 'FUNCTION_CALLING', 'REASONING'],
        costPer1kInputTokens: 0,
        costPer1kOutputTokens: 0,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: false,
      },
      {
        id: '@cf/mistral/mistral-7b-instruct-v0.1',
        name: 'Mistral 7B Instruct',
        type: 'CHAT',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: ['CHAT'],
        costPer1kInputTokens: 0,
        costPer1kOutputTokens: 0,
        supportsStreaming: true,
        supportsFunctions: false,
        supportsVision: false,
      },
      {
        id: '@cf/google/gemma-7b-it',
        name: 'Gemma 7B IT',
        type: 'CHAT',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: ['CHAT'],
        costPer1kInputTokens: 0,
        costPer1kOutputTokens: 0,
        supportsStreaming: true,
        supportsFunctions: false,
        supportsVision: false,
      },
    ];
  }

  private mapMessage(msg: AIMessage): any {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    return {
      role: msg.role,
      content: msg.content.map(c => {
        if (c.type === 'text') return { type: 'text', text: c.text };
        return { type: 'text', text: '' };
      }),
    };
  }

  private mapTool(tool: AITool): any {
    return {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    };
  }

  private mapWorkersResponse(response: any, requestId: string, model: string): AIResponse {
    return {
      id: crypto.randomUUID() as any,
      requestId: requestId as any,
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.response || response.text || '',
          toolCalls: response.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        },
        finishReason: response.tool_calls ? 'tool_calls' : 'stop',
      }],
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        costUsd: 0,
      },
      createdAt: new Date().toISOString() as any,
    };
  }

  private mapWorkersStreamChunk(chunk: any, requestId: string, model: string): AIResponse {
    return {
      id: crypto.randomUUID() as any,
      requestId: requestId as any,
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: chunk.response || chunk.text || '',
        },
        finishReason: chunk.done ? 'stop' : undefined,
      }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
      createdAt: new Date().toISOString() as any,
    };
  }

  private async chatViaREST(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${request.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: request.messages.map(this.mapMessage),
        tools: request.tools?.map(this.mapTool),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.mapWorkersResponse(data.result, request.id, request.model);
  }
}

export class AIProviderRegistry {
  private providers: Map<string, AIProviderAdapter> = new Map();
  private defaultProvider: string | null = null;

  register(name: string, provider: AIProviderAdapter, isDefault = false): void {
    this.providers.set(name, provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  get(name?: string): AIProviderAdapter | null {
    const providerName = name || this.defaultProvider;
    return providerName ? this.providers.get(providerName) || null : null;
  }

  getAll(): AIProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const provider = this.get(request.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${request.provider}`);
    }
    return provider.chat(request);
  }

  async *streamChat(request: AIRequest): AsyncIterable<AIResponse> {
    const provider = this.get(request.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${request.provider}`);
    }
    yield* provider.streamChat(request);
  }
}

export function createAIProviderRegistry(env: { 
  AI?: any; 
  OPENAI_API_KEY?: string; 
  ANTHROPIC_API_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}): AIProviderRegistry {
  const registry = new AIProviderRegistry();

  // Register Cloudflare Workers AI (default if available)
  if (env.AI) {
    registry.register('cloudflare', new CloudflareAIProvider(env.AI), true);
  } else if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN) {
    registry.register('cloudflare', new CloudflareAIProvider(null, env.CF_ACCOUNT_ID, env.CF_API_TOKEN), true);
  }

  // Register OpenAI
  if (env.OPENAI_API_KEY) {
    registry.register('openai', new OpenAIProvider(env.OPENAI_API_KEY));
  }

  // Register Anthropic
  if (env.ANTHROPIC_API_KEY) {
    registry.register('anthropic', new AnthropicProvider(env.ANTHROPIC_API_KEY));
  }

  return registry;
}