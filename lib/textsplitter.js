// Functions for splitting text into semantic chunks

// Pre-compiled regex for splitting long sentences by commas/newlines (module scope)
const COMMA_SPLIT_RE = /([,，\n])/;

// Split long sentence by conjunctions and commas
function splitLongSentence(sentence, maxLength) {
    if (sentence.length <= maxLength) return [sentence];

    // Split by punctuation
    const parts = sentence.split(COMMA_SPLIT_RE);
    
    // Reconstruct parts with punctuation
    let segments = [];
    for (let i = 0; i < parts.length; i += 2) {
        const current = parts[i];
        const punctuation = parts[i + 1] || '';
        if (current.trim()) {
            segments.push(current.trim() + punctuation);
        }
    }

    // If no valid splits found, force split by maxLength
    if (segments.length <= 1) {
        // Force split long text without punctuation
        const forceSplits = [];
        let remaining = sentence;
        while (remaining.length > maxLength) {
            // Try to find a good break point (space, or other characters)
            let breakPoint = maxLength;
            
            // Look for a space within the last 50 characters to avoid breaking words
            for (let i = maxLength - 50; i < maxLength && i < remaining.length; i++) {
                if (/\s/.test(remaining[i])) {
                    breakPoint = i + 1; // Include the space in the current chunk
                    break;
                }
            }
            
            // If no space found, try other reasonable break points (after punctuation, numbers, etc.)
            if (breakPoint === maxLength) {
                for (let i = maxLength - 20; i < maxLength && i < remaining.length; i++) {
                    if (/[;}\])>]/.test(remaining[i])) {
                        breakPoint = i + 1;
                        break;
                    }
                }
            }
            
            forceSplits.push(remaining.substring(0, breakPoint).trim());
            remaining = remaining.substring(breakPoint);
        }
        
        // Add remaining text
        if (remaining.trim()) {
            forceSplits.push(remaining.trim());
        }
        
        return forceSplits;
    }

    // Merge segments: greedily accumulate left-to-right until adding the next
    // segment would exceed maxLength, then commit the current chunk.
    // O(n) instead of the previous O(n²) "find shortest pair + splice" loop.
    const merged = [];
    let current = segments[0];
    for (let i = 1; i < segments.length; i++) {
        if (current.length + segments[i].length <= maxLength) {
            current += segments[i];
        } else {
            merged.push(current);
            current = segments[i];
        }
    }
    merged.push(current);
    segments = merged;

    return segments;
}

// Check if text contains only punctuation and whitespace
function isOnlyPunctuation(text) {
    // Include both English and Chinese punctuation
    const allPunctuationRegex = /^[\s\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A1-\u00BF\u2000-\u206F\u3000-\u303F\uFF00-\uFFEF]+$/;
    return allPunctuationRegex.test(text);
}

// Protect special patterns from being split
function protectSpecialPatterns(text) {
    const patterns = {
        // Single author name pattern, matches various name formats:
        // - Smith, J. R.
        // - Smith, John R.
        // - Smith, J. R., Jr.
        // - Smith, J. R., 3rd
        academic: /([A-Z][a-z]+,\s*([A-Z]\.\s*)+)|([A-Z]\.\s*([a-z]\.\s*)+[a-z]+)|(\s+et\s+al\.)|([\s\(](pp|ch|spp)\.)|([\(（]\s*[\d-]+(\s*[,，]\s*[\d-]+)+\s*[\)）])/g,
        // DOI identifier
        doi: /doi:\s*10\.\d{4,}\/[-._;()\/:A-Z0-9]+/gi,
        // Ratio expressions - simplified to match letter/character ratios and number ratios separately
        // Examples: "A:B:C", "1:2:3", "水:油", "1.5:2.5"
        ratioExpressions: /(?:[A-Za-z]+(?:\s*[：:]\s*[A-Za-z]+)+|\d+(\.\d+)?(?:\s*[：:]\s*\d+(\.\d+)?)+)/g,
        // Abbreviation followed by period and number (e.g. Pt.5, Ch.1, Sec.7, Reg.25, MSC.277, Fig.3)
        // The period here is an abbreviation separator, not a sentence end.
        // Matches two abbreviation styles:
        //   - Capitalized: Pt, Ch, Sec, Reg, Fig, No (Cap + 1-4 lowercase)
        //   - All-caps acronyms: MSC, MEPC, IGC (2-5 uppercase)
        // Excludes single-letter list markers (A.1, B.2) by requiring >=2 chars.
        // Allows optional whitespace (incl. newline) between period and digit for PDF-converted text.
        // Includes trailing hierarchical numbers (e.g. Ch.17.22.1) to prevent mid-reference splits.
        abbrWithNumber: /\b(?:[A-Z][a-z]{1,4}|[A-Z]{2,5})\.\s*\d+(?:\.\d+)*/g,
        rangeExpressions: /\d+(\.\d+)?\s*[-~]\s*\d+(\.\d+)?/g,
        // Organization acronyms with dots (e.g. U.S.A., N.A.S.A., C.I.A.)
        organizationAcronyms: /(?:[A-Z]\.(?:[A-Z]\.)+[A-Z]\.?|[A-Z]\.(?:[A-Z]\.)+)/g,
        // Scientific names with abbreviated genus (e.g. M. tuberculosis)
        scientificNames: /(?:[A-Z]\.\s+[a-z]+(?:\s+[A-Za-z0-9-]+)?)/g,
        htmlEncoded: /&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g,
        // Quoted content - should be processed first to protect everything inside quotes
        quotes: /"[^"\b]*"|'[^'\b]*'|「[^」\b]*」|“[^”\b]*”|‘[^’\b]*’|《[^》\b]*》|【[^】\b]*】|『[^』\b]*』/g,
        // Email addresses - should be processed early
        email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g,
        // URLs - handle complex URLs without matching trailing dots
        url: /https?:\/\/[^.。？！\s\b]+(?:\.[^.。？！\s\b]+)*/g,
        // Common abbreviations with periods only - should be processed before other dot patterns
        abbreviations: /(?:Ph\.D\.|B\.A\.|M\.A\.|Ed\.|Corp\.|Inc\.|Ltd\.|a\.m\.|p\.m\.|e\.g\.|i\.e\.|vs\.|i\.a\.|Fig\.|Vol\.)/g,
        // Titles with dots (updated pattern to match correctly)
        titles: /(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr)\.(?!\w)/g,
        // Dotted names (e.g. P.G. Wodehouse)
        dottedNames: /(?:[A-Z]\.)(?:[A-Z]\.)+(?:[A-Z][a-z]+)?/g,
        // Version numbers (e.g. 1.0.0, v2.1.0-beta.1)
        versions: /(?:v\d+\.\d+(?:\.\d+)*(?:-[a-zA-Z0-9]+(?:\.\d+)*)?|\d+\.\d+(?:\.\d+)*(?:-[a-zA-Z0-9]+(?:\.\d+)*)?)/g,
        // Configuration properties with dots (e.g. kafka.broker.id=1)
        configProperties: /[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*(?:=[^\s.!?。！？\b]*)?(?=[\s.!?。！？]|$)/g,
        // IP addresses
        ip: /(?:\d{1,3}\.){3}\d{1,3}/g,
        // Numbers with decimal points between numbers
        decimal: /\d+\.\d+/g,
        // File extensions (supporting multilingual filenames)
        fileExtensions: /(?:[\w\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0600-\u06FF-]+)\.[a-zA-Z0-9]{2,4}/g,
        // Inline code
        inlineCode: /<code(?:\s+[^>\b]*)?>([\s\S]*?)<\/code>/g,
        // Hierarchical bullet points (e.g. 1.2.3)
        hierarchy: /(?:\d+\.)+\d+/g,
        // Add list markers pattern to handle various list numbering formats including colons
        listMarkers: /((^|[。!！?？;；:：,，])\s*|\.\s+)(?:(?:\d\d?\.)+\d\d?[.,：:、]?|[a-zA-Z一-九][.：:、]|\d\d?[.,：:、]|\(\d\d?\)|（\d\d?）|\d\d?）|\d\d?\))/g,
        listMarkers1: /(、\s*|\.\s+)(?:(?:\d\d?\.)+\d\d?[.,：:]?|[a-zA-Z一-九][.：:]|\d\d?[.,：:]|\(\d\d?\)|（\d\d?）|\d\d?）|\d\d?\))/g,
        numberList: /\d+(\.\d+)?(\s*[、，,]\s*\d+(\.\d+)?)+/g,
    };

    const protectedItems = [];
    let processedText = text;

    // Replace patterns with placeholders, order matters!
    const orderedPatterns = [
        'academic',    // Process individual author names first
        'doi',           // Process DOI identifiers
        'inlineCode',    // Process inline code before other patterns
        'quotes',        // Process quotes first to protect their content
        'ratioExpressions',   // Process ratio expressions first
        'abbrWithNumber',    // Protect abbreviation+number refs (Pt.5, Sec.7) before rangeExpressions
        'rangeExpressions',   // Process range expressions first
        'numberList',    // Process number lists first
        'organizationAcronyms', // Process organization acronyms early
        'scientificNames', // Process scientific names before other patterns
        'htmlEncoded',   // Process HTML encoded entities
        'email',          // Process email first to avoid conflict with other patterns
        'url',           // URLs next to avoid conflict with other patterns
        'abbreviations', // Process abbreviations before other dot patterns
        'titles',        // Process titles after abbreviations
        'dottedNames',
        'listMarkers',
        'listMarkers1',
        'versions',
        'configProperties',
        'ip',
        'decimal',
        'fileExtensions',
        'hierarchy',
    ];

    // Fast-path skip: if a required character/substring is absent, skip the regex.
    // fileExtensions especially benefits: its CJK character class causes heavy
    // backtracking on CJK text when no '.xx' pattern is present.
    const patternRequiredCheck = {
        doi: t => t.indexOf('doi') !== -1 || t.indexOf('DOI') !== -1,
        inlineCode: t => t.indexOf('<code') !== -1,
        htmlEncoded: t => t.indexOf('&') !== -1,
        email: t => t.indexOf('@') !== -1,
        url: t => t.indexOf('http') !== -1,
        abbrWithNumber: t => {
            // Quick scan for '.' followed by optional whitespace and a digit
            for (let i = 0; i < t.length - 1; i++) {
                if (t.charCodeAt(i) === 46) {
                    for (let j = i + 1; j < Math.min(i + 5, t.length); j++) {
                        const c = t.charCodeAt(j);
                        if (c >= 48 && c <= 57) return true;
                        if (c !== 32 && c !== 9 && c !== 10) break;
                    }
                }
            }
            return false;
        },
        fileExtensions: t => {
            // Quick scan for '.xx' (dot + ASCII letter) to avoid CJK backtracking
            for (let i = 0; i < t.length - 1; i++) {
                if (t.charCodeAt(i) === 46) {
                    const c = t.charCodeAt(i + 1);
                    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) return true;
                }
            }
            return false;
        },
    };

    // Process all patterns in order
    orderedPatterns.forEach(type => {
        const pattern = patterns[type];
        if (!pattern) return;

        // Quick skip if the required check function returns false
        const check = patternRequiredCheck[type];
        if (check !== undefined && !check(processedText)) return;

        processedText = processedText.replace(pattern, (match, p1) => {
            if (type === 'listMarkers' || type === 'listMarkers1') {
                const punctuation = p1 || ''; // Leading punctuation or empty string
                const listMarker = match.slice(punctuation.length); // The actual list marker
                // Add special marker for colon-prefixed content
                const hasColon = punctuation.match(/[：:、,，]/);
                const prefix = hasColon ? '\u0017' : '';
                protectedItems.push(listMarker);
                return punctuation + prefix + `\b_${protectedItems.length - 1}_\b`;
            } else if (type === 'inlineCode') {
                protectedItems.push(p1);
                return `\b_${protectedItems.length - 1}_\b`;
            } else {
                protectedItems.push(match);
                return `\b_${protectedItems.length - 1}_\b`;
            }
        });
    });

    return { processedText, protectedItems };
}

// Check if all protected items were used
function verifyAllProtectedItemsUsed(items) {
    const unusedItems = items.filter(item => item !== undefined);
    if (unusedItems.length > 0) {
        throw new Error(`Some protected items were not used: ${unusedItems.length} items remaining. Unused items: \n${JSON.stringify(unusedItems, null, 2)}`);
    }
}

// Placeholder format: \u0008_<index>_\u0008 (backspace-delimited to avoid collisions)
const PLACEHOLDER_RE = /\u0008_(\d+)_\u0008/g;

// Restore protected content
function restoreProtectedContent(text, protectedItems) {
    // Mutate the passed-in array in place (caller reassigns items = result.items,
    // which is the same reference). Avoids O(n) copy per sentence.
    const items = protectedItems;
    let restoredText = text;

    // Keep restoring until no more placeholders are found (handles nested placeholders)
    let hasPlaceholders = true;
    while (hasPlaceholders) {
        hasPlaceholders = false;

        // Scan text once with regex (O(text length)) instead of iterating over all
        // protected items with indexOf (O(items × text length) — the old bottleneck).
        const matches = [];
        let match;
        PLACEHOLDER_RE.lastIndex = 0;
        while ((match = PLACEHOLDER_RE.exec(restoredText)) !== null) {
            matches.push(match.index, match[0], parseInt(match[1], 10));
        }

        if (matches.length === 0) break;

        // Build result via array push + join (O(text length)) instead of repeated
        // substring concatenation (O(placeholders × text length)).
        const parts = [];
        let lastEnd = 0;
        for (let i = 0; i < matches.length; i += 3) {
            const index = matches[i];
            const placeholder = matches[i + 1];
            const itemIndex = matches[i + 2];
            parts.push(restoredText.substring(lastEnd, index));
            if (items[itemIndex] === undefined) {
                throw new Error(`Protected item at index ${itemIndex} has already been used`);
            }
            parts.push(items[itemIndex]);
            items[itemIndex] = undefined;
            lastEnd = index + placeholder.length;
            hasPlaceholders = true;
        }
        parts.push(restoredText.substring(lastEnd));
        restoredText = parts.join('');
    }

    return { restoredText, items };
}

// Clean HTML formatting tags from text while preserving content
function cleanFormatTags(text) {
    if (!text) return text;

    // Fast skip: if no markdown/HTML formatting characters are present,
    // skip all 10 regex replaces entirely (common for plain CJK text).
    if (text.indexOf('*') === -1 && text.indexOf('_') === -1 &&
        text.indexOf('~') === -1 && text.indexOf('<') === -1) {
        return text;
    }

    // First handle Markdown formatting
    // Bold: ** or __, Italic: * or _, Bold+Italic: *** or **_ or __*
    text = text
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // Bold+Italic ***
        .replace(/\*\*_(.+?)_\*\*/g, '$1')    // Bold+Italic **_
        .replace(/__\*(.+?)\*__/g, '$1')      // Bold+Italic __*
        .replace(/\*\*(.+?)\*\*/g, '$1')      // Bold **
        .replace(/__(.+?)__/g, '$1')          // Bold __
        .replace(/\*(.+?)\*/g, '$1')          // Italic *
        .replace(/_(.+?)_/g, '$1')            // Italic _
        .replace(/~~(.+?)~~/g, '$1');         // Strikethrough ~~

    // Remove common HTML formatting tags while preserving code tags
    return text.replace(/<\/?(?:b|strong|i|em|u|mark|small|big|del|s|strike|ins|sub|sup|span|font)(?:\s+[^>]*)?>/gi, '');
}

const MAX_SENTENCE_LENGTH = 256;

// Sentence-ending char codes: . 。 ! ！ ? ？ ; ；
// Using a Set of char codes avoids regex .test() overhead for every character.
const SENTENCE_END_CODES = new Set([46, 12290, 33, 65281, 63, 65311, 59, 65307]);

// Split text by punctuation marks
function splitByPunctuation(text, maxLength = MAX_SENTENCE_LENGTH) {
    if (!text.trim()) return [];

    // Clean HTML formatting tags first, before any text processing
    text = cleanFormatTags(text);

    // Protect special patterns before splitting
    const { processedText, protectedItems } = protectSpecialPatterns(text);

    // Split the text into sentences
    let sentences = [];
    let items = [...protectedItems];
    // Track sentence boundaries by index instead of concatenating char-by-char.
    // substring(start, end) is O(end-start) done once per sentence, vs O(n²) for +=.
    let sentenceStart = 0;

    // Flush the text in [sentenceStart, end) as a sentence.
    const flushSentence = (end) => {
        if (end <= sentenceStart) return;
        const currentSentence = processedText.substring(sentenceStart, end);
        sentenceStart = end;
        if (!isOnlyPunctuation(currentSentence)) {
            const result = restoreProtectedContent(currentSentence, items);
            sentences.push(result.restoredText.trim());
            items = result.items;
        }
    };

    const len = processedText.length;
    for (let i = 0; i < len; i++) {
        // Check for special colon marker and handle line break
        if (processedText.charCodeAt(i) === 0x17) {
            // Flush accumulated content (excluding the marker) as a sentence
            flushSentence(i);
            sentenceStart = i + 1; // Skip the marker character
            continue;
        }

        // Use charCode Set lookup (O(1)) instead of regex .test() per character
        if (SENTENCE_END_CODES.has(processedText.charCodeAt(i)) &&
            (i === len - 1 || !SENTENCE_END_CODES.has(processedText.charCodeAt(i + 1)))) {
            // Flush including the ending punctuation (i + 1)
            flushSentence(i + 1);
        }
    }

    // Add any remaining text as the last sentence
    flushSentence(processedText.length);

    // Process long sentences first, before verification
    const finalSentences = [];
    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            // Push individually instead of spread to avoid stack overflow
            // when a single very long sentence produces many splits.
            const parts = splitLongSentence(sentence, maxLength);
            for (let k = 0; k < parts.length; k += 1) {
                finalSentences.push(parts[k]);
            }
        } else {
            finalSentences.push(sentence);
        }
    }

    // Final verification that all protected items were used
    verifyAllProtectedItemsUsed(items);

    return finalSentences.filter(s => s && !isOnlyPunctuation(s));
}

export {
    splitByPunctuation
};