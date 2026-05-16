import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/index.js';

describe('Academic Citations', () => {
    it('handles single author names', () => {
        const text = 'Smith, J. R. wrote a paper. Brown, M. B., Jr. did research. Lee, A. B., 3rd published findings.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Smith, J. R. wrote a paper.',
            'Brown, M. B., Jr. did research.',
            'Lee, A. B., 3rd published findings.'
        ]);
    });

    it('handles medical literature citations', () => {
        const text = 'Logigian, E. L., Martens, W. B., Moxley, R. T., 4th, et al. (2010). Mexiletine is an effective antimyotonia treatment in myotonic dystrophy type 1. Neurology, 74(18), 1441-1448. doi: 10.1212/WNL.0b013e3181dc1a3a';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Logigian, E. L., Martens, W. B., Moxley, R. T., 4th, et al. (2010).',
            'Mexiletine is an effective antimyotonia treatment in myotonic dystrophy type 1.',
            'Neurology, 74(18), 1441-1448.',
            'doi: 10.1212/WNL.0b013e3181dc1a3a'
        ]);
    });

    it('handles author names with various suffixes', () => {
        const text = 'Johnson, R. D., Sr. and Smith, A. B., III collaborated. White, M. J., Jr. joined later.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Johnson, R. D., Sr. and Smith, A. B., III collaborated.',
            'White, M. J., Jr. joined later.'
        ]);
    });

    it('handles APA style citations', () => {
        const text = 'According to Smith and Johnson (2023), the results were significant. Recent studies (Brown et al., 2022) show similar findings.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'According to Smith and Johnson (2023), the results were significant.',
            'Recent studies (Brown et al., 2022) show similar findings.'
        ]);
    });

    it('handles book citations', () => {
        const text = 'In "Advanced Theory" (Thompson, M. A., & Wilson, J. B., 2021, pp. 45-67), the authors discuss methodology. The subsequent analysis (ch. 3) reveals key insights.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'In "Advanced Theory" (Thompson, M. A., & Wilson, J. B., 2021, pp. 45-67), the authors discuss methodology.',
            'The subsequent analysis (ch. 3) reveals key insights.'
        ]);
    });

    it('handles conference proceedings citations', () => {
        const text = 'In Proceedings of the 35th International Conference on Computational Linguistics (ICCL 2023) (pp. 78-89). Tokyo, Japan. https://doi.org/10.1234/iccl.2023.123';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'In Proceedings of the 35th International Conference on Computational Linguistics (ICCL 2023) (pp. 78-89).',
            'Tokyo, Japan.',
            'https://doi.org/10.1234/iccl.2023.123'
        ]);
    });

    it('handles Chinese text with bilingual content', () => {
        const text = '病原体志贺菌（Shigella spp.）引起的。';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            '病原体志贺菌（Shigella spp.）引起的。'
        ]);
    });

    it('handles Chinese text with bilingual content', () => {
        const text = '人是T. b. gambiense的主要贮存宿主';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            '人是T. b. gambiense的主要贮存宿主'
        ]);
    });
    

    it('handles numeric references in academic text', () => {
        const text = 'Research shows (1) that this method works. Another study (2) confirms it. See also comments (1, 2) above.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Research shows (1) that this method works.',
            'Another study (2) confirms it.',
            'See also comments (1, 2) above.'
        ]);
    });

    it('handles mixed numeric and author references', () => {
        const text = 'Smith et al. (1) proposed the theory. Later work (2, 3) by Johnson (2020) expanded on this. See reviews (4, 5).';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Smith et al. (1) proposed the theory.',
            'Later work (2, 3) by Johnson (2020) expanded on this.',
            'See reviews (4, 5).'
        ]);
    });

    it('handles numeric references with fullwidth punctuation', () => {
        const text = 'Research shows（1）that this works。Another study（2）confirms it。See comments（1，2）above。';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'Research shows（1）that this works。',
            'Another study（2）confirms it。',
            'See comments（1，2）above。'
        ]);
    });

    it('handles multiple numeric references', () => {
        const text = 'As shown in previous work (1, 2, 3, 4), the method is effective. Recent studies (5, 6, 7) support this claim. See reviews (1-4, 10) for details.';
        const chunks = splitByPunctuation(text);
        assert.deepEqual(chunks, [
            'As shown in previous work (1, 2, 3, 4), the method is effective.',
            'Recent studies (5, 6, 7) support this claim.',
            'See reviews (1-4, 10) for details.'
        ]);
    });
});
