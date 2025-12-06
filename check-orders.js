// Check multiplicative orders for failing numbers

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function modPow(base, exp, mod) {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}

function findOrder(a, N) {
  if (gcd(a, N) !== 1) return null;
  for (let r = 1; r <= 200; r++) {
    if (modPow(a, r, N) === 1) return r;
  }
  return ">200";
}

const failing = [
  { N: 177, factors: [3, 59], phi: 116 },
  { N: 237, factors: [3, 79], phi: 156 },
  { N: 335, factors: [5, 67], phi: 264 }
];

for (const { N, factors, phi } of failing) {
  console.log(`\n${N} = ${factors[0]}×${factors[1]}, φ=${phi}`);
  console.log("Orders of smooth bases:");
  
  const bases = [2,3,4,5,6,7,8,9,10,12,14,15,16,18,20,21,24,25,27,28,30,32,35,36,40,42,45,48,49];
  for (const a of bases) {
    if (gcd(a, N) === 1) {
      const order = findOrder(a, N);
      console.log(`  a=${a}: order=${order}`);
    }
  }
}
