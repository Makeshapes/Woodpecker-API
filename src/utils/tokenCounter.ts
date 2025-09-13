// Simple token estimation based on character count
// More accurate counting would require a proper tokenizer library
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  // This is a simplified approximation
  return Math.ceil(text.length / 4)
}

export interface ModelPricing {
  model: string
  displayName: string
  inputPricePerMillion: number // USD per million tokens
  outputPricePerMillion: number // USD per million tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-3-5-haiku-20241022': {
    model: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    inputPricePerMillion: 1.00, // $1.00 per million input tokens
    outputPricePerMillion: 5.00, // $5.00 per million output tokens
  },
  'claude-sonnet-4-20250514': {
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude 4 Sonnet',
    inputPricePerMillion: 3.00, // $3.00 per million input tokens
    outputPricePerMillion: 15.00, // $15.00 per million output tokens
  },
  'claude-opus-4-1-20250805': {
    model: 'claude-opus-4-1-20250805',
    displayName: 'Claude 4.1 Opus',
    inputPricePerMillion: 15.00, // $15.00 per million input tokens
    outputPricePerMillion: 75.00, // $75.00 per million output tokens
  },
}

export function calculatePrice(
  inputTokens: number,
  outputTokens: number,
  model: string
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    return { inputCost: 0, outputCost: 0, totalCost: 0 }
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion
  const totalCost = inputCost + outputCost

  return {
    inputCost,
    outputCost,
    totalCost,
  }
}

export function formatPrice(price: number): string {
  if (price < 0.01) {
    return `<$0.01`
  }
  return `$${price.toFixed(2)}`
}