/** Opens YouTube search for form cues / demos. */
export function youtubeHowToSearchUrl(exerciseName: string): string {
  const q = `how to do ${exerciseName.trim()}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
