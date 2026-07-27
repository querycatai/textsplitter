import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/textsplitter.js';

describe('List Handling', () => {
    describe('Arabic numbers', () => {
        it('handles numbered list with dots', () => {
            const text = '1. First item. 2. Second item. 3. Third item with [link](https://example.com).';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1. First item.',
                '2. Second item.',
                '3. Third item with [link](https://example.com).'
            ]);
        });

        it('handles mixed numbering styles', () => {
            const text = '1. Top level. 1.1. Sub item. 1.1.1. Detail point。2. Next point。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1. Top level.',
                '1.1. Sub item.',
                '1.1.1. Detail point。',
                '2. Next point。'
            ]);
        });

        it('handles lists with Chinese commas', () => {
            const text = '1、开始。2、继续。3、结束。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1、开始。',
                '2、继续。',
                '3、结束。'
            ]);
        });
    });

    describe('Letter numbering', () => {
        it('handles letter lists with dots', () => {
            const text = 'a. First point. b. Second point. c. Final point.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'a. First point.',
                'b. Second point.',
                'c. Final point.'
            ]);
        });

        it('handles lists with uppercase letters', () => {
            const text = 'A. Major point。B. Important note。C. Conclusion。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'A. Major point。',
                'B. Important note。',
                'C. Conclusion。'
            ]);
        });

        it('handles mixed case letter lists', () => {
            const text = 'A. Top level; a. sub point; b. sub point; B. Next top level.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'A. Top level;',
                'a. sub point;',
                'b. sub point;',
                'B. Next top level.'
            ]);
        });
    });

    describe('Mixed formats', () => {
        it('handles numbers and letters mixed', () => {
            const text = '1: Introduction. A: Background. 2: Methods. B: Procedures.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1: Introduction.',
                'A: Background.',
                '2: Methods.',
                'B: Procedures.'
            ]);
        });
        
        it('handles mixed separators', () => {
            const text = '1. First：detail。2、Second：note。A：Final point。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1. First：detail。',
                '2、Second：note。',
                'A：Final point。'
            ]);
        });

        it('handles nested numbering', () => {
            const text = '(1) Main point. 1) Sub point. a) Detail. (2) Next point.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '(1) Main point.',
                '1) Sub point.',
                'a) Detail.',
                '(2) Next point.'
            ]);
        });
    });

    describe('Colon separated lists', () => {
        it('handles number with colon', () => {
            const text = '1: First point. 2: Second point。3：Third point。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1: First point.',
                '2: Second point。',
                '3：Third point。'
            ]);
        });

        it('handles mixed colon styles', () => {
            const text = '1：内容。A：描述。B: Details. 2: Summary。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1：内容。',
                'A：描述。',
                'B: Details.',
                '2: Summary。'
            ]);
        });

        it('handles nested numbers with colon', () => {
            const text = '1.1: Detailed point. 1.2：细节说明。1.2.1: More detail。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1.1: Detailed point.',
                '1.2：细节说明。',
                '1.2.1: More detail。'
            ]);
        });
    });

    describe('Lists with titles', () => {
        it('handles lists with Chinese title', () => {
            const text = '以下是步骤：1. 第一步。2. 第二步。3. 第三步。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '以下是步骤：',
                '1. 第一步。',
                '2. 第二步。',
                '3. 第三步。'
            ]);
        });

        it('handles mixed style list pairs', () => {
            const text = '这是一组例子：1, a; 2, b; 3, c。最后是结论。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '这是一组例子：',
                '1, a;',
                '2, b;',
                '3, c。',
                '最后是结论。'
            ]);
        });

        it('handles mixed numbering with title', () => {
            const text = '请看以下清单：A.1 首项；A.2 次项；B.1 另一项。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '请看以下清单：',
                'A.1 首项；',
                'A.2 次项；',
                'B.1 另一项。'
            ]);
        });

        it('handles complex list introduction', () => {
            const text = '本次更新包含以下几点：（1）优化性能；（2）修复bug；（3）新功能。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '本次更新包含以下几点：',
                '（1）优化性能；',
                '（2）修复bug；',
                '（3）新功能。'
            ]);
        });
    });

    describe('Complex list formats', () => {
        it('handles mixed separator styles', () => {
            const text = '混合格式：1）第一条、2）第二条，3）第三条。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '混合格式：',
                '1）第一条、',
                '2）第二条，',
                '3）第三条。'
            ]);
        });

        it('handles list with multiple title levels', () => {
            const text = '主要内容：\n一、基础部分：\n1. 概念；\n2. 原理。\n二、进阶部分：\n1. 应用；\n2. 实践。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '主要内容：',
                '一、基础部分：',
                '1. 概念；',
                '2. 原理。',
                '二、进阶部分：',
                '1. 应用；',
                '2. 实践。'
            ]);
        });

        it('handles mixed language list items', () => {
            const text = 'Features list：1. 中文功能；2. English part；3. 混合Mixed。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Features list：',
                '1. 中文功能；',
                '2. English part；',
                '3. 混合Mixed。'
            ]);
        });

        it('handles risk levels with different separators', () => {
            const text = '风险等级分类：低风险：可忽略。中风险：需要关注。高风险：立即处理。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '风险等级分类：低风险：可忽略。',
                '中风险：需要关注。',
                '高风险：立即处理。'
            ]);
        });

        it('handles protein type classification', () => {
            const text = '血红蛋白分型：F型：胎儿型，S型：镰刀型，A型：成人型，C型：异常型。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '血红蛋白分型：F型：胎儿型，S型：镰刀型，A型：成人型，C型：异常型。'
            ]);
        });

        it('handles continuous Chinese words with 、', () => {
            const text = '常见食材：米饭、面条、馒头、包子。配菜：青菜、胡萝卜、土豆。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '常见食材：米饭、面条、馒头、包子。',
                '配菜：青菜、胡萝卜、土豆。'
            ]);
        });

        it('handles letter sequences with 、', () => {
            const text = '维生素种类有A、B、C、D。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '维生素种类有A、B、C、D。'
            ]);
        });
    });
});
