export function destinationSigningSecretKey(id: string): string {
  const cacheKey = `dest_secret:${id}`;
  return cacheKey;
}
