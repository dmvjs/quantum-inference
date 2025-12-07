/**
 * GENERALIZED QUANTUM INFERENCE FRAMEWORK
 *
 * Core insight: Statistical pattern extraction from noisy quantum measurements
 * using structured Bayesian inference with adaptive noise models.
 *
 * Key principles:
 * 1. Structured hypothesis spaces (not uniform - use problem constraints)
 * 2. Progressive measurement with early stopping
 * 3. Multi-method consensus (Bayesian + frequency analysis)
 * 4. Adaptive noise modeling based on problem structure
 *
 * This framework should work across ALL quantum algorithms.
 */

export interface QuantumMeasurement {
  /** The measured quantum state (integer representation) */
  value: number;

  /** Number of times this state was observed */
  count: number;

  /** Optional: when measurement occurred (for coherence tracking) */
  timestamp?: number;

  /** Optional: which measurement batch this came from */
  batch?: number;
}

export interface NoiseModel {
  /** Base measurement error rate (0-1, e.g., 0.85 = 85% error) */
  errorRate: number;

  /** Quantum coherence time (microseconds) */
  coherenceTime: number;

  /** Gate error rate per operation */
  gateErrorRate?: number;

  /** Problem-specific noise scaling (how noise grows with problem size) */
  noiseScaling?: (problemSize: number) => number;
}

export interface HypothesisStructure<T> {
  /** The candidate answer we're testing */
  candidate: T;

  /** Prior probability (based on problem structure, not uniform) */
  prior: number;

  /** How well this hypothesis explains a measurement */
  likelihood: (measurement: QuantumMeasurement, noise: NoiseModel) => number;

  /** Check if this hypothesis is physically/mathematically valid */
  validate: () => boolean;

  /** Optional: Expected measurement distribution for this hypothesis */
  expectedDistribution?: () => Map<number, number>;

  /** Optional: Problem-specific metadata for adaptive strategies */
  metadata?: Record<string, any>;
}

export interface InferenceResult<T> {
  /** Best hypothesis (maximum posterior probability) */
  best: T;

  /** Confidence in this answer (0-1) */
  confidence: number;

  /** Shannon entropy of posterior (lower = more certain) */
  entropy: number;

  /** Full posterior distribution over all hypotheses */
  posterior: Map<T, number>;

  /** How many measurements were used */
  measurementsUsed: number;

  /** Whether early stopping was triggered */
  earlyStop: boolean;

  /** Consensus score (agreement between different methods) */
  consensus?: number;
}

export interface ProgressiveInferenceConfig {
  /** Measurements per batch for progressive testing */
  batchSize: number;

  /** Minimum batches before allowing early stop */
  minBatches: number;

  /** Confidence threshold for early stopping */
  earlyStopConfidence: number;

  /** Entropy threshold for early stopping (lower = more certain) */
  earlyStopEntropy: number;

  /** Whether to use adaptive thresholds based on problem structure */
  adaptiveThresholds: boolean;
}

/**
 * Core framework: Bayesian inference over structured hypothesis spaces
 * with progressive measurement and noise adaptation.
 */
export class BayesianQuantumInference<T> {
  private config: ProgressiveInferenceConfig;

  constructor(config?: Partial<ProgressiveInferenceConfig>) {
    this.config = {
      batchSize: config?.batchSize ?? 500,        // Much smaller batches (was 5000)
      minBatches: config?.minBatches ?? 3,        // Slightly more to stabilize (was 2)
      earlyStopConfidence: config?.earlyStopConfidence ?? 0.65,  // More aggressive (was 0.8)
      earlyStopEntropy: config?.earlyStopEntropy ?? 3.0,         // More lenient (was 2.0)
      adaptiveThresholds: config?.adaptiveThresholds ?? true
    };
  }

  /**
   * PROGRESSIVE INFERENCE: Process measurements in batches, stop early if confident
   */
  inferProgressive(
    measurementStream: QuantumMeasurement[][],  // Batches of measurements
    hypotheses: HypothesisStructure<T>[],
    noise: NoiseModel
  ): InferenceResult<T> {
    let allMeasurements: QuantumMeasurement[] = [];
    let batchIndex = 0;
    let earlyStop = false;

    // Initialize posterior with priors
    const posterior = new Map<T, number>();
    for (const h of hypotheses) {
      posterior.set(h.candidate, h.prior);
    }

    // Normalize
    this.normalizePosterior(posterior);

    for (const batch of measurementStream) {
      batchIndex++;
      allMeasurements = allMeasurements.concat(batch);

      // Bayesian update with this batch
      this.updatePosterior(posterior, batch, hypotheses, noise);

      // Check for early stopping after minimum batches
      if (batchIndex >= this.config.minBatches) {
        const currentResult = this.extractResult(
          posterior,
          hypotheses,
          allMeasurements.length,
          false
        );

        // Adaptive thresholds based on problem structure
        let confThreshold = this.config.earlyStopConfidence;
        let entropyThreshold = this.config.earlyStopEntropy;

        if (this.config.adaptiveThresholds) {
          const avgMetadata = this.computeAverageMetadata(hypotheses);
          confThreshold = this.adaptConfidenceThreshold(avgMetadata);
          entropyThreshold = this.adaptEntropyThreshold(avgMetadata);
        }

        if (
          currentResult.confidence > confThreshold &&
          currentResult.entropy < entropyThreshold
        ) {
          earlyStop = true;
          break;
        }
      }
    }

    return this.extractResult(posterior, hypotheses, allMeasurements.length, earlyStop);
  }

  /**
   * STANDARD INFERENCE: Process all measurements at once
   */
  infer(
    measurements: QuantumMeasurement[],
    hypotheses: HypothesisStructure<T>[],
    noise: NoiseModel
  ): InferenceResult<T> {
    const posterior = new Map<T, number>();
    for (const h of hypotheses) {
      posterior.set(h.candidate, h.prior);
    }
    this.normalizePosterior(posterior);

    this.updatePosterior(posterior, measurements, hypotheses, noise);

    const totalMeasurements = measurements.reduce((sum, m) => sum + m.count, 0);
    return this.extractResult(posterior, hypotheses, totalMeasurements, false);
  }

  /**
   * MULTI-METHOD CONSENSUS: Combine Bayesian with frequency analysis
   */
  inferWithConsensus(
    measurements: QuantumMeasurement[],
    hypotheses: HypothesisStructure<T>[],
    noise: NoiseModel
  ): InferenceResult<T> {
    // Method 1: Bayesian inference
    const bayesianPosterior = new Map<T, number>();
    for (const h of hypotheses) {
      bayesianPosterior.set(h.candidate, h.prior);
    }
    this.normalizePosterior(bayesianPosterior);
    this.updatePosterior(bayesianPosterior, measurements, hypotheses, noise);

    // Method 2: Direct frequency analysis (model-free)
    const frequencyScores = this.frequencyAnalysis(measurements, hypotheses);

    // Method 3: Pattern recurrence analysis
    const recurrenceScores = this.recurrenceAnalysis(measurements, hypotheses);

    // Combine methods with weighted voting
    const consensus = new Map<T, number>();
    const weights = { bayesian: 0.6, frequency: 0.25, recurrence: 0.15 };

    for (const h of hypotheses) {
      const candidate = h.candidate;
      const bayesScore = bayesianPosterior.get(candidate) || 0;
      const freqScore = frequencyScores.get(candidate) || 0;
      const recurScore = recurrenceScores.get(candidate) || 0;

      consensus.set(
        candidate,
        weights.bayesian * bayesScore +
        weights.frequency * freqScore +
        weights.recurrence * recurScore
      );
    }

    this.normalizePosterior(consensus);

    const totalMeasurements = measurements.reduce((sum, m) => sum + m.count, 0);
    const result = this.extractResult(consensus, hypotheses, totalMeasurements, false);

    // Compute consensus score (agreement between methods)
    const topBayesian = this.getTopCandidate(bayesianPosterior);
    const topFrequency = this.getTopCandidate(frequencyScores);
    const topRecurrence = this.getTopCandidate(recurrenceScores);

    let agreementCount = 0;
    if (topBayesian === result.best) agreementCount++;
    if (topFrequency === result.best) agreementCount++;
    if (topRecurrence === result.best) agreementCount++;

    result.consensus = agreementCount / 3;

    return result;
  }

  /**
   * Bayesian update: P(hypothesis|data) ∝ P(data|hypothesis) * P(hypothesis)
   */
  private updatePosterior(
    posterior: Map<T, number>,
    measurements: QuantumMeasurement[],
    hypotheses: HypothesisStructure<T>[],
    noise: NoiseModel
  ): void {
    const totalMeasurements = measurements.reduce((sum, m) => sum + m.count, 0);

    for (const measurement of measurements) {
      const weight = measurement.count / totalMeasurements;

      for (const h of hypotheses) {
        const likelihood = h.likelihood(measurement, noise);
        const prior = posterior.get(h.candidate) || 0;

        // Weighted update (stronger weight for frequent measurements)
        const updateStrength = likelihood * weight;
        posterior.set(h.candidate, prior * (1 + updateStrength * 10));
      }
    }

    this.normalizePosterior(posterior);
  }

  /**
   * Frequency analysis: Direct pattern matching without Bayesian framework
   */
  private frequencyAnalysis(
    measurements: QuantumMeasurement[],
    hypotheses: HypothesisStructure<T>[]
  ): Map<T, number> {
    const scores = new Map<T, number>();

    for (const h of hypotheses) {
      if (!h.expectedDistribution) {
        scores.set(h.candidate, 0);
        continue;
      }

      const expected = h.expectedDistribution();
      let score = 0;

      // Compare observed vs expected distributions
      for (const m of measurements) {
        const expectedCount = expected.get(m.value) || 0;
        const observedCount = m.count;

        // Correlation between expected and observed
        score += Math.sqrt(expectedCount * observedCount);
      }

      scores.set(h.candidate, score);
    }

    this.normalizePosterior(scores);
    return scores;
  }

  /**
   * Recurrence analysis: Find recurring patterns in measurement sequence
   */
  private recurrenceAnalysis(
    measurements: QuantumMeasurement[],
    hypotheses: HypothesisStructure<T>[]
  ): Map<T, number> {
    const scores = new Map<T, number>();

    // Build value sequence
    const sequence: number[] = [];
    for (const m of measurements) {
      for (let i = 0; i < Math.min(m.count, 50); i++) {
        sequence.push(m.value);
      }
    }

    // Compute recurrence intervals
    const recurrences = new Map<number, number>();
    for (let i = 0; i < sequence.length; i++) {
      for (let j = i + 1; j < Math.min(i + 500, sequence.length); j++) {
        if (Math.abs(sequence[i] - sequence[j]) < 3) {
          const gap = j - i;
          recurrences.set(gap, (recurrences.get(gap) || 0) + 1);
        }
      }
    }

    // Score hypotheses based on recurrence patterns
    for (const h of hypotheses) {
      // This is problem-specific - subclasses can override
      scores.set(h.candidate, 0);
    }

    return scores;
  }

  private normalizePosterior(posterior: Map<T, number>): void {
    const total = Array.from(posterior.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    for (const [candidate, prob] of posterior.entries()) {
      posterior.set(candidate, prob / total);
    }
  }

  private extractResult(
    posterior: Map<T, number>,
    hypotheses: HypothesisStructure<T>[],
    measurementCount: number,
    earlyStop: boolean
  ): InferenceResult<T> {
    // Find best candidate
    let best: T | null = null;
    let maxProb = 0;

    for (const [candidate, prob] of posterior.entries()) {
      // Only consider valid hypotheses
      const h = hypotheses.find(x => x.candidate === candidate);
      if (h && h.validate() && prob > maxProb) {
        maxProb = prob;
        best = candidate;
      }
    }

    // Compute Shannon entropy
    let entropy = 0;
    for (const prob of posterior.values()) {
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    }

    return {
      best: best!,
      confidence: maxProb,
      entropy,
      posterior,
      measurementsUsed: measurementCount,
      earlyStop
    };
  }

  private getTopCandidate(distribution: Map<T, number>): T | null {
    let best: T | null = null;
    let maxProb = 0;

    for (const [candidate, prob] of distribution.entries()) {
      if (prob > maxProb) {
        maxProb = prob;
        best = candidate;
      }
    }

    return best;
  }

  private computeAverageMetadata(hypotheses: HypothesisStructure<T>[]): Record<string, number> {
    const metadata: Record<string, number> = {};

    for (const h of hypotheses) {
      if (h.metadata) {
        for (const [key, value] of Object.entries(h.metadata)) {
          if (typeof value === 'number') {
            metadata[key] = (metadata[key] || 0) + value;
          }
        }
      }
    }

    // Average
    for (const key of Object.keys(metadata)) {
      metadata[key] /= hypotheses.length;
    }

    return metadata;
  }

  private adaptConfidenceThreshold(metadata: Record<string, number>): number {
    // Adapt based on problem structure
    const complexity = metadata.complexity || 1.0;
    const richness = metadata.richness || 1.0;

    // Higher complexity → lower threshold (be more lenient)
    // Higher richness → can demand higher threshold
    // OPTIMIZED: Start lower (0.6 instead of 0.8) for faster stopping
    return Math.max(0.45, Math.min(0.85, 0.6 - complexity * 0.08 + richness * 0.04));
  }

  private adaptEntropyThreshold(metadata: Record<string, number>): number {
    const complexity = metadata.complexity || 1.0;

    // Higher complexity → allow more entropy
    // OPTIMIZED: Allow more entropy (3.5 instead of 2.0) for faster stopping
    return Math.max(2.0, Math.min(6.0, 3.5 + complexity * 0.4));
  }
}

/**
 * Helper: Create structured priors from problem constraints
 */
export function structuredPrior<T>(
  candidates: T[],
  scoreFunction: (candidate: T) => number
): Map<T, number> {
  const scores = new Map<T, number>();

  for (const c of candidates) {
    scores.set(c, scoreFunction(c));
  }

  // Normalize to probabilities
  const total = Array.from(scores.values()).reduce((a, b) => a + b, 0);
  for (const [c, score] of scores.entries()) {
    scores.set(c, score / total);
  }

  return scores;
}
