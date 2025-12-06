function getDivisors(n) {
  const divs = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) divs.push(i);
  }
  return divs;
}

const phi = 156;
const divisors = getDivisors(phi);
console.log("φ(237) = " + phi);
console.log("Divisors: " + divisors.join(', '));
console.log("Divisors ≤ 200: " + divisors.filter(d => d <= 200).join(', '));
console.log("\n13 is a divisor: " + divisors.includes(13));
console.log("26 is a divisor: " + divisors.includes(26));
