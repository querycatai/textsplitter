// Functions for splitting text into semantic chunks

// Split long sentence by conjunctions and commas
function splitLongSentence(sentence, maxLength) {
    if (sentence.length <= maxLength) return [sentence];

    // Split by punctuation
    const parts = sentence.split(/([,，\n])/);
    
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

    // Merge segments until no more merges are possible
    while (true) {
        // Find shortest adjacent pair that can be merged
        let minLength = Infinity;
        let mergeIndex = -1;

        for (let i = 0; i < segments.length - 1; i++) {
            const combinedLength = segments[i].length + segments[i + 1].length;
            if (combinedLength <= maxLength && combinedLength < minLength) {
                minLength = combinedLength;
                mergeIndex = i;
            }
        }

        // If no valid merge found, break
        if (mergeIndex === -1) break;

        // Merge segments at found index
        segments[mergeIndex] = segments[mergeIndex] + segments[mergeIndex + 1];
        segments.splice(mergeIndex + 1, 1);
    }

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

    // Process all patterns in order
    orderedPatterns.forEach(type => {
        const pattern = patterns[type];
        if (!pattern) return;
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

// Restore protected content
function restoreProtectedContent(text, protectedItems) {
    // Create a copy to avoid modifying the original array
    const items = [...protectedItems];
    let restoredText = text;

    // Keep restoring until no more placeholders are found (handles nested placeholders)
    let hasPlaceholders = true;
    while (hasPlaceholders) {
        // Sort placeholders by index in descending order to avoid replacement conflicts
        const placeholders = items.map((_, i) => `\b_${i}_\b`);
        
        const placeholderIndices = placeholders.map(p => ({
            placeholder: p,
            index: restoredText.indexOf(p)
        })).filter(p => p.index !== -1)
            .sort((a, b) => b.index - a.index);

        if (placeholderIndices.length === 0) {
            hasPlaceholders = false;
            break;
        }

        // Replace placeholders with their original content
        for (const { placeholder, index } of placeholderIndices) {
            const originalIndex = parseInt(placeholder.match(/\d+/)[0]);
            if (items[originalIndex] === undefined) {
                throw new Error(`Protected item at index ${originalIndex} has already been used`);
            }
            const originalContent = items[originalIndex];
            restoredText = restoredText.substring(0, index) +
                originalContent +
                restoredText.substring(index + placeholder.length);
            items[originalIndex] = undefined;
        }
    }

    return { restoredText, items };
}

// Clean HTML formatting tags from text while preserving content
function cleanFormatTags(text) {
    if (!text) return text;

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

// Split text by punctuation marks
function splitByPunctuation(text, maxLength = MAX_SENTENCE_LENGTH) {
    if (!text.trim()) return [];

    // Clean HTML formatting tags first, before any text processing
    text = cleanFormatTags(text);

    // Protect special patterns before splitting
    const { processedText, protectedItems } = protectSpecialPatterns(text);

    // Define sentence boundary regex (added semicolons)
    const sentenceEndRegex = /[.。!！?？;；]/;

    // Split the text into sentences
    let sentences = [];
    let currentSentence = '';
    let items = [...protectedItems];

    for (let i = 0; i < processedText.length; i++) {
        // Check for special colon marker and handle line break
        if (processedText[i] === '\u0017') {
            // If we have accumulated content, add it as a sentence
            if (currentSentence && !isOnlyPunctuation(currentSentence)) {
                const result = restoreProtectedContent(currentSentence, items);
                sentences.push(result.restoredText.trim());
                items = result.items;
            }
            currentSentence = '';
            continue; // Skip the marker character
        }

        currentSentence += processedText[i];

        // Use sentenceEndRegex for checking sentence endings
        if (sentenceEndRegex.test(processedText[i]) &&
            (i === processedText.length - 1 || !sentenceEndRegex.test(processedText[i + 1]))) {

            // Add current sentence if it's not empty and not just punctuation
            if (currentSentence && !isOnlyPunctuation(currentSentence)) {
                const result = restoreProtectedContent(currentSentence, items);
                sentences.push(result.restoredText.trim());
                items = result.items;
            }
            currentSentence = '';
        }
    }

    // Add any remaining text as the last sentence
    if (currentSentence && !isOnlyPunctuation(currentSentence)) {
        const result = restoreProtectedContent(currentSentence, items);
        sentences.push(result.restoredText.trim());
        items = result.items;
    }

    // Process long sentences first, before verification
    const finalSentences = [];
    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            finalSentences.push(...splitLongSentence(sentence, maxLength));
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