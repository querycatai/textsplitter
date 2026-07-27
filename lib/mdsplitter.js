// Lightweight Markdown chunker.
//
// Replaces the previous remark/mdast-based implementation with a line-based
// scanner that recognises the block structures we actually use (heading,
// paragraph, fenced code, GFM table, blockquote, list, thematic break,
// $$...$$ math block). Inline markdown (bold/italic/inline code/links/images)
// is stripped to plain text. This avoids the ~1.4s/MB AST parse cost while
// preserving the same observable behaviour.

import { splitByPunctuation } from './textsplitter.js';

// ---------------------------------------------------------------------------
// Inline text helpers
// ---------------------------------------------------------------------------

function normalizeText(value) {
    return String(value || '').replace(/\r\n/g, '\n').trim();
}

// Strip inline markdown markers (bold/italic/strike/inline-code/link/image/HTML)
// while preserving the inner content. Mirrors cleanFormatTags in textsplitter.js
// plus inline code, links and images which that file does not handle.
function cleanInlineMarkdown(text) {
    if (!text) return text;
    // Fast skip when no inline marker characters are present.
    if (text.indexOf('*') === -1 && text.indexOf('_') === -1 &&
        text.indexOf('~') === -1 && text.indexOf('<') === -1 &&
        text.indexOf('`') === -1 && text.indexOf('[') === -1) {
        return text;
    }
    text = text.replace(/`([^`]+)`/g, '$1');                       // inline code
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');            // images
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');             // links
    text = text
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')   // ***bold italic***
        .replace(/\*\*_(.+?)_\*\*/g, '$1')     // **_bold italic_**
        .replace(/__\*(.+?)\*__/g, '$1')        // __*bold italic*__
        .replace(/\*\*(.+?)\*\*/g, '$1')        // **bold**
        .replace(/__(.+?)__/g, '$1')            // __bold__
        .replace(/\*(.+?)\*/g, '$1')            // *italic*
        .replace(/_(.+?)_/g, '$1')              // _italic_
        .replace(/~~(.+?)~~/g, '$1');            // ~~strike~~
    text = text.replace(/<\/?(?:b|strong|i|em|u|mark|small|big|del|s|strike|ins|sub|sup|span|font|code)(?:\s+[^>]*)?>/gi, '');
    return text;
}

function pushSentenceChunks(chunks, blockIndex, text, maxLength) {
    splitByPunctuation(text, maxLength).forEach((chunk) => {
        const content = normalizeText(chunk);
        if (content) {
            chunks.push({ blockIndex, content });
        }
    });
}

// Split a code block into chunks no larger than maxLength.
function splitCodeBlock(codeContent, blockIndex, maxLength) {
    const chunks = [];
    const normalized = String(codeContent || '');

    if (normalized.length <= maxLength) {
        return normalized.trim() ? [{ blockIndex, content: normalized.trim() }] : [];
    }

    const lines = normalized.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        if (currentChunk && currentChunk.length + line.length + 1 > maxLength) {
            if (currentChunk.trim().length > maxLength) {
                let remaining = currentChunk.trim();
                while (remaining.length > maxLength) {
                    chunks.push({ blockIndex, content: remaining.substring(0, maxLength) });
                    remaining = remaining.substring(maxLength);
                }
                if (remaining.length > 0) {
                    chunks.push({ blockIndex, content: remaining });
                }
            } else {
                chunks.push({ blockIndex, content: currentChunk.trim() });
            }
            currentChunk = line;
        } else {
            currentChunk = currentChunk ? currentChunk + '\n' + line : line;
        }
    }

    if (currentChunk.trim() && currentChunk.length > maxLength) {
        let remaining = currentChunk.trim();
        while (remaining.length > maxLength) {
            chunks.push({ blockIndex, content: remaining.substring(0, maxLength) });
            remaining = remaining.substring(maxLength);
        }
        if (remaining.length > 0) {
            chunks.push({ blockIndex, content: remaining });
        }
    } else if (currentChunk.trim()) {
        chunks.push({ blockIndex, content: currentChunk.trim() });
    }

    return chunks;
}

// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------
// Returns an array of block descriptors:
//   { type: 'heading', level, text }
//   { type: 'paragraph', raw }
//   { type: 'code', value }
//   { type: 'table', rows }            // rows: string[][] (raw cells, not cleaned)
//   { type: 'blockquote', raw }        // raw: blockquote content without `>` prefix
//   { type: 'list', raw }              // raw: list lines with markers and indentation
//   { type: 'math', raw }
//   { type: 'thematicBreak' }
function parseMarkdownBlocks(text) {
    const blocks = [];
    const lines = String(text || '').split('\n');
    const n = lines.length;
    let i = 0;

    const isBlank = (l) => l.trim() === '';
    const isHeading = (l) => /^\s{0,3}#{1,6}\s/.test(l);
    const isHr = (l) => /^\s{0,3}([-*_])(?:\s*\1){2,}[\s]*$/.test(l);
    const isBlockquote = (l) => /^\s{0,3}>/.test(l);
    const isListItem = (l) => /^\s*([-*+]|\d+[.)])\s+/.test(l);
    const isFenceStart = (l) => /^\s{0,3}(```|~~~)/.test(l);
    const isTableSeparator = (l) =>
        /^\s*\|?[\s\-:|]+\|?\s*$/.test(l) && l.includes('-') && l.includes('|');

    while (i < n) {
        const line = lines[i];

        if (isBlank(line)) { i += 1; continue; }

        // Math block $$ ... $$
        if (line.trim() === '$$') {
            const start = i;
            i += 1;
            while (i < n && lines[i].trim() !== '$$') i += 1;
            const raw = lines.slice(start, Math.min(i + 1, n)).join('\n');
            blocks.push({ type: 'math', raw });
            i += 1;
            continue;
        }

        // ATX heading: # text
        if (isHeading(line)) {
            const m = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
            blocks.push({ type: 'heading', level: m[1].length, text: m[2] });
            i += 1;
            continue;
        }

        // Horizontal rule
        if (isHr(line)) {
            blocks.push({ type: 'thematicBreak' });
            i += 1;
            continue;
        }

        // Fenced code block
        if (isFenceStart(line)) {
            const fence = line.match(/^\s{0,3}(```|~~~)/)[1];
            const start = i + 1;
            i += 1;
            const fenceRe = new RegExp(`^\\s{0,3}${fence}`);
            while (i < n && !fenceRe.test(lines[i])) i += 1;
            const codeLines = lines.slice(start, i);
            if (i < n) i += 1; // consume closing fence
            blocks.push({ type: 'code', value: codeLines.join('\n') });
            continue;
        }

        // GFM table: header row + separator row + body rows
        if (line.includes('|') && i + 1 < n && isTableSeparator(lines[i + 1])) {
            const tableLines = [line, lines[i + 1]];
            i += 2;
            while (i < n && lines[i].includes('|') && !isBlank(lines[i])) {
                tableLines.push(lines[i]);
                i += 1;
            }
            blocks.push({ type: 'table', rows: tableLines.map(parseTableRow) });
            continue;
        }

        // Blockquote: consecutive `>`-prefixed lines
        if (isBlockquote(line)) {
            const quoteLines = [];
            while (i < n && isBlockquote(lines[i])) {
                quoteLines.push(lines[i].replace(/^\s{0,3}>?\s?/, ''));
                i += 1;
            }
            blocks.push({ type: 'blockquote', raw: quoteLines.join('\n') });
            continue;
        }

        // List: consecutive list-marker or indented continuation lines
        if (isListItem(line)) {
            const listLines = [];
            while (i < n) {
                const l = lines[i];
                if (isBlank(l)) {
                    // peek: if next non-blank is still indented or a marker, keep going
                    listLines.push(l);
                    i += 1;
                    continue;
                }
                if (isListItem(l) || /^\s+\S/.test(l)) {
                    listLines.push(l);
                    i += 1;
                    continue;
                }
                break;
            }
            // trim trailing blanks
            while (listLines.length > 0 && listLines[listLines.length - 1].trim() === '') {
                listLines.pop();
            }
            blocks.push({ type: 'list', raw: listLines.join('\n') });
            continue;
        }

        // Paragraph: collect until blank line or next block start
        const paraLines = [line];
        i += 1;
        while (i < n) {
            const l = lines[i];
            if (isBlank(l)) break;
            if (isHeading(l) || isFenceStart(l) || isHr(l) || isBlockquote(l) || isListItem(l)) break;
            if (l.trim() === '$$') break;
            if (l.includes('|') && i + 1 < n && isTableSeparator(lines[i + 1])) break;
            paraLines.push(l);
            i += 1;
        }
        blocks.push({ type: 'paragraph', raw: paraLines.join('\n') });
    }

    return blocks;
}

function parseTableRow(line) {
    // Strip leading/trailing pipes and split on `|`, trimming each cell.
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
}

// ---------------------------------------------------------------------------
// Block processors
// ---------------------------------------------------------------------------

function processHeading(block, blockIndex, chunks) {
    const content = normalizeText(cleanInlineMarkdown(block.text));
    if (content) chunks.push({ blockIndex, content });
}

function processParagraph(block, blockIndex, chunks, maxLength) {
    // Hard line breaks (trailing "  " or "\") act as sentence boundaries
    // inside a paragraph and must be processed per-line. When there are no
    // hard breaks, collapse newlines to spaces and do a single
    // splitByPunctuation call for the whole paragraph — this avoids the
    // per-line protect/restore pattern overhead which dominates on large
    // documents with many short paragraph lines.
    const hasHardBreak = / {2}$/m.test(block.raw) || /\\$/m.test(block.raw);

    if (!hasHardBreak) {
        const cleaned = cleanInlineMarkdown(block.raw.replace(/\n/g, ' '));
        const trimmed = normalizeText(cleaned);
        if (trimmed) {
            pushSentenceChunks(chunks, blockIndex, trimmed, maxLength);
        }
        return;
    }

    const lines = block.raw.split('\n');
    for (const line of lines) {
        const cleaned = cleanInlineMarkdown(line.replace(/\s\s$/, '').replace(/\\$/, ''));
        const trimmed = normalizeText(cleaned);
        if (trimmed) {
            pushSentenceChunks(chunks, blockIndex, trimmed, maxLength);
        }
    }
}

function processCode(block, blockIndex, chunks, maxLength) {
    // Push individually instead of spread (`chunks.push(...arr)`) to avoid
    // "Maximum call stack size exceeded" when a large code block produces
    // many chunks.
    const codeChunks = splitCodeBlock(block.value, blockIndex, maxLength);
    for (let k = 0; k < codeChunks.length; k += 1) {
        chunks.push(codeChunks[k]);
    }
}

function processMath(block, blockIndex, chunks) {
    const raw = normalizeText(block.raw);
    if (raw) chunks.push({ blockIndex, content: raw });
}

function processTable(block, blockIndex, chunks, maxLength) {
    const rows = block.rows;
    if (rows.length > 1) {
        const headers = rows[0];
        for (let r = 1; r < rows.length; r += 1) {
            const row = rows[r];
            for (let c = 0; c < row.length; c += 1) {
                const cell = normalizeText(cleanInlineMarkdown(row[c]));
                if (!cell) continue;
                const header = normalizeText(cleanInlineMarkdown(headers[c]));
                pushSentenceChunks(chunks, blockIndex, header ? `${header}: ${cell}` : cell, maxLength);
            }
        }
    } else {
        rows.forEach((row) => row.forEach((cell) => {
            const c = normalizeText(cleanInlineMarkdown(cell));
            if (c) pushSentenceChunks(chunks, blockIndex, c, maxLength);
        }));
    }
}

function processBlockquote(block, blockIndex, chunks, maxLength) {
    // Split into lines, treat each as a potential sentence boundary.
    const quoteLines = block.raw.split('\n').map((l) => normalizeText(cleanInlineMarkdown(l))).filter(Boolean);
    if (quoteLines.length === 0) return;

    // Mirror the original AST-based behaviour: if NONE of the lines end with
    // sentence punctuation, join them with newlines into a single chunk;
    // otherwise split each line via pushSentenceChunks.
    const allWithoutSentencePunctuation = quoteLines.every((line) => !/[.。!！?？;；]$/.test(line));
    if (allWithoutSentencePunctuation) {
        chunks.push({ blockIndex, content: quoteLines.join('\n') });
    } else {
        quoteLines.forEach((line) => pushSentenceChunks(chunks, blockIndex, line, maxLength));
    }
}

function processList(block, blockIndex, chunks, maxLength) {
    // Walk lines; a line starting with a list marker begins a new item,
    // continuation/indented lines belong to the previous item.
    const lines = block.raw.split('\n');
    const items = [];
    let currentItem = null;

    const flush = () => {
        if (currentItem !== null) {
            items.push(currentItem);
            currentItem = null;
        }
    };

    for (const line of lines) {
        const m = line.match(/^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/);
        if (m) {
            flush();
            currentItem = m[4];
        } else if (line.trim()) {
            currentItem = currentItem === null ? line.trim() : currentItem + ' ' + line.trim();
        } else {
            flush();
        }
    }
    flush();

    if (items.length === 0) return;

    // Batch all items into a single splitByPunctuation call using a sentinel
    // character (\u0001) as item separator. splitByPunctuation preserves the
    // sentinel (it isn't a punctuation/special-pattern character), then we
    // split each resulting sentence on the sentinel to recover item boundaries.
    // This collapses N items × N protect/restore passes into a single pass.
    const SEP = '\u0001';
    const cleanedItems = items
        .map((it) => normalizeText(cleanInlineMarkdown(it)))
        .filter(Boolean);
    if (cleanedItems.length === 0) return;

    const joined = cleanedItems.join(SEP);
    const sentences = splitByPunctuation(joined, maxLength);
    for (const sentence of sentences) {
        const pieces = sentence.split(SEP);
        for (const piece of pieces) {
            const trimmed = normalizeText(piece);
            if (trimmed) chunks.push({ blockIndex, content: trimmed });
        }
    }
}

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

// Intelligently merge chunks that were artificially split mid-sentence.
// A chunk ending without punctuation (ending with a letter, digit, or CJK
// character) is likely a fragment caused by PDF line-wrapping, soft-break
// splitting, or table cell extraction. Merge it with the next chunk using a
// space separator. Stops merging when the current chunk ends with punctuation
// or when combining would exceed maxLength.
function mergeIncompleteChunks(chunks, maxLength) {
    if (chunks.length <= 1) return chunks;

    const INCOMPLETE_END_RE = /[a-zA-Z0-9\u4e00-\u9fff]$/;

    const merged = [];
    let current = { ...chunks[0] };

    for (let i = 1; i < chunks.length; i += 1) {
        const next = chunks[i];
        if (INCOMPLETE_END_RE.test(current.content) &&
            current.content.length + 1 + next.content.length <= maxLength) {
            current = {
                blockIndex: current.blockIndex,
                content: current.content + ' ' + next.content,
            };
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);

    return merged;
}

// Greedy left-to-right merge: accumulate chunks into the current one until
// adding the next chunk would exceed maxLength, then commit and start a new
// one. O(n) and produces chunks packed towards maxLength (rather than always
// picking the globally smallest adjacent pair like the previous algorithm).
//
// `mergeThreshold` is preserved for API compatibility but its semantics are
// "minimum target length for a chunk": once the current chunk reaches
// mergeThreshold, we stop adding more chunks to it even if they would fit.
// This keeps individual chunks from growing too large when small fragments
// are densely packed. When mergeThreshold >= maxLength (the default),
// behaviour is "fill up to maxLength".
function mergeSequentially(chunks, maxLength, mergeThreshold) {
    if (chunks.length <= 1) return chunks;

    const target = Math.min(mergeThreshold, maxLength);
    const merged = [];
    let current = { ...chunks[0] };

    for (let i = 1; i < chunks.length; i += 1) {
        const next = chunks[i];
        const combined = current.content.length + 1 + next.content.length;
        if (combined <= maxLength && current.content.length < target) {
            current = {
                blockIndex: current.blockIndex,
                content: current.content + ' ' + next.content,
            };
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);

    return merged;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function splitIntoChunks(text, maxLength = 512, options = {}) {
    const { merge = true, mergeThreshold = maxLength } = options;
    const source = String(text || '');
    const trimmed = source.trim();
    if (!trimmed) {
        return [];
    }

    // Whole-document math block stays as one chunk.
    if (/^\$\$[\s\S]*\$\$$/.test(trimmed)) {
        return [{ blockIndex: 0, content: trimmed }];
    }

    const blocks = parseMarkdownBlocks(source);

    // Phase 1: walk blocks. Paragraphs (and per-line when hard breaks are
    // present) are collected into batchTexts for a single batched
    // splitByPunctuation call later — this avoids the per-paragraph
    // protect/restore pattern overhead which dominates on documents with
    // many short paragraphs. Other block types are processed directly.
    const chunks = [];
    const batchTexts = []; // [{ blockIndex, text }]
    let blockIndex = 0;

    for (const block of blocks) {
        switch (block.type) {
            case 'heading':
                processHeading(block, blockIndex, chunks);
                break;
            case 'paragraph': {
                const hasHardBreak = / {2}$/m.test(block.raw) || /\\$/m.test(block.raw);
                if (!hasHardBreak) {
                    const cleaned = cleanInlineMarkdown(block.raw.replace(/\n/g, ' '));
                    const t = normalizeText(cleaned);
                    if (t) batchTexts.push({ blockIndex, text: t });
                } else {
                    const lines = block.raw.split('\n');
                    for (const line of lines) {
                        const cleaned = cleanInlineMarkdown(line.replace(/\s\s$/, '').replace(/\\$/, ''));
                        const t = normalizeText(cleaned);
                        if (t) batchTexts.push({ blockIndex, text: t });
                    }
                }
                break;
            }
            case 'code':
                processCode(block, blockIndex, chunks, maxLength);
                break;
            case 'math':
                processMath(block, blockIndex, chunks);
                break;
            case 'table':
                processTable(block, blockIndex, chunks, maxLength);
                break;
            case 'blockquote':
                processBlockquote(block, blockIndex, chunks, maxLength);
                break;
            case 'list':
                processList(block, blockIndex, chunks, maxLength);
                break;
            case 'thematicBreak':
            default:
                break;
        }
        blockIndex += 1;
    }

    // Phase 2: batched splitByPunctuation for all paragraph texts.
    // Join with a sentinel character (\u0002 STX) that is not punctuation and
    // not matched by any protect pattern. After splitting, recover paragraph
    // boundaries by splitting each sentence on the sentinel.
    if (batchTexts.length > 0) {
        const SEP = '\u0002';
        const joined = batchTexts.map((b) => b.text).join(SEP);
        const sentences = splitByPunctuation(joined, maxLength);

        // Distribute sentences back to their blockIndex. When a sentence
        // contains the sentinel, each piece after the first belongs to the
        // next batched paragraph.
        const batched = [];
        let currentBatchIdx = 0;
        for (const sentence of sentences) {
            const pieces = sentence.split(SEP);
            for (let i = 0; i < pieces.length; i += 1) {
                if (i > 0) {
                    currentBatchIdx += 1;
                    if (currentBatchIdx >= batchTexts.length) break;
                }
                const piece = pieces[i].trim();
                if (piece) {
                    batched.push({ blockIndex: batchTexts[currentBatchIdx].blockIndex, content: piece });
                }
            }
        }

        // Merge batched chunks back into `chunks` preserving blockIndex order.
        // Both arrays are non-decreasing in blockIndex, so merge in one pass.
        if (batched.length > 0) {
            const merged = [];
            let i = 0;
            let j = 0;
            while (i < chunks.length || j < batched.length) {
                const bi = i < chunks.length ? chunks[i].blockIndex : Infinity;
                const bj = j < batched.length ? batched[j].blockIndex : Infinity;
                if (bi <= bj) {
                    merged.push(chunks[i]);
                    i += 1;
                } else {
                    merged.push(batched[j]);
                    j += 1;
                }
            }
            chunks.length = 0;
            // Push individually instead of spread (`chunks.push(...merged)`)
            // to avoid "Maximum call stack size exceeded" when the merged
            // array contains many thousands of chunks (large documents).
            for (let k = 0; k < merged.length; k += 1) {
                chunks.push(merged[k]);
            }
        }
    }

    // Phase 3: normalize, filter, merge.
    const normalized = chunks
        .map((chunk) => ({
            ...chunk,
            content: normalizeText(chunk.content),
        }))
        .filter((chunk) => chunk.content.length > 0);

    if (merge) {
        const merged = mergeIncompleteChunks(normalized, maxLength);
        return mergeSequentially(merged, maxLength, mergeThreshold);
    }
    return normalized;
}

export {
    splitIntoChunks,
    // Exports below are for internal profiling only.
    parseMarkdownBlocks,
    processHeading,
    processParagraph,
    processCode,
    processMath,
    processTable,
    processBlockquote,
    processList,
    mergeIncompleteChunks,
    mergeSequentially,
    normalizeText,
    cleanInlineMarkdown
};
