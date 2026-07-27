// Public API surface for @querycat/textsplitter.
//
// Only splitIntoChunks is exposed. The lower-level splitByPunctuation and
// its helpers in ./textsplitter.js, plus the parse/process/merge helpers in
// ./mdsplitter.js, are implementation details and are intentionally NOT
// re-exported here.
import { splitIntoChunks } from './mdsplitter.js';

export { splitIntoChunks };
