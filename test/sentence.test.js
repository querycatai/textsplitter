import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/index.js';

describe('Long Sentence Splitting', () => {
    it('should not split short sentences', () => {
        const text = 'This is a short sentence that should not be split';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [text], 'Short sentence should not be split');
    });

    it('should split long sentence by commas', () => {
        // Create a sentence that exceeds 256 chars
        const part1 = 'a'.repeat(200);
        const part2 = 'b'.repeat(200);
        const text = `${part1}, ${part2}`;
        assert(text.length > 256, 'Text should be longer than 256 chars');
        const chunks = splitByPunctuation(text);
        
        assert(chunks.length > 1, 'Long sentence should be split');
        assert(chunks[0].endsWith(','), 'First chunk should end with comma');
        chunks.forEach(chunk => {
            assert(chunk.length <= 256, 'Each chunk should be within length limit');
        });
    });

    it('should handle Chinese text with different separators', () => {
        // Create a long Chinese text that exceeds 256 chars
        const part1 = '这'.repeat(200);
        const part2 = '那'.repeat(200);
        const text = `${part1}，${part2}`;
        assert(text.length > 256, 'Text should be longer than 256 chars');
        const chunks = splitByPunctuation(text);
        
        assert(chunks.length > 1, 'Long Chinese text should be split');
        assert(chunks[0].endsWith('，'), 'First chunk should end with Chinese comma');
        chunks.forEach(chunk => {
            assert(chunk.length <= 256, 'Each chunk should be within length limit');
        });
    });

    it('should merge short segments appropriately', () => {
        // Create text that exceeds length limit
        const shortPart = 'x'.repeat(10);
        const longPart = 'y'.repeat(245); // Make sure it exceeds 256
        const text = `${shortPart}, ${shortPart}, ${shortPart}, ${shortPart}, ${longPart}`;
        
        assert(text.length > 256, 'Text should be longer than 256 chars');
        const chunks = splitByPunctuation(text);
        
        // The first few short segments should be merged
        assert(chunks.length < 5, 'Short segments should be merged');
        
        // Each chunk (except possibly the last) should contain at least one comma
        chunks.slice(0, -1).forEach(chunk => {
            assert(chunk.includes(','), 'Non-final chunks should contain comma');
        });
        
        // Check that chunks don't exceed max length
        chunks.forEach(chunk => {
            assert(chunk.length <= 256, 'Each chunk should be within length limit');
        });
    });

    it('should preserve punctuation in splits', () => {
        const part1 = 'a'.repeat(200);
        const part2 = 'b'.repeat(200);
        const text = `${part1}, ${part2}`;
        assert(text.length > 256, 'Text should be longer than 256 chars');
        const chunks = splitByPunctuation(text);
        
        // Each non-final chunk should end with a separator
        chunks.slice(0, -1).forEach(chunk => {
            assert(chunk.endsWith(','), 'Non-final chunks should end with comma');
        });
    });
});