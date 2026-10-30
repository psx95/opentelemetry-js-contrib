/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  instrumentation,
  meterProvider,
  metricExporter,
} from './load-instrumentation';
import { context, SpanStatusCode } from '@opentelemetry/api';
import {
  getTestSpans,
  resetMemoryExporter,
} from '@opentelemetry/contrib-test-utils';
import { suppressTracing } from '@opentelemetry/core';
import {
  ATTR_GEN_AI_CONVERSATION_COMPACTED,
  ATTR_GEN_AI_CONVERSATION_ID,
  ATTR_GEN_AI_EMBEDDINGS_DIMENSION_COUNT,
  ATTR_GEN_AI_INPUT_MESSAGES,
  ATTR_GEN_AI_OUTPUT_MESSAGES,
  ATTR_GEN_AI_OUTPUT_TYPE,
  ATTR_GEN_AI_REQUEST_REASONING_LEVEL,
  ATTR_GEN_AI_RESPONSE_FINISH_REASONS,
  ATTR_GEN_AI_RESPONSE_STATUS,
  ATTR_GEN_AI_SYSTEM_INSTRUCTIONS,
  ATTR_GEN_AI_TOKEN_MODALITY,
  ATTR_GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS,
  ATTR_GEN_AI_USAGE_INPUT_TOKENS,
  ATTR_GEN_AI_USAGE_OUTPUT_TOKENS,
  ATTR_GEN_AI_USAGE_REASONING_OUTPUT_TOKENS,
  ENV_GENAI_CAPTURE_MESSAGE_CONTENT,
  METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_CACHE_READ_INPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_INPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_OUTPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_REASONING_OUTPUT_TOKENS,
} from '@opentelemetry/genai-util';
import { ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { expect } from 'expect';
import nock from 'nock';
import { OpenAI } from 'openai';
import { VERSION } from 'openai/version';
import { OpenAIInstrumentation } from '../src';

describe('OpenAI genai-util integration', function () {
  const client = new OpenAI({ apiKey: 'test-key', maxRetries: 0 });
  const describeResponses = VERSION >= '4.87.0' ? describe : describe.skip;

  beforeEach(() => {
    resetMemoryExporter();
    metricExporter.reset();
    instrumentation.setConfig({});
    instrumentation.enable();
  });

  afterEach(async () => {
    instrumentation.disable();
    instrumentation.setConfig({});
    nock.cleanAll();
    delete process.env[ENV_GENAI_CAPTURE_MESSAGE_CONTENT];
    await meterProvider.forceFlush();
    metricExporter.reset();
  });

  it('honors OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT in constructor and setConfig overrides', async () => {
    process.env[ENV_GENAI_CAPTURE_MESSAGE_CONTENT] = 'SPAN_ONLY';
    const envInst = new OpenAIInstrumentation();
    expect(envInst.getConfig().captureMessageContent).toBe('span_only');

    envInst.setConfig({ captureMessageContent: false });
    expect(envInst.getConfig().captureMessageContent).toBe('none');

    envInst.setConfig({ captureMessageContent: true });
    expect(envInst.getConfig().captureMessageContent).toBe('span_only');
  });

  it('skips span and metric emission when tracing is suppressed', async () => {
    nock('https://api.openai.com')
      .post('/v1/chat/completions')
      .reply(200, {
        id: 'chatcmpl-suppressed',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-4o-mini-2024-07-18',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: 'Hi' },
            logprobs: null,
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      });

    nock('https://api.openai.com')
      .post('/v1/embeddings')
      .reply(200, {
        object: 'list',
        model: 'text-embedding-3-small',
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2] }],
        usage: { prompt_tokens: 3, total_tokens: 3 },
      });

    await context.with(suppressTracing(context.active()), async () => {
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Hello',
      });
    });

    expect(getTestSpans()).toHaveLength(0);
    await meterProvider.forceFlush();
    expect(metricExporter.getMetrics()).toHaveLength(0);
  });

  it('records RateLimitError error.type on HTTP 429 without leaking raw status message', async () => {
    nock('https://api.openai.com')
      .post('/v1/chat/completions')
      .reply(429, {
        error: {
          message: 'Rate limit reached for sensitive-org-id-12345',
          type: 'requests',
          code: 'rate_limit_exceeded',
        },
      });

    await expect(
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow(OpenAI.RateLimitError);
    await Promise.resolve();

    const spans = getTestSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].attributes[ATTR_ERROR_TYPE]).toBe('RateLimitError');
    expect(spans[0].attributes[ATTR_GEN_AI_RESPONSE_FINISH_REASONS]).toEqual([
      'error',
    ]);
    expect(spans[0].status).toEqual({ code: SpanStatusCode.ERROR });
    expect(spans[0].status.message).toBeUndefined();
  });

  it('records token modality, cache read, reasoning, output.type, and multimodal base64 BlobPart on chat', async () => {
    instrumentation.setConfig({ captureMessageContent: 'span_only' });

    const imgBytes = Buffer.from([137, 80, 78, 71]);
    const imgB64 = imgBytes.toString('base64');

    nock('https://api.openai.com')
      .post('/v1/chat/completions')
      .reply(200, {
        id: 'chatcmpl-modality',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-4o-audio-preview',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: '{"answer":"ok"}' },
            logprobs: null,
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 60,
          total_tokens: 160,
          prompt_tokens_details: {
            cached_tokens: 40,
            audio_tokens: 25,
          },
          completion_tokens_details: {
            reasoning_tokens: 15,
            audio_tokens: 10,
          },
        },
      });

    await client.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      reasoning_effort: 'medium',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze image' },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imgB64}` },
            },
          ],
        },
      ],
    });

    const spans = getTestSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].attributes[ATTR_GEN_AI_OUTPUT_TYPE]).toBe('json');
    expect(spans[0].attributes[ATTR_GEN_AI_REQUEST_REASONING_LEVEL]).toBe(
      'medium'
    );
    expect(spans[0].attributes[ATTR_GEN_AI_USAGE_INPUT_TOKENS]).toBe(100);
    expect(spans[0].attributes[ATTR_GEN_AI_USAGE_OUTPUT_TOKENS]).toBe(60);
    expect(spans[0].attributes[ATTR_GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS]).toBe(
      40
    );
    expect(spans[0].attributes[ATTR_GEN_AI_USAGE_REASONING_OUTPUT_TOKENS]).toBe(
      15
    );

    const parsedInput = JSON.parse(
      spans[0].attributes[ATTR_GEN_AI_INPUT_MESSAGES] as string
    );
    expect(parsedInput).toEqual([
      {
        role: 'user',
        parts: [
          { type: 'text', content: 'Analyze image' },
          {
            type: 'blob',
            modality: 'image',
            mime_type: 'image/png',
            content: imgB64,
          },
        ],
      },
    ]);

    await meterProvider.forceFlush();
    const [resourceMetrics] = metricExporter.getMetrics();
    const metrics = resourceMetrics.scopeMetrics[0].metrics;

    const inputCounter = metrics.find(
      m =>
        m.descriptor.name === METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_INPUT_TOKENS
    )!;
    expect(inputCounter.dataPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 25,
          attributes: expect.objectContaining({
            [ATTR_GEN_AI_TOKEN_MODALITY]: 'audio',
          }),
        }),
        expect.objectContaining({
          value: 75,
          attributes: expect.objectContaining({
            [ATTR_GEN_AI_TOKEN_MODALITY]: 'unknown',
          }),
        }),
      ])
    );

    const outputCounter = metrics.find(
      m =>
        m.descriptor.name === METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_OUTPUT_TOKENS
    )!;
    expect(outputCounter.dataPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 10,
          attributes: expect.objectContaining({
            [ATTR_GEN_AI_TOKEN_MODALITY]: 'audio',
          }),
        }),
        expect.objectContaining({
          value: 50,
          attributes: expect.objectContaining({
            [ATTR_GEN_AI_TOKEN_MODALITY]: 'unknown',
          }),
        }),
      ])
    );

    const cacheReadCounter = metrics.find(
      m =>
        m.descriptor.name ===
        METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_CACHE_READ_INPUT_TOKENS
    )!;
    expect(cacheReadCounter.dataPoints).toEqual([
      expect.objectContaining({
        value: 40,
        attributes: expect.objectContaining({
          [ATTR_GEN_AI_TOKEN_MODALITY]: 'unknown',
        }),
      }),
    ]);

    const reasoningCounter = metrics.find(
      m =>
        m.descriptor.name ===
        METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_REASONING_OUTPUT_TOKENS
    )!;
    expect(reasoningCounter.dataPoints).toEqual([
      expect.objectContaining({
        value: 15,
        attributes: expect.objectContaining({
          [ATTR_GEN_AI_TOKEN_MODALITY]: 'text',
        }),
      }),
    ]);
  });

  it('infers base64 embedding dimensions and honors explicit request dimensions', async () => {
    const float32Buf = Buffer.alloc(32); // 8 float32 dimensions
    nock('https://api.openai.com')
      .post('/v1/embeddings')
      .reply(200, {
        object: 'list',
        model: 'text-embedding-3-small',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: float32Buf.toString('base64'),
          },
        ],
        usage: { prompt_tokens: 4, total_tokens: 4 },
      });

    await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'base64 test',
      encoding_format: 'base64',
    });

    let spans = getTestSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].attributes[ATTR_GEN_AI_EMBEDDINGS_DIMENSION_COUNT]).toBe(8);

    resetMemoryExporter();
    nock('https://api.openai.com')
      .post('/v1/embeddings')
      .reply(200, {
        object: 'list',
        model: 'text-embedding-3-small',
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }],
        usage: { prompt_tokens: 4, total_tokens: 4 },
      });

    await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'explicit dims',
      dimensions: 256,
    });

    spans = getTestSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].attributes[ATTR_GEN_AI_EMBEDDINGS_DIMENSION_COUNT]).toBe(
      256
    );
  });

  describeResponses('Responses genai-util specifics', function () {
    it('records system instructions, conversation ID, json output type, and compaction under span_only', async () => {
      instrumentation.setConfig({ captureMessageContent: 'span_only' });

      nock('https://api.openai.com')
        .post('/v1/responses')
        .reply(200, {
          id: 'resp_compact_1',
          object: 'response',
          created_at: 1700000000,
          status: 'completed',
          model: 'gpt-4.1-2025-04-14',
          conversation: { id: 'conv_abc123' },
          output: [
            {
              type: 'compaction',
              id: 'cmp_999',
              content: 'Compacted summary',
            },
          ],
          usage: {
            input_tokens: 50,
            output_tokens: 10,
            total_tokens: 60,
          },
        });

      await client.responses.create({
        model: 'gpt-4.1',
        instructions: 'Summarize carefully.',
        conversation: 'conv_abc123',
        text: { format: { type: 'json_object' } },
        input: 'Hello world',
      });

      const spans = getTestSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].attributes[ATTR_GEN_AI_CONVERSATION_ID]).toBe(
        'conv_abc123'
      );
      expect(spans[0].attributes[ATTR_GEN_AI_OUTPUT_TYPE]).toBe('json');
      expect(spans[0].attributes[ATTR_GEN_AI_CONVERSATION_COMPACTED]).toBe(
        true
      );
      expect(spans[0].attributes[ATTR_GEN_AI_RESPONSE_FINISH_REASONS]).toEqual([
        'compaction',
      ]);
      expect(
        JSON.parse(
          spans[0].attributes[ATTR_GEN_AI_SYSTEM_INSTRUCTIONS] as string
        )
      ).toEqual([{ type: 'text', content: 'Summarize carefully.' }]);
      expect(
        JSON.parse(spans[0].attributes[ATTR_GEN_AI_OUTPUT_MESSAGES] as string)
      ).toEqual([
        {
          role: 'assistant',
          finish_reason: 'compaction',
          parts: [
            { type: 'compaction', id: 'cmp_999', content: 'Compacted summary' },
          ],
        },
      ]);
    });

    it('handles streaming response.failed SSE events and preserves .withResponse() on responses.create', async () => {
      const sseBody = [
        'event: response.created\ndata: {"type":"response.created","sequence_number":0,"response":{"id":"resp_fail_1","object":"response","status":"in_progress","model":"gpt-4o-mini-2024-07-18","output":[]}}\n\n',
        'event: response.failed\ndata: {"type":"response.failed","sequence_number":1,"response":{"id":"resp_fail_1","object":"response","status":"failed","model":"gpt-4o-mini-2024-07-18","error":{"code":"server_error","message":"Sensitive backend failure details"},"output":[]}}\n\n',
      ].join('');

      nock('https://api.openai.com')
        .post('/v1/responses')
        .reply(200, sseBody, { 'content-type': 'text/event-stream' });

      const { data: stream, response } = await client.responses
        .create({
          model: 'gpt-4o-mini',
          input: 'trigger failure',
          stream: true,
        })
        .withResponse();

      expect(response.status).toBe(200);
      const events: string[] = [];
      for await (const ev of stream) {
        events.push(ev.type);
      }
      expect(events).toEqual(['response.created', 'response.failed']);

      const spans = getTestSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].status).toEqual({ code: SpanStatusCode.ERROR });
      expect(spans[0].status.message).toBeUndefined();
      expect(spans[0].attributes[ATTR_ERROR_TYPE]).toBe('server_error');
      expect(spans[0].attributes[ATTR_GEN_AI_RESPONSE_STATUS]).toBe('failed');
      expect(spans[0].attributes[ATTR_GEN_AI_RESPONSE_FINISH_REASONS]).toEqual([
        'error',
      ]);
    });
  });
});
