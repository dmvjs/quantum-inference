export function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function modularExponentiation(base: number, exponent: number, modulus: number): number {
  let result = 1;
  base = base % modulus;

  while (exponent > 0) {
    if (exponent % 2 === 1) {
      result = (result * base) % modulus;
    }
    exponent = Math.floor(exponent / 2);
    base = (base * base) % modulus;
  }

  return result;
}

export function eulerTotient(n: number): number {
  let result = n;
  let p = 2;
  while (p * p <= n) {
    if (n % p === 0) {
      while (n % p === 0) n /= p;
      result -= result / p;
    }
    p++;
  }
  if (n > 1) result -= result / n;
  return Math.floor(result);
}

export function getDivisors(n: number): number[] {
  const divisors: number[] = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i) divisors.push(n / i);
    }
  }
  return divisors.sort((a, b) => a - b);
}
