 import winkSentiment from 'wink-sentiment';

export async function analyzeSentiment(text) {
  const res = winkSentiment(text);
  let label = 'neutral';
  if (res.score > 1) label = 'positive';
  else if (res.score < -1) label = 'negative';
  return {
    label,
    score: res.normalizedScore, // -1..1
    raw: res
  };
}
