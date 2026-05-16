import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/index.js';

describe('HTML Formatting Tags Cleanup', () => {
    it('removes bold tags', () => {
        const text = 'This is <b>bold</b> text. This is also <strong>bold</strong> text.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is bold text.',
            'This is also bold text.'
        ]);
    });

    it('removes italic tags', () => {
        const text = 'This is <i>italic</i> text. This is also <em>emphasized</em> text.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is italic text.',
            'This is also emphasized text.'
        ]);
    });

    it('removes other formatting tags', () => {
        const text = 'This is <u>underlined</u> text. This is <mark>highlighted</mark> text. This is <small>small</small> text.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is underlined text.',
            'This is highlighted text.',
            'This is small text.'
        ]);
    });

    it('removes span tags with attributes', () => {
        const text = 'This is <span style="color: red;">colored</span> text. This is <span class="custom">styled</span> text.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is colored text.',
            'This is styled text.'
        ]);
    });

    it('removes font tags with attributes', () => {
        const text = 'This is <font color="blue" size="3">blue</font> text. This is <font face="Arial">Arial</font> text.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is blue text.',
            'This is Arial text.'
        ]);
    });

    it('handles nested formatting tags', () => {
        const text = 'This is <b><i>bold and italic</i></b> text. This is <span style="color:red"><strong>important</strong></span> text.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is bold and italic text.',
            'This is important text.'
        ]);
    });

    it('handles Chinese text with formatting tags', () => {
        const text = '这是<b>粗体</b>文本。这是<i>斜体</i>文本。这是<u>下划线</u>文本。';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            '这是粗体文本。',
            '这是斜体文本。',
            '这是下划线文本。'
        ]);
    });

    it('preserves code tags while removing formatting tags', () => {
        const text = 'Use <code><b>bold code</b></code> here. Regular <b>bold</b> becomes plain.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Use bold code here.',
            'Regular bold becomes plain.'
        ]);
    });

    it('handles formatting tags spanning sentence boundaries', () => {
        const text = '<b>This is a title.</b> Next sentence.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is a title.',
            'Next sentence.'
        ]);
    });

    it('handles complex formatting tags across multiple sentences', () => {
        const text = '<b>First sentence.</b> Normal text. <i>Third sentence with <u>nested tags</u>.</i>';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'First sentence.',
            'Normal text.',
            'Third sentence with nested tags.'
        ]);
    });

    it('handles mixed Chinese content with tags', () => {
        const text = '<b>这是第一句。</b><i>这是第二句。</i>这是第三句。';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            '这是第一句。',
            '这是第二句。',
            '这是第三句。'
        ]);
    });

    it('correctly processes formatting tags that wrap partial sentences', () => {
        const text = 'This is <b>partially bold.</b> This <i>has italic</i> in the middle.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'This is partially bold.',
            'This has italic in the middle.'
        ]);
    });

    it('handles the exact example case with title in bold tags', () => {
        const text = '<b>this is a title.</b> And this is a description.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'this is a title.',
            'And this is a description.'
        ]);
    });

    describe('Standalone HTML tag examples', () => {
        it('handles simple bold tag example', () => {
            const text = '<b>this is a title.</b>';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['this is a title.']);
        });

        it('handles bold tag without punctuation', () => {
            const text = '<b>this is a heading</b>';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['this is a heading']);
        });

        it('handles italic tag example', () => {
            const text = '<i>this is emphasized text.</i>';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['this is emphasized text.']);
        });

        it('handles multiple tags in short text', () => {
            const text = '<b>bold</b> and <i>italic</i>';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['bold and italic']);
        });

        it('handles tag with empty content', () => {
            const text = '<b></b>empty tag test.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['empty tag test.']);
        });

        it('handles multiple sentences in one tag', () => {
            const text = '<b>First sentence. Second sentence.</b>';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'First sentence.',
                'Second sentence.'
            ]);
        });

        it('handles mixed Chinese content with tags', () => {
            const text = '<b>这是标题。</b><i>这是内容。</i>';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '这是标题。',
                '这是内容。'
            ]);
        });
    });

    describe('Markdown Style Formatting', () => {
        it('handles bold markdown syntax', () => {
            const text = 'This is **bold** text. Another __bold__ text.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'This is bold text.',
                'Another bold text.'
            ]);
        });

        it('handles italic markdown syntax', () => {
            const text = 'This is *italic* text. Another _emphasized_ text.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'This is italic text.',
                'Another emphasized text.'
            ]);
        });

        it('handles mixed markdown formatting', () => {
            const text = 'This is ***bold and italic*** text. This is **_mixed_** style.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'This is bold and italic text.',
                'This is mixed style.'
            ]);
        });

        it('handles markdown with Chinese text', () => {
            const text = '这是**粗体**文本。这是*斜体*文本。这是***粗斜体***文本。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '这是粗体文本。',
                '这是斜体文本。',
                '这是粗斜体文本。'
            ]);
        });

        it('handles markdown code spans', () => {
            const text = 'Use `const x = 1` for constants. Call `function()` here.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Use `const x = 1` for constants.',
                'Call `function()` here.'
            ]);
        });

        it('handles markdown with multiple styles', () => {
            const text = 'A **bold** and `code` mix. Some *italic* with ~~strike~~ combo.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'A bold and `code` mix.',
                'Some italic with strike combo.'
            ]);
        });
    });
});
