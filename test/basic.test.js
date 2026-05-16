import { describe, it, odescribe, oit } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/index.js';

describe('Basic Text Processing', () => {
    describe('sentence splitting', () => {
        it('splits simple sentences', () => {
            const text = 'Hello world. This is a test. How are you?';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Hello world.',
                'This is a test.',
                'How are you?'
            ]);
        });

        it('handles empty input', () => {
            assert.deepEqual(splitByPunctuation(''), []);
            assert.deepEqual(splitByPunctuation('   '), []);
        });

        it('handles text without punctuation', () => {
            const text = 'Hello world';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, ['Hello world']);
        });
    });

    describe('common abbreviations', () => {
        it('protects common abbreviations', () => {
            const text = 'Dr. Smith arrived at 9 a.m. Mr. Jones left at 2 p.m. They discussed i.e. important matters.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Dr. Smith arrived at 9 a.m. Mr. Jones left at 2 p.m. They discussed i.e. important matters.'
            ]);
        });

        it('protects etc. and vs. in sentences', () => {
            const text = 'We need apples, oranges, bananas, etc. Team A vs. Team B is tomorrow. Get milk, eggs, etc. from store.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'We need apples, oranges, bananas, etc.',
                'Team A vs. Team B is tomorrow.',
                'Get milk, eggs, etc.',
                'from store.'
            ]);
        });

        it('handles multiple abbreviations in sequence', () => {
            const text = 'Dr. Smith vs. Dr. Jones discussed i.e. vs. e.g. usage, etc. The meeting ended at 3 p.m.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Dr. Smith vs. Dr. Jones discussed i.e. vs. e.g. usage, etc.',
                'The meeting ended at 3 p.m.'
            ]);
        });
    });

    describe('Abbreviations', () => {
        it('handles organization acronyms with periods', () => {
            const text = 'The W.H.O. issued new guidelines. The U.S.A. and U.A.E. signed an agreement. Both N.A.S.A. and C.I.A. were involved.';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'The W.H.O. issued new guidelines.',
                'The U.S.A. and U.A.E. signed an agreement.',
                'Both N.A.S.A. and C.I.A. were involved.'
            ]);
        });

        it('handles scientific names and abbreviations', () => {
            const text = '特别是 M. tuberculosis 和 E. coli。以及 P. aeruginosa 感染。研究 S. aureus 的情况。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '特别是 M. tuberculosis 和 E. coli。',
                '以及 P. aeruginosa 感染。',
                '研究 S. aureus 的情况。'
            ]);
        });

        it('handles mixed scientific names and normal abbreviations', () => {
            const text = 'Dr. Smith 研究 M. tuberculosis。Prof. Johnson 发现 S. pyogenes。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Dr. Smith 研究 M. tuberculosis。',
                'Prof. Johnson 发现 S. pyogenes。'
            ]);
        });

        it('handles complex scientific name patterns', () => {
            const text = '该菌株包括 M. tuberculosis H37Rv。检测 B. subtilis 168。分离的 E. coli K-12。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                '该菌株包括 M. tuberculosis H37Rv。',
                '检测 B. subtilis 168。',
                '分离的 E. coli K-12。'
            ]);
        });
    });
});
