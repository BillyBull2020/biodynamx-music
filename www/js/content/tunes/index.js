/**
 * The bulk public-domain catalogue.
 *
 * Everything here is a tune people already know, which is the point: a practice
 * app is only as useful as the songs you actually want to play. Copyrighted
 * popular music is deliberately absent — see docs/REA-FINDINGS.md for why.
 */

import { CLASSICAL, CAROLS } from './classical.js';
import { FOLK } from './folk.js';
import { KIDS, HYMNS, BLUES } from './kids-blues.js';

export const TUNES = [...CLASSICAL, ...CAROLS, ...FOLK, ...KIDS, ...HYMNS, ...BLUES];

/** Category labels for the Songs filters. */
export const TUNE_CATEGORIES = {
  classical: 'Classical',
  carol: 'Christmas',
  folk: 'Folk',
  world: 'World',
  spiritual: 'Spirituals',
  kids: 'Kids & nursery',
  hymn: 'Hymns',
  blues: 'Blues',
  ragtime: 'Ragtime',
};
