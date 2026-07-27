import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/textsplitter.js';
import { splitIntoChunks } from '../lib/index.js';

describe('Edge Cases', () => {
    describe('input validation', () => {
        it('handles empty input', () => {
            assert.deepEqual(splitByPunctuation(''), []);
            assert.deepEqual(splitByPunctuation('   '), []);
        });

        it('handles text without punctuation', () => {
            const text = 'Hello world';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['Hello world']);
        });

        it('handles text with only punctuation', () => {
            assert.deepEqual(splitByPunctuation('...'), []);
            assert.deepEqual(splitByPunctuation('!?!?'), []);
        });
    });

    describe('special cases', () => {
        it('handles multiple consecutive punctuation marks', () => {
            const text = 'Really???! No way... Wait.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Really???!',
                'No way...',
                'Wait.'
            ]);
        });

        it('handles urls with complex paths', () => {
            const text = '请访问 https://example.com/path?param=1&query=2#section。另见 https://test.org/1.2.3/。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '请访问 https://example.com/path?param=1&query=2#section。',
                '另见 https://test.org/1.2.3/。'
            ]);
        });

        it('handles file paths and extensions', () => {
            const text = '文件在 C:\\Program Files\\App。使用 test.txt 和 data.json。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '文件在 C:\\Program Files\\App。',
                '使用 test.txt 和 data.json。'
            ]);
        });

        it('handles Chinese filenames with extensions', () => {
            const text = '打开 测试文档.pdf 和 学习笔记.doc。查看 账单明细.xlsx！';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '打开 测试文档.pdf 和 学习笔记.doc。',
                '查看 账单明细.xlsx！'
            ]);
        });

        it('handles medical units and ranges', () => {
            const text = '维持血清钙浓度在正常范围的下限，大约8.0-8.5mg/dL(2.0-2.1mmol/L)。并预防医源性肾结石的形成。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '维持血清钙浓度在正常范围的下限，大约8.0-8.5mg/dL(2.0-2.1mmol/L)。',
                '并预防医源性肾结石的形成。'
            ]);
        });

        it('handles long text without punctuation (should be forcefully split)', () => {
            // Create a long text without any punctuation marks that splitLongSentence can recognize
            const longText = 'abcdefghijklmnopqrstuvwxyz'.repeat(30); // 780 characters, no punctuation
            const chunks = splitByPunctuation(longText);
            
            // Should be split into chunks no longer than 512 characters
            const maxChunkLength = Math.max(...chunks.map(chunk => chunk.length));
            assert.ok(maxChunkLength <= 512, `Longest chunk is ${maxChunkLength} chars, should be <= 512`);
            assert.ok(chunks.length > 1, 'Long text without punctuation should be split into multiple chunks');
        });

        it('handles very long compressed JavaScript code', () => {
            // Simulate compressed JS code like in the error log (Item 7: 17436 chars)
            const jsCode = '!function(e){"use strict";function n(e){function E(e,n){var t,r,i,o,u,s,f=this;if(!(f instanceof E))return j&&L(26,"constructor call without new",e),new E(e,n)}}'.repeat(100);
            const chunks = splitByPunctuation(jsCode);
            
            // All chunks should be within token limit
            const maxChunkLength = Math.max(...chunks.map(chunk => chunk.length));
            assert.ok(maxChunkLength <= 512, `Longest chunk is ${maxChunkLength} chars, should be <= 512`);
        });

        it('handles long technical text with minimal punctuation', () => {
            // Simulate technical documentation that might have long passages without sentence-ending punctuation
            const techText = 'This is a very long paragraph that contains a lot of technical information about various aspects of web development and browser security that may not have sufficient punctuation marks to allow proper text splitting and may cause issues with embedding systems that have token limits such as the one we are experiencing where the text needs to be split into smaller chunks but the current splitting algorithm may not be able to handle such cases effectively'.repeat(3);
            const chunks = splitByPunctuation(techText);
            
            // Should be split appropriately
            const maxChunkLength = Math.max(...chunks.map(chunk => chunk.length));
            assert.ok(maxChunkLength <= 512, `Longest chunk is ${maxChunkLength} chars, should be <= 512`);
        });

        it('handles long HTML/CSS content without proper sentence structure', () => {
            // Simulate CSS or HTML content that might be very long
            const cssLikeText = 'body{font-family:HelveticaNeue-Light,Helvetica Neue Light,Helvetica Neue,Helvetica,Arial,Lucida Grande,sans-serif;background:#E2E2E2}wrapper{position:relative;margin:auto;width:400px;background:white;border-radius:10px;overflow:hidden}'.repeat(20);
            const chunks = splitByPunctuation(cssLikeText);
            
            // Should be split even though it lacks traditional sentence punctuation
            const maxChunkLength = Math.max(...chunks.map(chunk => chunk.length));
            assert.ok(maxChunkLength <= 512, `Longest chunk is ${maxChunkLength} chars, should be <= 512`);
        });
    });

    describe('HTML encoded characters', () => {
        it('protects basic HTML entities', () => {
            const text = 'Use &amp; for ampersand. Use &lt; for less than. Use &gt; for greater than.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Use &amp; for ampersand.',
                'Use &lt; for less than.',
                'Use &gt; for greater than.'
            ]);
        });

        it('protects numeric HTML entities', () => {
            const text = 'Copyright &#169; 2025. Temperature is 20&#8451;. Note&#58; this is important.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Copyright &#169; 2025.',
                'Temperature is 20&#8451;.',
                'Note&#58; this is important.'
            ]);
        });

        it('protects hex HTML entities', () => {
            const text = 'Space &#x20; here. Quote &#x22; there. Copyright &#xA9; symbol.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Space &#x20; here.',
                'Quote &#x22; there.',
                'Copyright &#xA9; symbol.'
            ]);
        });

        it('handles mixed HTML entities and normal text', () => {
            const text = '使用 &quot;双引号&quot; 和 &apos;单引号&apos;。HTML 特殊字符: &lt;div&gt;。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '使用 &quot;双引号&quot; 和 &apos;单引号&apos;。',
                'HTML 特殊字符: &lt;div&gt;。'
            ]);
        });

        it('protects entities in code blocks', () => {
            const text = 'HTML代码 <code>&lt;div class=&quot;test&quot;&gt;</code>。转义字符表示为 <code>&amp;amp;</code>。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'HTML代码 &lt;div class=&quot;test&quot;&gt;。',
                '转义字符表示为 &amp;amp;。'
            ]);
        });

        it('handles multiple HTML entities in sequence', () => {
            const text = 'Text with &nbsp;&nbsp;&nbsp;multiple spaces. Colors: &hearts;&spades;&clubs;&diams;.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Text with &nbsp;&nbsp;&nbsp;multiple spaces.',
                'Colors: &hearts;&spades;&clubs;&diams;.'
            ]);
        });

        it('protects complex HTML entities', () => {
            const text = 'Math: &radic;&infin; = &infin;. Greek: &alpha;&beta;&gamma;. Currency: &euro;100, &pound;50, &yen;5000.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Math: &radic;&infin; = &infin;.',
                'Greek: &alpha;&beta;&gamma;.',
                'Currency: &euro;100, &pound;50, &yen;5000.'
            ]);
        });

        it('handles mixed entity types in technical context', () => {
            const text = 'XML标记 &lt;user id=&quot;123&quot; role=&#34;admin&#x22;&gt;. SQL查询: SELECT * FROM &quot;users&quot;.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'XML标记 &lt;user id=&quot;123&quot; role=&#34;admin&#x22;&gt;.',
                'SQL查询: SELECT * FROM &quot;users&quot;.'
            ]);
        });

        it('protects entities in mathematical expressions', () => {
            const text = '角度 &alpha; = 30&deg;. 面积 A = &pi;r&sup2;. 温度 &Delta;T = 5&deg;C.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '角度 &alpha; = 30&deg;.',
                '面积 A = &pi;r&sup2;.',
                '温度 &Delta;T = 5&deg;C.'
            ]);
        });

        it('handles language-specific special characters', () => {
            const text = 'German: M&uuml;ller. French: D&eacute;j&agrave; vu. Spanish: Ma&ntilde;ana.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'German: M&uuml;ller.',
                'French: D&eacute;j&agrave; vu.',
                'Spanish: Ma&ntilde;ana.'
            ]);
        });

        it('protects nested HTML entities in code', () => {
            const text = 'HTML: <code>&lt;div class=&quot;alert&quot;&gt;&amp;copy; 2025&lt;/div&gt;</code>. CSS: <code>&amp;#123; margin: 0 &amp;#125;</code>.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'HTML: &lt;div class=&quot;alert&quot;&gt;&amp;copy; 2025&lt;/div&gt;.',
                'CSS: &amp;#123; margin: 0 &amp;#125;.'
            ]);
        });

        it('protects entities in technical documentation', () => {
            const text = 'HTML标签: <code>&lt;meta&gt;</code>元素。数学符号: &pi; &radic;。特殊字符: &amp; &copy; &reg;。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'HTML标签: &lt;meta&gt;元素。',
                '数学符号: &pi; &radic;。',
                '特殊字符: &amp; &copy; &reg;。'
            ]);
        });

        it('handles mixed content with emoji entities', () => {
            const text = '表情符号: &#x1F600;开心。&#x1F4BB;编程中。警告&#x26A0;注意安全。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '表情符号: &#x1F600;开心。',
                '&#x1F4BB;编程中。',
                '警告&#x26A0;注意安全。'
            ]);
        });
    });

    describe('long string splitting', () => {
        it('handles long hex strings in markdown code blocks', () => {
            // This reproduces the real issue found in DAO Fork documentation
            const hexCode = '0x606060405273da4a4626d3e16e094de3225a751aab7128e96526600060006101000a81548173ffffffffffffffffffffffffffffffffffffffff02191690830217905550610462806100516000396000f360606040526000357c0100000000000000000000000000000000000000000000000000000000900480632e6e504a1461005a5780633ccfd60b14610069578063eedcf50a14610078578063fdf97cb2146100b157610058565b005b61006760048050506100ea565b005b6100766004805050610277565b005b6100856004805050610424565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6100be600480505061043c565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b600060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16600073bb9bc244d798123fde783fcc1c72d3bb8c18941373ffffffffffffffffffffffffffffffffffffffff166318160ddd604051817c01000000000000000000000000000000000000000000000000000000000281526004018090506020604051808303816000876161da5a03f115610002575050506040518051906020015073bb9bc244d798123fde783fcc1c72d3bb8c18941373ffffffffffffffffffffffffffffffffffffffff166370a0823130604051827c0100000000000000000000000000000000000000000000000000000000028152600401808273ffffffffffffffffffffffffffffffffffffffff1681526020019150506020604051808303816000876161da5a03f11561000257505050604051805190602001503073ffffffffffffffffffffffffffffffffffffffff16310103604051809050600060405180830381858888f19350505050505b565b600073bb9bc244d798123fde783fcc1c72d3bb8c18941373ffffffffffffffffffffffffffffffffffffffff166370a0823133604051827c0100000000000000000000000000000000000000000000000000000000028152600401808273ffffffffffffffffffffffffffffffffffffffff1681526020019150506020604051808303816000876161da5a03f1156100025750505060405180519060200150905073bb9bc244d798123fde783fcc1c72d3bb8c18941373ffffffffffffffffffffffffffffffffffffffff166323b872dd333084604051847c0100000000000000000000000000000000000000000000000000000000028152600401808473ffffffffffffffffffffffffffffffffffffffff1681526020018373ffffffffffffffffffffffffffffffffffffffff16815260200182815260200193505050506020604051808303816000876161da5a03f1156100025750505060405180519060200150158061041657503373ffffffffffffffffffffffffffffffffffffffff16600082604051809050600060405180830381858888f19350505050155b1561042057610002565b5b50565b73bb9bc244d798123fde783fcc1c72d3bb8c18941381565b600060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff168156';
            
            const markdownText = `The deployment code of the contract is:

\`\`\`plain
${hexCode}
\`\`\`

This deployment results in the runtime bytecode.`;

            const chunks = splitIntoChunks(markdownText);
            
            // All chunks should be within token limit (using 512 as stricter limit)
            const maxChunkLength = Math.max(...chunks.map(chunk => chunk.content.length));
            assert.ok(maxChunkLength <= 512, `Longest chunk is ${maxChunkLength} chars, should be <= 512`);
        });

        it('handles ethereum address lists in markdown', () => {
            // This reproduces another issue found in documentation  
            const addressList = `0xd4fe7bc31cedb7bfb8a345f31e668033056b2728,
0xb3fb0e5aba0e20e5c49d252dfd30e102b171a425,
0x2c19c7f9ae8b751e37aeb2d93a699722395ae18f,
0xecd135fa4f61a655311e86238c92adcd779555d2,
0x1975bd06d486162d5dc297798dfc41edd5d160a7,
0xa3acf3a1e16b1d7c315e23510fdd7847b48234f6,
0x319f70bab6845585f412ec7724b744fec6095c85,
0x06706dd3f2c9abf0a21ddcc6941d9b86f0596936,
0x5c8536898fbb74fc7445814902fd08422eac56d0,
0x6966ab0d485353095148a2155858910e0965b6f9`;

            const markdownText = `At block 1880000, the following accounts are encoded into a list:

\`\`\`plain
${addressList}
\`\`\`

All these accounts will be processed.`;

            const chunks = splitByPunctuation(markdownText);
            
            // All chunks should be within token limit
            const maxChunkLength = Math.max(...chunks.map(chunk => chunk.length));
            assert.ok(maxChunkLength <= 512, `Longest chunk is ${maxChunkLength} chars, should be <= 512`);
        });
    });

    describe('quotation marks', () => {
        it('handles English quotes containing punctuation', () => {
            const text = 'He said "Stop here! Think about it..." and left. She replied "No way?" firmly.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'He said "Stop here! Think about it..." and left.',
                'She replied "No way?" firmly.'
            ]);
        });

        it('handles Chinese quotes containing punctuation', () => {
            const text = '他说"别着急！想清楚……"就离开了。她回答"不行？"很坚定。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '他说"别着急！想清楚……"就离开了。',
                '她回答"不行？"很坚定。'
            ]);
        });

        it('handles mixed English and Chinese quotes', () => {
            const text = '错误提示是"Error: file not found！"。控制台显示"Warning: timeout..."。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '错误提示是"Error: file not found！"。',
                '控制台显示"Warning: timeout..."。'
            ]);
        });

        it('handles quotes with technical content', () => {
            const text = '执行 "npm install" 失败。提示 "Connection refused." 错误。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '执行 "npm install" 失败。',
                '提示 "Connection refused." 错误。'
            ]);
        });

        it('handles nested quotes', () => {
            const text = '老师说："小明问\'这道题怎么做？\'我回答\'按步骤来\'"。课堂很安静。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '老师说："小明问\'这道题怎么做？\'我回答\'按步骤来\'"。',
                '课堂很安静。'
            ]);
        });

        it('handles quotes with special characters', () => {
            const text = '配置项："host: test.com, port: 8080"。参数：「x = 1, y = 2」。选项：『a | b | c』。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '配置项："host: test.com, port: 8080"。',
                '参数：「x = 1, y = 2」。',
                '选项：『a | b | c』。'
            ]);
        });

        it('handles double quotes (「」) in suggestion text', () => {
            const text = '下次你想要玩具时可以用嘴巴说：「我想玩这个，可以吗？」好好商量着来。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '下次你想要玩具时可以用嘴巴说：「我想玩这个，可以吗？」好好商量着来。'
            ]);
        });

        it('handles double quotes (“”) in suggestion text', () => {
            const text = '下次你想要玩具时可以用嘴巴说：“我想玩这个，可以吗？”好好商量着来。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '下次你想要玩具时可以用嘴巴说：“我想玩这个，可以吗？”好好商量着来。'
            ]);
        });

        it('handles double quotes (‘’) in suggestion text', () => {
            const text = '下次你想要玩具时可以用嘴巴说：‘我想玩这个，可以吗？’好好商量着来。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '下次你想要玩具时可以用嘴巴说：‘我想玩这个，可以吗？’好好商量着来。'
            ]);
        });

        it('handles book title quotes (《》) in text', () => {
            const text = '推荐阅读《三体》和《时间简史!》。文章发表在《科学月刊》上。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '推荐阅读《三体》和《时间简史!》。',
                '文章发表在《科学月刊》上。'
            ]);
        });

        it('handles bracket quotes (【】) in text', () => {
            const text = '系统提示【请注意备份数据！】很重要。页面显示【加载中...】状态。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '系统提示【请注意备份数据！】很重要。',
                '页面显示【加载中...】状态。'
            ]);
        });

        it('handles mixed Chinese quotation marks', () => {
            const text = '小说《西游记》中说"孙悟空大闹天宮"，「师徒四人」历经磨难，『取经之路!』漫漫。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '小说《西游记》中说"孙悟空大闹天宮"，「师徒四人」历经磨难，『取经之路!』漫漫。'
            ]);
        });
    });
});
