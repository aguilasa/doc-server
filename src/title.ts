import * as fs from 'node:fs';
import * as path from 'node:path';

export function getTitleFromFile(filepath: string): string {
  let content: string;
  try {
    content = fs.readFileSync(filepath, 'utf-8');
  } catch {
    return filenameFallback(filepath);
  }

  // 1. Frontmatter title:
  const frontmatterMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim();
  }

  // 2. First # heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // 3. Fallback from filename
  return filenameFallback(filepath);
}

function filenameFallback(filepath: string): string {
  let name = path.basename(filepath, '.md');
  // Remove numeric prefix NN-
  name = name.replace(/^\d+-/, '');
  return name.replace(/[-_]/g, ' ');
}
