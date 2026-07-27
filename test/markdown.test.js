import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitIntoChunks } from '../lib/index.js';

describe('Markdown Text Processing', () => {
    describe('Basic Text Elements', () => {
        it('splits headers correctly', () => {
            const text = '# Main Title\n## Subtitle\nSome content here.\n### Section 1\nMore content.';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks[0].content, 'Main Title');
            assert.equal(chunks[1].content, 'Subtitle');
            assert.equal(chunks[2].content, 'Some content here.');
            assert.equal(chunks[3].content, 'Section 1');
            assert.equal(chunks[4].content, 'More content.');
        });

        it('handles paragraphs with multiple sentences', () => {
            const text = 'First paragraph with two sentences. Another sentence here.\n\nSecond paragraph. With more content.';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks[0].content, 'First paragraph with two sentences.');
            assert.equal(chunks[1].content, 'Another sentence here.');
            assert.equal(chunks[2].content, 'Second paragraph.');
            assert.equal(chunks[3].content, 'With more content.');
        });

        it('handles hard line breaks (two spaces + newline)', () => {
            const text = 'First line  \nSecond line  \nThird line';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks[0].content, 'First line');
            assert.equal(chunks[1].content, 'Second line');
            assert.equal(chunks[2].content, 'Third line');
        });

        it('handles bold and italic text', () => {
            const text = 'This is **bold** and this is *italic*.';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.ok(chunks.some(chunk => chunk.content === 'This is bold and this is italic.'));
        });

        it('handles text around horizontal rules', () => {
            const text = 'Text above\n---\nText below';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks[0].content, 'Text above');
            assert.equal(chunks[1].content, 'Text below');
        });
    });

    describe('Structured Content', () => {
        describe('Lists', () => {
            it('handles simple lists', () => {
                const text = '- First item\n- Second item\n- Third item';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'First item');
                assert.equal(chunks[1].content, 'Second item');
                assert.equal(chunks[2].content, 'Third item');
            });

            it('processes nested lists correctly', () => {
                const text = '- Main item 1\n  - Sub item 1.1\n  - Sub item 1.2\n- Main item 2';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Main item 1');
                assert.equal(chunks[1].content, 'Sub item 1.1');
                assert.equal(chunks[2].content, 'Sub item 1.2');
                assert.equal(chunks[3].content, 'Main item 2');
            });

            it('processes task lists correctly', () => {
                const text = '- [ ] Unchecked task\n- [x] Completed task';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Unchecked task');
                assert.equal(chunks[1].content, 'Completed task');
            });

            it('handles nested task lists', () => {
                const text = '- [ ] Main task\n  - [x] Subtask 1\n  - [ ] Subtask 2';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Main task');
                assert.equal(chunks[1].content, 'Subtask 1');
                assert.equal(chunks[2].content, 'Subtask 2');
            });
        });

        describe('Tables and Blockquotes', () => {
            it('processes tables with headers', () => {
                const text = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.ok(chunks.some(chunk => chunk.content === 'Header 1: Cell 1'));
                assert.ok(chunks.some(chunk => chunk.content === 'Header 2: Cell 2'));
            });

            it('handles single line blockquotes', () => {
                const text = '> This is a blockquote.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'This is a blockquote.');
            });

            it('handles multi-line blockquotes', () => {
                const text = '> First line of quote.\n> Second line of quote.\n> Third line.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'First line of quote.');
                assert.equal(chunks[1].content, 'Second line of quote.');
                assert.equal(chunks[2].content, 'Third line.');
            });
        });
    });

    describe('Code and Technical Content', () => {
        it('keeps small code blocks as single chunks', () => {
            const text = '```javascript\nconst x = 1;\nconst y = 2;\n```';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks.length, 1);
            assert.ok(chunks[0].content.includes('const x = 1'));
            assert.ok(chunks[0].content.includes('const y = 2'));
        });

        it('splits large code blocks to avoid token limits', () => {
            // Create a large code block that exceeds the 800 character limit
            const largeCodeLines = [
                '# This is a large code example that should be split',
                '# Line 2 of comments explaining the code functionality',
                '# Line 3 continuing the explanation',
                'shanghai_opcodes = [',
                '    *range(0x00, 0x0b + 1),  # Basic arithmetic operations',
                '    *range(0x10, 0x1d + 1),  # Comparison operations', 
                '    0x20,  # SHA3 operation',
                '    *range(0x30, 0x3f + 1),  # Environmental information',
                '    *range(0x40, 0x48 + 1),  # Block information',
                '    0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a,  # Stack operations',
                '    *range(0x60, 0x6f + 1),  # Push operations 1-16',
                '    *range(0x70, 0x7f + 1),  # Push operations 17-32',
                '    *range(0x80, 0x8f + 1),  # Duplicate operations',
                '    *range(0x90, 0x9f + 1),  # Exchange operations',
                '    *range(0xa0, 0xa4 + 1),  # Logging operations',
                '    0xf0, 0xf1, 0xf3, 0xf4, 0xf5,  # System operations',
                '    0xfa, 0xfd, 0xfe, 0xff  # Additional system operations',
                ']',
                '# End of the large code block example'
            ];
            
            const largeCodeContent = largeCodeLines.join('\n');
            const text = `\`\`\`python\n${largeCodeContent}\n\`\`\``;
            
            // Verify the code is large enough to trigger splitting (> 800 chars)
            assert(largeCodeContent.length > 800, 'Test code should be large enough to trigger splitting');
            
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            
            // Should be split into multiple chunks
            assert(chunks.length > 1, 'Large code block should be split into multiple chunks');
            
            // Each chunk should contain valid code content
            chunks.forEach(chunk => {
                assert(chunk.content.length > 0, 'Each chunk should have content');
                assert(chunk.content.length <= 800, 'Each chunk should respect the size limit');
            });
            
            // Verify that when combined, the chunks contain all the original content
            const combinedContent = chunks.map(c => c.content).join('\n');
            largeCodeLines.forEach(line => {
                assert(combinedContent.includes(line.trim()), `Combined content should include: ${line}`);
            });
        });

        it('handles code with technical terms', () => {
            const text = '```python\nclass NeuralNetwork:\n    def __init__(self):\n        self.layers = []\n```';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks.length, 1);
            assert.ok(chunks[0].content.includes('class NeuralNetwork'));
        });

        it('preserves code structure when splitting', () => {
            // Create a code block with clear line boundaries
            const codeLines = [
                'def function_one():',
                '    return "first function"',
                '',  // Empty line
                'def function_two():',
                '    return "second function"',
                '',
                '# This is a long comment that might push us over the limit along with some more text to make it longer and ensure splitting occurs when we have substantial content that exceeds the character limit for embeddings'
            ];
            
            // Repeat content to ensure it exceeds 800 chars
            const repeatedContent = [];
            for (let i = 0; i < 10; i++) {
                repeatedContent.push(...codeLines.map(line => `${line} # iteration ${i}`));
            }
            
            const largeCodeContent = repeatedContent.join('\n');
            const text = `\`\`\`python\n${largeCodeContent}\n\`\`\``;
            
            assert(largeCodeContent.length > 800, 'Code should be large enough to split');
            
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert(chunks.length > 1, 'Should split into multiple chunks');
            
            // Verify each chunk ends and starts at reasonable line boundaries
            chunks.forEach(chunk => {
                const lines = chunk.content.split('\n');
                assert(lines.length > 0, 'Each chunk should have at least one line');
            });
        });

        it('preserves technical terminology', () => {
            const text = 'TCP/IP protocol uses a 3-way handshake. HTTP is stateless.';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.equal(chunks[0].content, 'TCP/IP protocol uses a 3-way handshake.');
            assert.equal(chunks[1].content, 'HTTP is stateless.');
        });

        it('handles JSON code blocks with extremely long single-line strings', () => {
            // Test case for issue where JSON strings with very long hex values weren't split
            const longHexValue = '6060604052'.repeat(1800); // Creates ~18000 character hex string
            const longOpcodes = 'PUSH1 0x60 PUSH1 0x40 MSTORE CALLVALUE ISZERO PUSH3 0xD JUMPI INVALID '.repeat(500); // Very long opcodes
            
            const jsonCodeBlock = `\`\`\`json
{
    "object": "${longHexValue}",
    "opcodes": "${longOpcodes.trim()}",
    "sourceMap": "2715:10853:0:-;;;3523:112;;;;;;;3552:18;3574:8;:27"
}
\`\`\``;

            const chunks = splitIntoChunks(jsonCodeBlock, 512, { merge: false });
            
            console.log(`JSON code block test: ${chunks.length} chunks generated`);
            
            // Verify all chunks are within the 512 character limit
            chunks.forEach((chunk, index) => {
                assert(chunk.content.length <= 512, 
                    `Chunk ${index + 1} has ${chunk.content.length} characters, exceeds 512 limit. Content: "${chunk.content.substring(0, 100)}..."`);
            });
            
            // Verify that we actually split the large JSON fields
            assert(chunks.length > 10, 'Large JSON strings should create many chunks');
            
            // Verify all original content is preserved when combined
            const combinedContent = chunks.map(c => c.content).join('');
            assert(combinedContent.includes('object'), 'Should preserve object field');
            assert(combinedContent.includes('opcodes'), 'Should preserve opcodes field');
            assert(combinedContent.includes('sourceMap'), 'Should preserve sourceMap field');
            
            // Verify no chunk is empty
            chunks.forEach((chunk, index) => {
                assert(chunk.content.trim().length > 0, `Chunk ${index + 1} should not be empty`);
            });
        });
    });

    describe('Special Content', () => {
        describe('Mathematical and Academic', () => {
            it('handles inline math expressions', () => {
                const text = 'The equation $E = mc^2$ is famous.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'The equation $E = mc^2$ is famous.');
            });

            it('preserves block math expressions', () => {
                const text = '$$\ny = mx + b\n\\frac{d}{dx}(x^2)\n$$';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks.length, 1);
                assert.ok(chunks[0].content.includes('y = mx + b'));
            });

            it('handles citations', () => {
                const text = 'As shown in [1], this theory... \nReferences:\n1. Smith et al. (2020)';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.ok(chunks.some(chunk => chunk.content === 'As shown in [1], this theory...'));
                assert.ok(chunks.some(chunk => chunk.content === 'References:'));
                assert.ok(chunks.some(chunk => chunk.content === 'Smith et al. (2020)'));
            });
        });

        describe('Mixed Content', () => {
            it('handles combination of different markdown elements', () => {
                const text = '# Title\nParagraph 1.\n\n```code\nsome code\n```\n\n- List item 1\n- List item 2';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.ok(chunks.some(chunk => chunk.content === 'Title'));
                assert.ok(chunks.some(chunk => chunk.content === 'Paragraph 1.'));
                assert.ok(chunks.some(chunk => chunk.content.includes('some code')));
                assert.ok(chunks.some(chunk => chunk.content === 'List item 1'));
                assert.ok(chunks.some(chunk => chunk.content === 'List item 2'));
            });

            it('handles complex document structures', () => {
                const text = `# Main Title
## Section 1
Text with **bold** and *italic*.

> Important quote
> With multiple lines

1. First item
   - Subitem 1
   - Subitem 2
2. Second item

\`\`\`js
console.log('test');
\`\`\``;
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.ok(chunks.some(chunk => chunk.content === 'Main Title'));
                assert.ok(chunks.some(chunk => chunk.content === 'Section 1'));
                assert.ok(chunks.some(chunk => chunk.content === 'Text with bold and italic.'));
                assert.ok(chunks.some(chunk => chunk.content === 'Important quote\nWith multiple lines'));
                assert.ok(chunks.some(chunk => chunk.content === 'First item'));
                assert.ok(chunks.some(chunk => chunk.content === 'Subitem 1'));
                assert.ok(chunks.some(chunk => chunk.content.includes('console.log')));
            });
        });
    });

    describe('Internationalization', () => {
        describe('Multi-language Support', () => {
            it('handles mixed language content', () => {
                const text = 'English text. 中文内容。Mixed content here.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'English text.');
                assert.equal(chunks[1].content, '中文内容。');
                assert.equal(chunks[2].content, 'Mixed content here.');
            });

            it('processes CJK text correctly', () => {
                const text = '这是中文。これは日本語です。한국어입니다.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, '这是中文。');
                assert.equal(chunks[1].content, 'これは日本語です。');
                assert.equal(chunks[2].content, '한국어입니다.');
            });

            it('processes diacritical marks', () => {
                const text = 'Café. Naïve. Résumé.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Café.');
                assert.equal(chunks[1].content, 'Naïve.');
                assert.equal(chunks[2].content, 'Résumé.');
            });
        });

        describe('Directionality', () => {
            it('handles RTL text', () => {
                const text = 'English text. العربية نص. More English.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'English text.');
                assert.equal(chunks[1].content, 'العربية نص.');
                assert.equal(chunks[2].content, 'More English.');
            });

            it('processes mixed directionality', () => {
                const text = 'Start here. שָׁלוֹם עֲלֵיכֶם. End here.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Start here.');
                assert.equal(chunks[1].content, 'שָׁלוֹם עֲלֵיכֶם.');
                assert.equal(chunks[2].content, 'End here.');
            });
        });
    });

    describe('Format Processing', () => {
        describe('text blocks', () => {
            it('processes headers correctly', () => {
                const text = '# Main Title\n## Subtitle\nSome content here.\n### Section 1\nMore content.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Main Title');
                assert.equal(chunks[1].content, 'Subtitle');
                assert.equal(chunks[2].content, 'Some content here.');
                assert.equal(chunks[3].content, 'Section 1');
                assert.equal(chunks[4].content, 'More content.');
            });

            it('handles paragraphs with multiple sentences', () => {
                const text = 'First paragraph with two sentences. Another sentence here.\n\nSecond paragraph. With more content.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'First paragraph with two sentences.');
                assert.equal(chunks[1].content, 'Another sentence here.');
                assert.equal(chunks[2].content, 'Second paragraph.');
                assert.equal(chunks[3].content, 'With more content.');
            });

            it('handles hard line breaks', () => {
                const text = 'First line  \nSecond line  \nThird line';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'First line');
                assert.equal(chunks[1].content, 'Second line');
                assert.equal(chunks[2].content, 'Third line');
            });

            it('processes blockquotes', () => {
                const text = '> First line of quote.\n> Second line of quote.\n> Third line.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'First line of quote.');
                assert.equal(chunks[1].content, 'Second line of quote.');
                assert.equal(chunks[2].content, 'Third line.');
            });
        });

        describe('structured content', () => {
            it('processes lists correctly', () => {
                const text = '- First item\n  - Sub item 1\n  - Sub item 2\n- Second item';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'First item');
                assert.equal(chunks[1].content, 'Sub item 1');
                assert.equal(chunks[2].content, 'Sub item 2');
                assert.equal(chunks[3].content, 'Second item');
            });

            it('processes task lists', () => {
                const text = '- [ ] Unchecked task\n- [x] Completed task';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks[0].content, 'Unchecked task');
                assert.equal(chunks[1].content, 'Completed task');
            });

            it('processes tables with headers', () => {
                const text = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.ok(chunks.some(chunk => chunk.content === 'Header 1: Cell 1'));
                assert.ok(chunks.some(chunk => chunk.content === 'Header 2: Cell 2'));
            });
        });

        describe('code and formatting', () => {
            it('keeps small code blocks intact', () => {
                const text = '```javascript\nconst x = 1;\nconst y = 2;\n```';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.equal(chunks.length, 1);
                assert.ok(chunks[0].content.includes('const x = 1'));
                assert.ok(chunks[0].content.includes('const y = 2'));
            });

            it('handles inline formatting', () => {
                const text = 'This is **bold** and this is *italic*.';
                const chunks = splitIntoChunks(text, undefined, { merge: false });
                assert.ok(chunks.some(chunk => chunk.content === 'This is bold and this is italic.'));
            });
        });
    });

    describe('Chunk Merging', () => {
        it('merges fragments that do not end with punctuation', () => {
            // "Title" (no punctuation) merges with "Short." (ends with period)
            const text = '# Title\n\nShort.\n\nAlso short.\n\nEnd.';
            const chunks = splitIntoChunks(text);
            // mergeIncompleteChunks: "Title Short." (12 chars)
            // mergeShortestPairs: "Also short." (12) + "End." (4) = 17 < 50 → merge
            // Then "Title Short." (12) + "Also short. End." (17) = 30 < 50 → merge
            assert.equal(chunks.length, 1);
            assert.equal(chunks[0].content, 'Title Short. Also short. End.');
        });

        it('does not merge chunks that already end with punctuation', () => {
            // With mergeThreshold=50, short sentences get merged by mergeShortestPairs.
            // Use mergeThreshold=0 to test mergeIncompleteChunks alone.
            const text = 'First sentence. Second sentence. Third.';
            const chunks = splitIntoChunks(text, undefined, { mergeThreshold: 0 });
            assert.ok(chunks.some(c => c.content === 'First sentence.'));
            assert.ok(chunks.some(c => c.content === 'Second sentence.'));
            assert.ok(chunks.some(c => c.content === 'Third.'));
        });

        it('uses space separator when merging incomplete fragments', () => {
            // Two paragraphs: first has no ending punctuation, second does
            const text = 'Water level detectors on\n\nmultiple hold cargo ships.';
            const chunks = splitIntoChunks(text);
            assert.equal(chunks.length, 1);
            assert.equal(chunks[0].content, 'Water level detectors on multiple hold cargo ships.');
        });

        it('respects maxLength when merging', () => {
            const text = '# H1\n# H2\n# H3\n# H4\n# H5\n# H6\n# H7\n# H8';
            const chunks = splitIntoChunks(text, 20);
            chunks.forEach(chunk => {
                assert.ok(chunk.content.length <= 20,
                    `Chunk "${chunk.content}" is ${chunk.content.length} chars, exceeds 20`);
            });
        });

        it('does not merge when merge option is false', () => {
            const text = '# Title\n\nShort.\n\nAlso short.';
            const chunks = splitIntoChunks(text, undefined, { merge: false });
            assert.ok(chunks.some(c => c.content === 'Title'));
            assert.ok(chunks.some(c => c.content === 'Short.'));
            assert.ok(chunks.some(c => c.content === 'Also short.'));
        });

        it('merges CJK fragments without ending punctuation', () => {
            const text = '这是一个没有标点的片段\n\n它应该被合并到一起。';
            const chunks = splitIntoChunks(text);
            assert.equal(chunks.length, 1);
            assert.equal(chunks[0].content, '这是一个没有标点的片段 它应该被合并到一起。');
        });

        it('mergeSequentially packs chunks up to target length', () => {
            // Three chunks: A(3), B(49), C(3). With target=60:
            // current=A(3), 3<60 → merge B → AB(53)
            // current=AB(53), 53<60 → merge C → ABC(57)
            const text = 'Ab. ' + 'B'.repeat(48) + '. Cd.';
            const chunks = splitIntoChunks(text, undefined, { mergeThreshold: 60 });
            assert.equal(chunks.length, 1);
        });

        it('mergeSequentially stops when target length reached', () => {
            // Each sentence ~22 chars. With target=10:
            // current=22 chars, 22 >= 10 → don't merge → 3 chunks.
            const text = 'This is sentence one. This is sentence two. This is sentence three.';
            const chunks = splitIntoChunks(text, undefined, { mergeThreshold: 10 });
            assert.equal(chunks.length, 3);
            // All content preserved
            const combined = chunks.map(c => c.content).join(' ');
            assert.ok(combined.includes('sentence one'));
            assert.ok(combined.includes('sentence two'));
            assert.ok(combined.includes('sentence three'));
        });
    });

});
