export function getImageUrl(image) {
  if (typeof image !== "string" || !image.trim()) return "/logo.png";

  const source = image.trim();
  if (/^https?:\/\//i.test(source) || source.startsWith("/")) return source;
  return source;
}
