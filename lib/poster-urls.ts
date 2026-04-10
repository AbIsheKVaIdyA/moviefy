/**
 * AI-generated–style cinematic posters via Pollinations (raster PNG/JPEG).
 * Stable `seed` keeps the same look across reloads; prompts stay short for URL limits.
 */
export function aiMoviePosterUrl(seed: number, prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=500&height=750&nologo=true&seed=${seed}`;
}
