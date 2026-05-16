import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPunctuation } from '../lib/index.js';

describe('Multilingual Support', () => {
    describe('Japanese Text', () => {
        describe('Basic Features', () => {
            it('handles Japanese sentences and filenames', () => {
                const text = '新しいファイル ドキュメント.pdf を開いています。写真.jpg も確認してください！';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '新しいファイル ドキュメント.pdf を開いています。',
                    '写真.jpg も確認してください！'
                ]);
            });
        });

        describe('Punctuation and Special Characters', () => {
            it('handles Japanese middle dots and wave dash', () => {
                const text = 'ページ・セクション。タイトル〜サブタイトル。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    'ページ・セクション。',
                    'タイトル〜サブタイトル。'
                ]);
            });
        });

        describe('Text Structure', () => {
            it('handles Japanese enumeration', () => {
                const text = 'イ、第一章。ロ、第二章。ハ、第三章。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    'イ、第一章。',
                    'ロ、第二章。',
                    'ハ、第三章。'
                ]);
            });

            it('handles Japanese company abbreviations', () => {
                const text = '株）テスト会社。有）サンプル。合）事例会社。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '株）テスト会社。',
                    '有）サンプル。',
                    '合）事例会社。'
                ]);
            });
        });
    });

    describe('Chinese Text', () => {
        describe('Basic Features', () => {
            it('splits simple Chinese sentences', () => {
                const text = '今天天气真好。我们去公园玩吧！你觉得怎么样？';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '今天天气真好。',
                    '我们去公园玩吧！',
                    '你觉得怎么样？'
                ]);
            });

            it('handles mixed Chinese and English content', () => {
                const text = '我正在使用 Node.js v18.15.0 版本。这个 API 的版本是 2.1.0。请访问 https://docs.example.com 了解更多。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '我正在使用 Node.js v18.15.0 版本。',
                    '这个 API 的版本是 2.1.0。',
                    '请访问 https://docs.example.com 了解更多。'
                ]);
            });
        });

        describe('Text Structure', () => {
            it('保护 Chinese names and titles', () => {
                const text = '张教授。正在讲课。李医生。在看病。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '张教授。',
                    '正在讲课。',
                    '李医生。',
                    '在看病。'
                ]);
            });

            it('handles Chinese punctuation marks', () => {
                const text = '你好！这是一个测试。。。真的吗？？？太棒了！！！';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '你好！',
                    '这是一个测试。。。',
                    '真的吗？？？',
                    '太棒了！！！'
                ]);
            });
        });

        describe('Numbering Systems', () => {
            it('handles Chinese numeric enumeration', () => {
                const text = '一、引言。二、内容。三、结论。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '一、引言。',
                    '二、内容。',
                    '三、结论。'
                ]);
            });

            it('handles mixed numbering formats', () => {
                const text = '第1章。第二章。Part III。';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '第1章。',
                    '第二章。',
                    'Part III。'
                ]);
            });
        });
    });

    describe('Other Asian Languages', () => {
        describe('Korean Text', () => {
            it('handles Korean sentences and filenames', () => {
                const text = '문서.pdf 파일을 열었습니다. 사진.jpg 확인해주세요！';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    '문서.pdf 파일을 열었습니다.',
                    '사진.jpg 확인해주세요！'
                ]);
            });
        });

        describe('Thai Text', () => {
            it('handles Thai sentences with mixed punctuation', () => {
                const text = 'สวัสดี! นี่คือการทดสอบ? ขอบคุณ.';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    'สวัสดี!',
                    'นี่คือการทดสอบ?',
                    'ขอบคุณ.'
                ]);
            });
        });
    });

    describe('European and Middle Eastern Languages', () => {
        describe('Russian Text', () => {
            it('handles Russian sentences and filenames', () => {
                const text = 'Открыть документ.pdf и фото.jpg. Проверить результаты.xlsx!';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    'Открыть документ.pdf и фото.jpg.',
                    'Проверить результаты.xlsx!'
                ]);
            });
        });

        describe('Arabic Text', () => {
            it('handles Arabic sentences and filenames', () => {
                const text = 'افتح الملف وثيقة.pdf والصورة.jpg. تحقق من النتائج.xlsx!';
                const chunks = splitByPunctuation(text);
                assert.deepEqual(chunks, [
                    'افتح الملف وثيقة.pdf والصورة.jpg.',
                    'تحقق من النتائج.xlsx!'
                ]);
            });
        });
    });

    describe('Mixed Language Support', () => {
        it('handles mixed language with consecutive punctuation', () => {
            const text = 'Hello世界！！...What？？？你好。。。';
            const chunks = splitByPunctuation(text);
            assert.deepEqual(chunks, [
                'Hello世界！！...',
                'What？？？',
                '你好。。。'
            ]);
        });
    });
});
