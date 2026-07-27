import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/textsplitter.js';

describe('Mathematical Expressions', () => {
    it('handles simple mathematical expressions', () => {
        const text = 'Pi equals 3.14159. The value e is about 2.71828. Temperature is -5.5 degrees.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Pi equals 3.14159.',
            'The value e is about 2.71828.',
            'Temperature is -5.5 degrees.'
        ]);
    });

    it('handles complex mathematical expressions', () => {
        const text = 'The formula is E = mc^2. Force F = -k.x where k=9.8. Let x = -3.14 * y.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'The formula is E = mc^2.',
            'Force F = -k.x where k=9.8.',
            'Let x = -3.14 * y.'
        ]);
    });

    it('handles mathematical expressions with variables', () => {
        const text = 'Given f(x) = 2.5x + 3.7. When x = 1.5, f(x) = 7.45.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Given f(x) = 2.5x + 3.7.',
            'When x = 1.5, f(x) = 7.45.'
        ]);
    });

    it('handles percentage and confidence intervals', () => {
        const text = '0-1项危险因素：死亡率3.2%（可信区间：0.1~16.7）';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            '0-1项危险因素：死亡率3.2%（可信区间：0.1~16.7）'
        ]);
    });

    describe('ratio expressions', () => {
        it('handles simple ratios', () => {
            const text = '混合比例为 1:2。溶液浓度 1:4。配比 3:1:6。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '混合比例为 1:2。',
                '溶液浓度 1:4。',
                '配比 3:1:6。'
            ]);
        });

        it('handles ratio lists', () => {
            const text = '实验组比例：1:2, 1:3, 1:4。对照组比例：2:1, 3:1。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '实验组比例：1:2, 1:3, 1:4。',
                '对照组比例：2:1, 3:1。'
            ]);
        });

        it('handles complex ratio expressions', () => {
            const text = '配方比例 A:B:C = 1:2:3。混合物 X:Y = 1.5:2.5。浓度 P:Q:R:S 为 1:2:3:4。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '配方比例 A:B:C = 1:2:3。',
                '混合物 X:Y = 1.5:2.5。',
                '浓度 P:Q:R:S 为 1:2:3:4。'
            ]);
        });

        it('handles ratios with units and descriptions', () => {
            const text = '水泥:砂子:石子=1:2.5:4。油:水质量比 1:1。溶液 A:B 体积比 = 3:7。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '水泥:砂子:石子=1:2.5:4。',
                '油:水质量比 1:1。',
                '溶液 A:B 体积比 = 3:7。'
            ]);
        });

        it('handles ratio ranges and alternatives', () => {
            const text = '最佳比例范围 1:2~1:3。可选配比：1:2 或 1:3。比值在 2:1-3:1 之间。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '最佳比例范围 1:2~1:3。',
                '可选配比：1:2 或 1:3。',
                '比值在 2:1-3:1 之间。'
            ]);
        });

        it('handles mixed ratio formats', () => {
            const text = '比例 1：2。比例 1:2。配比 1∶2。浓度 1︰2。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '比例 1：2。',
                '比例 1:2。',
                '配比 1∶2。',
                '浓度 1︰2。'
            ]);
        });
    });

    describe('Chinese number lists', () => {
        it('handles simple number lists with "、"', () => {
            const text = '主要包括：1、2、3、4、5、6。采购清单：10、20、30、40。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '主要包括：1、2、3、4、5、6。',
                '采购清单：10、20、30、40。'
            ]);
        });

        it('handles number lists with descriptions', () => {
            const text = '1、准备材料 2、开始实验 3、记录数据 4、分析结果。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '1、准备材料 2、开始实验 3、记录数据 4、分析结果。'
            ]);
        });
    });
});
