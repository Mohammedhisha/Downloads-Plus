export interface ParsedFilename {
  title: string;
  tags: string[];
}

export function parseFilename(filename: string): ParsedFilename {
  const tags: string[] = [];

  // First pass: specific multi-word / special-char patterns (order matters — longer first)
  const specificRegex = /\b(hdr10\+|hdr10plus|hdr10|dolby[\s.\-]?vision|dv[\s.\-]?hdr|dts[\s.\-]?hd[\s.\-]?ma|dts[\s.\-]?x|dts[\s.\-]?hd|dts|truehd[\s.\-]?atmos|truehd|atmos|imax|remux|web[\s.\-]?dl|eng[\s.\-]?ac3)\b/ig;
  const specificMatches = filename.match(specificRegex);
  if (specificMatches) {
    const cleaned = specificMatches.map(m => m.toUpperCase().replace(/[\s.\-]+/g, '-'));
    const unique = Array.from(new Set(cleaned));
    tags.push(...unique);
  }

  // Second pass: simple single-word tags (skip 'hdr' if we already matched a specific HDR variant)
  const simpleRegex = /\b(720p|1080p|1440p|2160p|2600p|4k|8k|x264|h264|x265|h265|hevc|av1|vp9|webrip|bluray|bdrip|cam|hdr|hlg|dv|aac|ac3|flac|opus|eac3|10bit|sdr)\b/ig;
  const simpleMatches = filename.match(simpleRegex);
  if (simpleMatches) {
    const hasSpecificHdr = tags.some(t => t.startsWith('HDR10') || t.includes('DV-HDR'));
    const unique = Array.from(new Set(simpleMatches.map(m => m.toUpperCase())));
    for (const tag of unique) {
      if (tag === 'HDR' && hasSpecificHdr) continue;
      if (tag === 'DV' && tags.some(t => t.includes('DV'))) continue;
      if (!tags.includes(tag)) tags.push(tag);
    }
  }

  const extMatch = filename.match(/\.([a-z0-9]+)$/i);
  if (extMatch) {
    tags.push(extMatch[1].toLowerCase());
  }

  // Strip directory path — only show the file name
  const basename = filename.replace(/^.*[\\/]/, '');

  return { title: basename, tags };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
