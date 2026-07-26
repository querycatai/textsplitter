import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { splitByPunctuation } from './textsplitter.js';

function normalizeText(value) {
    return String(value || '').replace(/\r\n/g, '\n').trim();
}

function collectInlineText(node) {
    if (!node) {
        return '';
    }

    if (typeof node.value === 'string' && !Array.isArray(node.children)) {
        return node.type === 'break' ? '\n' : node.value;
    }

    if (node.type === 'inlineCode') {
        return node.value || '';
    }

    if (node.type === 'image') {
        return node.alt || '';
    }

    const children = Array.isArray(node.children) ? node.children : [];
    return children.map((child) => collectInlineText(child)).join('');
}

function collectParagraphLines(node) {
    const lines = [];
    let current = '';
    const children = Array.isArray(node?.children) ? node.children : [];

    for (const child of children) {
        if (child.type === 'break') {
            const trimmed = normalizeText(current);
            if (trimmed) {
                lines.push(trimmed);
            }
            current = '';
            continue;
        }
        current += collectInlineText(child);
    }

    const trailing = normalizeText(current);
    if (trailing) {
        lines.push(trailing);
    }

    return lines;
}

function pushSentenceChunks(chunks, blockIndex, text, maxLength) {
    splitByPunctuation(text, maxLength).forEach((chunk) => {
        const content = normalizeText(chunk);
        if (content) {
            chunks.push({ blockIndex, content });
        }
    });
}

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

function processListItems(chunks, items, blockIndex, maxLength) {
    for (const item of items || []) {
        const children = Array.isArray(item.children) ? item.children : [];
        for (const child of children) {
            if (child.type === 'list') {
                processListItems(chunks, child.children, blockIndex, maxLength);
                continue;
            }

            if (child.type === 'paragraph') {
                collectParagraphLines(child).forEach((line) => pushSentenceChunks(chunks, blockIndex, line, maxLength));
                continue;
            }

            const content = normalizeText(collectInlineText(child));
            if (content) {
                pushSentenceChunks(chunks, blockIndex, content, maxLength);
            }
        }
    }
}

function collectQuoteLines(node) {
    const lines = [];
    for (const child of node.children || []) {
        if (child.type === 'paragraph') {
            lines.push(...collectParagraphLines(child));
            continue;
        }
        const content = normalizeText(collectInlineText(child));
        if (content) {
            lines.push(content);
        }
    }
    return lines;
}

// Intelligently merge chunks that were artificially split mid-sentence.
// A chunk ending without punctuation (ending with a letter, digit, or CJK
// character) is likely a fragment caused by PDF line-wrapping, soft-break
// splitting, or table cell extraction. Merge it with the next chunk using a
// space separator. Stops merging when the current chunk ends with punctuation
// or when combining would exceed maxLength.
function mergeIncompleteChunks(chunks, maxLength) {
    if (chunks.length <= 1) return chunks;

    // Matches chunks whose last character is a letter, digit, or CJK character
    // — i.e. NOT ending with punctuation, indicating an incomplete fragment.
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

// Greedily merge the smallest adjacent pair until the smallest pair's combined
// length exceeds the threshold. Each iteration finds the adjacent pair with
// the minimum combined length (using space separator) and merges them.
// This eliminates tiny fragments that survived mergeIncompleteChunks but are
// too small to stand alone (e.g. table cells, short labels).
function mergeShortestPairs(chunks, threshold, maxLength) {
    if (chunks.length <= 1) return chunks;

    const result = chunks.map((c) => ({ ...c }));

    while (result.length > 1) {
        // Find the adjacent pair with the smallest combined length
        let minIdx = -1;
        let minLen = Infinity;
        for (let i = 0; i < result.length - 1; i += 1) {
            const combined = result[i].content.length + 1 + result[i + 1].content.length;
            if (combined <= maxLength && combined < minLen) {
                minLen = combined;
                minIdx = i;
            }
        }

        // Stop when the smallest pair exceeds the threshold or no valid pair
        if (minIdx === -1 || minLen > threshold) break;

        // Merge the pair with space separator
        result[minIdx] = {
            blockIndex: result[minIdx].blockIndex,
            content: result[minIdx].content + ' ' + result[minIdx + 1].content,
        };
        result.splice(minIdx + 1, 1);
    }

    return result;
}

function splitIntoChunks(text, maxLength = 512, options = {}) {
    const { merge = true, mergeThreshold = maxLength } = options;
    const source = String(text || '');
    const trimmed = source.trim();
    if (!trimmed) {
        return [];
    }

    if (/^\$\$[\s\S]*\$\$$/.test(trimmed)) {
        return [{ blockIndex: 0, content: trimmed }];
    }

    const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
    const chunks = [];
    let blockIndex = 0;

    for (const node of tree.children || []) {
        switch (node.type) {
            case 'heading': {
                const content = normalizeText(collectInlineText(node));
                if (content) {
                    chunks.push({ blockIndex, content });
                }
                break;
            }
            case 'paragraph': {
                collectParagraphLines(node).forEach((line) => pushSentenceChunks(chunks, blockIndex, line, maxLength));
                break;
            }
            case 'blockquote': {
                const quoteLines = collectQuoteLines(node);
                if (quoteLines.length > 0) {
                    const allWithoutSentencePunctuation = quoteLines.every((line) => !/[.。!！?？;；]$/.test(line));
                    if (allWithoutSentencePunctuation) {
                        chunks.push({ blockIndex, content: quoteLines.join('\n') });
                    } else {
                        quoteLines.forEach((line) => pushSentenceChunks(chunks, blockIndex, line, maxLength));
                    }
                }
                break;
            }
            case 'list':
                processListItems(chunks, node.children, blockIndex, maxLength);
                break;
            case 'table': {
                const rows = (node.children || []).map((row) => (row.children || []).map((cell) => normalizeText(collectInlineText(cell))));
                if (rows.length > 1) {
                    const headers = rows[0];
                    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
                        const row = rows[rowIndex];
                        for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
                            const cell = normalizeText(row[columnIndex]);
                            if (!cell) continue;
                            const header = normalizeText(headers[columnIndex]);
                            pushSentenceChunks(chunks, blockIndex, header ? `${header}: ${cell}` : cell, maxLength);
                        }
                    }
                } else {
                    rows.forEach((row) => row.forEach((cell) => cell && pushSentenceChunks(chunks, blockIndex, cell, maxLength)));
                }
                break;
            }
            case 'code':
                chunks.push(...splitCodeBlock(node.value || '', blockIndex, maxLength));
                break;
            case 'thematicBreak':
                break;
            default: {
                const content = normalizeText(collectInlineText(node));
                if (content) {
                    pushSentenceChunks(chunks, blockIndex, content, maxLength);
                }
                break;
            }
        }
        blockIndex += 1;
    }

    const normalized = chunks
        .map((chunk) => ({
            ...chunk,
            content: normalizeText(chunk.content),
        }))
        .filter((chunk) => chunk.content.length > 0);

    if (merge) {
        const merged = mergeIncompleteChunks(normalized, maxLength);
        return mergeShortestPairs(merged, mergeThreshold, maxLength);
    }
    return normalized;
}

export {
    splitIntoChunks
};
