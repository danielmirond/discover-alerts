export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Dice coefficient on character bigrams for fuzzy matching
export function diceCoefficient(a: string, b: string): number {
  const aN = normalize(a);
  const bN = normalize(b);

  if (aN === bN) return 1;
  if (aN.length < 2 || bN.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < aN.length - 1; i++) bigramsA.add(aN.slice(i, i + 2));

  let intersection = 0;
  const bigramsBSize = bN.length - 1;
  for (let i = 0; i < bN.length - 1; i++) {
    if (bigramsA.has(bN.slice(i, i + 2))) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsBSize);
}
