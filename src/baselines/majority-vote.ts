/**
 * MAJORITY VOTING BASELINE
 *
 * Classical error mitigation:
 * 1. Run quantum algorithm multiple times independently
 * 2. Take majority vote of results
 * 3. Confidence = fraction agreeing with majority
 *
 * Simple but effective for algorithms with discrete outputs.
 */

export interface MajorityVoteResult<T> {
  best: T | null;
  confidence: number;
  measurementsUsed: number;
  rounds: number;
  votes: Map<T, number>;
}

/**
 * Majority voting over multiple independent runs
 */
export function majorityVote<T>(
  runOnce: () => { result: T; measurements: number },
  rounds: number = 10
): MajorityVoteResult<T> {
  const votes = new Map<T, number>();
  let totalMeasurements = 0;

  for (let i = 0; i < rounds; i++) {
    const { result, measurements } = runOnce();
    votes.set(result, (votes.get(result) || 0) + 1);
    totalMeasurements += measurements;
  }

  let maxVotes = 0;
  let bestResult: T | null = null;

  for (const [result, count] of votes.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      bestResult = result;
    }
  }

  const confidence = maxVotes / rounds;

  return {
    best: bestResult,
    confidence,
    measurementsUsed: totalMeasurements,
    rounds,
    votes
  };
}

/**
 * Weighted majority voting (weight by confidence)
 */
export function weightedMajorityVote<T>(
  runOnce: () => { result: T; confidence: number; measurements: number },
  rounds: number = 10
): MajorityVoteResult<T> {
  const votes = new Map<T, number>();
  let totalWeight = 0;
  let totalMeasurements = 0;

  for (let i = 0; i < rounds; i++) {
    const { result, confidence, measurements } = runOnce();
    votes.set(result, (votes.get(result) || 0) + confidence);
    totalWeight += confidence;
    totalMeasurements += measurements;
  }

  let maxWeight = 0;
  let bestResult: T | null = null;

  for (const [result, weight] of votes.entries()) {
    if (weight > maxWeight) {
      maxWeight = weight;
      bestResult = result;
    }
  }

  const confidence = maxWeight / totalWeight;

  return {
    best: bestResult,
    confidence,
    measurementsUsed: totalMeasurements,
    rounds,
    votes
  };
}
