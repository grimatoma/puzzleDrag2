import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function collectTestIds(source) {
  const ids = new Set();
  const re = /data-testid="([^"]+)"/g;
  let match;
  while ((match = re.exec(source)) !== null) ids.add(match[1]);
  return ids;
}

describe('board layout + tools modal invariants', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const boardPath = path.resolve(HERE, '..', 'ui', 'puzzleBoard.tsx');
  const source = fs.readFileSync(boardPath, 'utf8');
  const testIds = collectTestIds(source);

  it('keeps stable selectors used by CUJ + visual tests', () => {
    expect(testIds.has('puzzle-action-panel')).toBe(true);
    expect(testIds.has('puzzle-hotbar')).toBe(true);
    expect(testIds.has('puzzle-hotbar-open')).toBe(true);
    expect(testIds.has('puzzle-tool-modal')).toBe(true);
    expect(testIds.has('puzzle-tool-modal-backdrop')).toBe(true);
    expect(testIds.has('board-armed-border')).toBe(true);
  });

  it('renders a dedicated click-blocking backdrop element for the tools modal', () => {
    expect(source).toContain('data-testid="puzzle-tool-modal-backdrop"');
    expect(source).toContain('onClick={onClose}');
  });
});
