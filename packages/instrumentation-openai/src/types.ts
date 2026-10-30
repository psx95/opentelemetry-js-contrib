/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContentCaptureMode } from '@opentelemetry/genai-util';
import type { InstrumentationConfig } from '@opentelemetry/instrumentation';

export interface OpenAIInstrumentationConfig extends InstrumentationConfig {
  /**
   * Controls capturing of prompt, completion, and tool call contents.
   *
   * - `'none'` (or `false`): no message content is captured (default).
   * - `'span_only'` (or `true`): message content is captured as JSON-serialized
   *   span attributes (`gen_ai.input.messages`, `gen_ai.output.messages`,
   *   `gen_ai.system_instructions`).
   *
   * Boolean values (`true` / `false`) are accepted for backwards compatibility.
   * Can also be configured via the
   * `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` environment variable.
   */
  captureMessageContent?: ContentCaptureMode | boolean;
}
