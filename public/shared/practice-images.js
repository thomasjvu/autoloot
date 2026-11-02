// Provider images are supplied by the live catalog API or by the seller.
// Retired bundled scans in saved practice snapshots fall back to original artwork.
export function productImage(product) {
  const image = product.image;
  return typeof image === 'string' && !image.startsWith('/demo/cards/') ? image : null;
}
