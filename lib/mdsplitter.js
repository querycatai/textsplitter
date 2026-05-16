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

function splitIntoChunks(text, maxLength = 512) {
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

    return chunks
        .map((chunk) => ({
            ...chunk,
            content: normalizeText(chunk.content),
        }))
        .filter((chunk) => chunk.content.length > 0);
}

export {
    splitIntoChunks
};
