import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/textsplitter.js';

describe('Special Patterns and Formatting', () => {
    describe('pattern protection', () => {
        it('protects configuration properties', () => {
            const text = 'Set zookeeper.connect to localhost. Configure num.recovery.threads.per.data.dir properly.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Set zookeeper.connect to localhost.',
                'Configure num.recovery.threads.per.data.dir properly.'
            ]);
        });

        it('protects version numbers', () => {
            const text = 'Using Node.js version 18.15.0. The API is at version 2.1.0-beta.1.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Using Node.js version 18.15.0.',
                'The API is at version 2.1.0-beta.1.'
            ]);
        });

        it('protects email addresses and URLs', () => {
            const text = 'Contact support@example.com for help. Visit https://example.com/docs. Continue reading.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Contact support@example.com for help.',
                'Visit https://example.com/docs.',
                'Continue reading.'
            ]);
        });

        it('protects IP addresses', () => {
            const text = 'Server at 192.168.1.1 is running. Backup at 10.0.0.1 is offline.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Server at 192.168.1.1 is running.',
                'Backup at 10.0.0.1 is offline.'
            ]);
        });

        it('protects Kafka configuration properties with timeouts', () => {
            const text = 'Set request.timeout.ms=30000 for client. Configure metadata.fetch.timeout.ms=60000. Default timeout.ms is 5000.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Set request.timeout.ms=30000 for client.',
                'Configure metadata.fetch.timeout.ms=60000.',
                'Default timeout.ms is 5000.'
            ]);
        });

        it('protects complex configuration properties', () => {
            const text = 'Configure kafka.consumer.request.timeout.ms=3000. Set kafka.producer.metadata.fetch.timeout.ms=5000. The connection.max.idle.ms=60000 is default.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Configure kafka.consumer.request.timeout.ms=3000.',
                'Set kafka.producer.metadata.fetch.timeout.ms=5000.',
                'The connection.max.idle.ms=60000 is default.'
            ]);
        });

        it('protects Kafka timeout configuration properties', () => {
            const text = 'timeout.ms、request.timeout.ms 和 metadata.fetch.timeout.ms';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'timeout.ms、request.timeout.ms 和 metadata.fetch.timeout.ms'
            ]);
        });

        it('handles semicolon separators', () => {
            const text = 'First part; Second part; Final part.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'First part;',
                'Second part;',
                'Final part.'
            ]);
        });

        it('handles mixed semicolons', () => {
            const text = '第一部分；第二部分; 第三部分。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '第一部分；',
                '第二部分;',
                '第三部分。'
            ]);
        });
    });

    describe('formatting and special characters', () => {
        it('handles multiple consecutive whitespaces', () => {
            const text = 'First    sentence.     Second     sentence!   ';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'First    sentence.',
                'Second     sentence!'
            ]);
        });

        it('handles mixed symbols and emoticons', () => {
            const text = '今天好开心 :-) 。看电影很有趣 ^_^ ！明天继续。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '今天好开心 :-) 。',
                '看电影很有趣 ^_^ ！',
                '明天继续。'
            ]);
        });

        it('handles empty brackets and quotes', () => {
            const text = '空括号()。空引号""。空中括号[]。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '空括号()。',
                '空引号""。',
                '空中括号[]。'
            ]);
        });
    });

    describe('inline code protection', () => {
        it('protects simple inline code', () => {
            const text = 'Use <code>npm install</code> to install dependencies. Then run <code>npm start</code>.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Use npm install to install dependencies.',
                'Then run npm start.'
            ]);
        });

        it('protects inline code with attributes', () => {
            const text = 'The <code class="language-js">const x = 1;</code> is JavaScript code. Here is <code class="shell">ls -la</code>.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'The const x = 1; is JavaScript code.',
                'Here is ls -la.'
            ]);
        });

        it('protects inline code containing dots', () => {
            const text = 'Access using <code>object.property.value</code>. Call <code>console.log()</code> for debugging.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Access using object.property.value.',
                'Call console.log() for debugging.'
            ]);
        });

        it('protects inline code with mixed content', () => {
            const text = 'Using <code>db.user.find({age: 18})</code>. Check <code>http://localhost:3000</code> in browser.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Using db.user.find({age: 18}).',
                'Check http://localhost:3000 in browser.'
            ]);
        });

        it('protects inline code with inline-code class', () => {
            const text = 'The code is "<code class="inline-code">code</code>".';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['The code is "code".']);
        });

        it('reproduces and tests fix for finalSentences error bug', () => {
            // Bug description: When protected items are not fully used during text splitting,
            // verifyAllProtectedItemsUsed() throws an error, and the error handler tries to 
            // access 'finalSentences' before it's declared, causing:
            // "ReferenceError: Cannot access 'finalSentences' before initialization"
            
            // This specific text triggers the bug due to complex HTML code patterns that 
            // create nested protection patterns, some of which become orphaned during splitting
            const problematicText1 = `EIP-4488 通过减少每字节的交易calldata所需gas成本来降低gas费用。具体来说，EIP-4488 将 <code class="inline-code">NEWCALLDATAGAS_COST</code> 参数设置为3，这将显著降低交易calldata的gas消耗。同时，EIP-4488 通过添加一个限制规则，确保每个区块中的总calldata大小不超过 <code class="inline-code">BASEMAXCALLDATAPERBLOCK (1,048,576)</code> 字节加上区块中每笔交易的 <code class="inline-code">CALLDATAPERTX_STIPEND (300)</code>。这一措施不仅减少了calldata的gas成本，而且限制了区块的总calldata大小，提高了区块内交易的处理能力，从而帮助降低L1（主链）的交易费用，激励Ethereum生态系统向以rollup为中心的模式过渡。`;
            
            // Small maxLength forces aggressive splitting which triggers the orphaned protection items
            // Before fix: throws "ReferenceError: Cannot access 'finalSentences' before initialization"
            // After fix: should complete successfully and return array of chunks
            assert.doesNotThrow(() => {
                const chunks1 = splitByPunctuation(problematicText1, 50);
                assert.ok(Array.isArray(chunks1), 'Should return an array');
                assert.ok(chunks1.length > 0, 'Should return non-empty array');
            });

            // Another problematic text case with nested code tags
            const problematicText2 = `Group G1 is defined as a set of Fp pairs (points) <code class="inline-code">(x,y)</code> such that either <code class="inline-code">(x,y)</code> is  <code class="inline-code">(0,0)</code> or <code class="inline-code">x,y</code> satisfy the curve Fp equation.`;
            
            // This also triggers the same error pattern
            assert.doesNotThrow(() => {
                const chunks2 = splitByPunctuation(problematicText2, 30);
                assert.ok(Array.isArray(chunks2), 'Should return an array');
                assert.ok(chunks2.length > 0, 'Should return non-empty array');
            });
        });

        it('handles common Markdown document structures', () => {
            const text = '这是一个 <code>inline code</code> 示例。特殊字符：&copy; &amp; &reg;。内联 HTML：<kbd>Ctrl</kbd> + <kbd>C</kbd>。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '这是一个 inline code 示例。',
                '特殊字符：&copy; &amp; &reg;。',
                '内联 HTML：<kbd>Ctrl</kbd> + <kbd>C</kbd>。'
            ]);
        });
    });
});
