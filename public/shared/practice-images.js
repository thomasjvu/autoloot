// Locally bundled reference scans for the exact built-in practice listings.
// A reference scan is not evidence of ownership, condition or slab certification.
const scans = {
  'p1': ['Charizard ex · 151 #199/165', '199'],
  'p2': ['Pikachu · 151 #173/165', '173'],
  'p3': ['Pikachu · 151 #173 · PSA 10', '173'],
  'p4': ['Mew ex · 151 #205/165', '205'],
};
export function practiceImage(product) {
  const scan = scans[product.id];
  return product.practiceOnly && scan?.[0] === product.title ? `/demo/cards/sv3pt5-${scan[1]}.png` : null;
}
