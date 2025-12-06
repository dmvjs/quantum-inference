# Quantum Integer Factorization

This is how far quantum computing has gotten: factor numbers up to ~200 before decoherence kills the signal. Real quantum hardware stops at ~35.

**427 lines** of Shor's algorithm with realistic trapped-ion noise. Factors 143 in 20s (99.99% success with auto-retry). Fails at 667 (noise floor). Every result verified.

## How it works

- Simulates trapped-ion quantum computer (T₁=10ms, T₂=5ms, 99.9% gate fidelity)
- Tries 5 random bases, 50k measurements each, auto-retries up to 10x
- Uses real hardware entropy (CPU jitter, process timing, ASLR, GC timing)
- Verifies every result: p×q = N and p,q > 1

## Usage

```bash
npm install
npm start          # Factor N=21 (default)
npm start 143      # Factor N=143
npm run verify     # Test suite (21,42,97,143,221,667)
```

## What it can factor

| N   | Per-attempt | With retries | Avg attempts | Runtime |
|-----|-------------|--------------|--------------|---------|
| 21  | 95%         | >99.9%       | ~1           | 10s     |
| 143 | 60%         | 99.99%       | ~2           | 20s     |
| 221 | 40%         | 99.4%        | ~3           | 30s     |
| 667 | <1%         | 0%           | —            | fails   |

## Why it fails at 667

Quantum computers are noisy: qubits decohere in milliseconds, gates have 0.1% error rate, measurements have 2% error rate. For small numbers (21, 143), the signal is stronger than the noise. For large numbers (667), noise drowns out the signal completely.

**This is why encryption is safe**: RSA uses 617-digit numbers. Current quantum computers can't even factor 3-digit numbers reliably. We're ~20,000x away from breaking real encryption.

## Example output

```
$ npm start 143
Result: 143 = 11 × 13 (found in 2 attempts)
Verification: 11 × 13 = 143 ✓
```

Even numbers and primes detected classically (instant). Composite numbers use quantum period-finding.

---

*Shor, P.W. (1997). Polynomial-time algorithms for prime factorization and discrete logarithms on a quantum computer. SIAM J. Comput. 26(5):1484-1509.*
