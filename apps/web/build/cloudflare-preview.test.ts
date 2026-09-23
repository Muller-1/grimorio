import { describe, expect, it } from 'vitest';
import { htmlCandidates } from './cloudflare-preview';

describe('htmlCandidates', () => {
  it('segue a Cloudflare Pages: /dados → dados.html', () => {
    expect(htmlCandidates('/')).toEqual(['index.html']);
    expect(htmlCandidates('/dados')).toEqual(['dados.html', 'dados/index.html']);
    expect(htmlCandidates('/dados/')).toEqual(['dados.html', 'dados/index.html']);
  });
});
