import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { normalizeProviderBaseUrl } from '../utils';

describe('normalizeProviderBaseUrl', () => {
  test('keeps openai-compatible root bases unchanged', () => {
    assert.equal(
      normalizeProviderBaseUrl('https://api.openai.com/', 'openai_compatible'),
      'https://api.openai.com',
    );
  });

  test('adds /v1 for anthropic root bases', () => {
    assert.equal(
      normalizeProviderBaseUrl('https://api.b.ai', 'anthropic'),
      'https://api.b.ai/v1',
    );
  });

  test('adds /v1 after custom anthropic base paths', () => {
    assert.equal(
      normalizeProviderBaseUrl('https://taotoken.net/api/', 'anthropic'),
      'https://taotoken.net/api/v1',
    );
  });

  test('does not duplicate anthropic /v1 suffixes', () => {
    assert.equal(
      normalizeProviderBaseUrl('https://api.anthropic.com/v1/', 'anthropic'),
      'https://api.anthropic.com/v1',
    );
  });
});