/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NOTE FOR CONTRIBUTORS:
 * This package follows an incremental export policy during its incubation phase.
 * We deliberately keep internal helpers, utilities, and experimental abstractions private.
 *
 * If your instrumentation requires an unexported function, type, or class from this library:
 * 1. Add the specific named export to this file in your instrumentation PR.
 * 2. Ensure the API is generic across GenAI libraries, not tailored to a single SDK.
 *
 * Invocations are created through the {@link TelemetryHandler} factory methods
 * (`startInference`, `startEmbedding`, `startTool`, `startLocalAgent`, `startRemoteAgent`),
 * so export the invocation classes with `export type` when consumers need to name the
 * returned type: that keeps the type usable in annotations without exposing a constructor
 * that would bypass the handler.
 *
 * @example
 * ```typescript
 * // In this file: index.ts
 * export { TelemetryHandler } from './handler';
 * export type { InferenceInvocation } from './invocations/inference';
 * export type { InferenceInvocationOptions } from './types';
 * export * from './semconv';
 * ```
 */
export { TelemetryHandler } from './handler';
export type { LocalAgentInvocation } from './invocations/agent';
export type { EmbeddingInvocation } from './invocations/embedding';
export type { InferenceInvocation } from './invocations/inference';
export type { ToolInvocation } from './invocations/tool';
export type {
  ChatMessage,
  ContentCaptureMode,
  FinishReason,
  GenAIInstrumentationConfig,
  InferenceRequestOptions,
  InputMessages,
  LocalAgentRequestOptions,
  MessagePart,
  Modality,
  OutputMessage,
  OutputMessages,
  SystemInstructions,
  TokenUsageDetails,
} from './types';
export {
  ATTR_GEN_AI_AGENT_DESCRIPTION,
  ATTR_GEN_AI_AGENT_NAME,
  ATTR_GEN_AI_EMBEDDINGS_DIMENSION_COUNT,
  ATTR_GEN_AI_INPUT_MESSAGES,
  ATTR_GEN_AI_OPERATION_NAME,
  ATTR_GEN_AI_OUTPUT_MESSAGES,
  ATTR_GEN_AI_OUTPUT_TYPE,
  ATTR_GEN_AI_PROVIDER_NAME,
  ATTR_GEN_AI_REQUEST_CHOICE_COUNT,
  ATTR_GEN_AI_REQUEST_FREQUENCY_PENALTY,
  ATTR_GEN_AI_REQUEST_MAX_TOKENS,
  ATTR_GEN_AI_REQUEST_MODEL,
  ATTR_GEN_AI_REQUEST_PRESENCE_PENALTY,
  ATTR_GEN_AI_REQUEST_SEED,
  ATTR_GEN_AI_REQUEST_STOP_SEQUENCES,
  ATTR_GEN_AI_REQUEST_STREAM,
  ATTR_GEN_AI_REQUEST_TEMPERATURE,
  ATTR_GEN_AI_REQUEST_TOP_K,
  ATTR_GEN_AI_REQUEST_TOP_P,
  ATTR_GEN_AI_RESPONSE_FINISH_REASONS,
  ATTR_GEN_AI_RESPONSE_ID,
  ATTR_GEN_AI_RESPONSE_TIME_TO_FIRST_CHUNK,
  ATTR_GEN_AI_SYSTEM_INSTRUCTIONS,
  ATTR_GEN_AI_TOOL_CALL_ARGUMENTS,
  ATTR_GEN_AI_TOOL_CALL_ID,
  ATTR_GEN_AI_TOOL_CALL_RESULT,
  ATTR_GEN_AI_TOOL_DESCRIPTION,
  ATTR_GEN_AI_TOOL_NAME,
  ATTR_GEN_AI_TOOL_TYPE,
  ATTR_GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS,
  ATTR_GEN_AI_USAGE_INPUT_TOKENS,
  ATTR_GEN_AI_USAGE_OUTPUT_TOKENS,
  ATTR_GEN_AI_USAGE_REASONING_OUTPUT_TOKENS,
  GEN_AI_FINISH_REASON_VALUE_CONTENT_FILTER,
  GEN_AI_FINISH_REASON_VALUE_ERROR,
  GEN_AI_FINISH_REASON_VALUE_LENGTH,
  GEN_AI_FINISH_REASON_VALUE_STOP,
  GEN_AI_FINISH_REASON_VALUE_TOOL_CALL,
  GEN_AI_OPERATION_NAME_VALUE_CHAT,
  GEN_AI_OPERATION_NAME_VALUE_EMBEDDINGS,
  GEN_AI_OPERATION_NAME_VALUE_EXECUTE_TOOL,
  GEN_AI_OPERATION_NAME_VALUE_INVOKE_AGENT,
  GEN_AI_OUTPUT_TYPE_VALUE_JSON,
  GEN_AI_PROVIDER_NAME_VALUE_ANTHROPIC,
  GEN_AI_PROVIDER_NAME_VALUE_AWS_BEDROCK,
  GEN_AI_PROVIDER_NAME_VALUE_AZURE_AI_OPENAI,
  GEN_AI_PROVIDER_NAME_VALUE_COHERE,
  GEN_AI_PROVIDER_NAME_VALUE_DEEPSEEK,
  GEN_AI_PROVIDER_NAME_VALUE_GCP_VERTEX_AI,
  GEN_AI_PROVIDER_NAME_VALUE_GROQ,
  GEN_AI_PROVIDER_NAME_VALUE_IBM_WATSONX_AI,
  GEN_AI_PROVIDER_NAME_VALUE_MISTRAL,
  GEN_AI_PROVIDER_NAME_VALUE_OLLAMA,
  GEN_AI_PROVIDER_NAME_VALUE_OPENAI,
  GEN_AI_PROVIDER_NAME_VALUE_PERPLEXITY,
  GEN_AI_PROVIDER_NAME_VALUE_X_AI,
  GEN_AI_TOOL_TYPE_VALUE_FUNCTION,
  METRIC_GEN_AI_CLIENT_INFERENCE_OPERATION_INPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_INFERENCE_OPERATION_OUTPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_INPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_INFERENCE_USAGE_OUTPUT_TOKENS,
  METRIC_GEN_AI_CLIENT_OPERATION_DURATION,
  METRIC_GEN_AI_CLIENT_OPERATION_TIME_PER_OUTPUT_CHUNK,
  METRIC_GEN_AI_CLIENT_OPERATION_TIME_TO_FIRST_CHUNK,
  METRIC_GEN_AI_EXECUTE_TOOL_DURATION,
  METRIC_GEN_AI_INVOKE_AGENT_DURATION,
  METRIC_GEN_AI_INVOKE_AGENT_INFERENCE_CALLS,
  METRIC_GEN_AI_INVOKE_AGENT_TOOL_CALLS,
} from './semconv';
