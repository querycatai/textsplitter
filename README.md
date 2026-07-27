# @querycat/textsplitter

A semantic text splitter that intelligently splits text by punctuation, preserves special patterns, and supports markdown content processing with multilingual support.

## Features

### 🎯 Smart Text Splitting
- **Punctuation-based splitting**: Intelligently splits text at sentence boundaries while preserving context
- **Long sentence handling**: Automatically splits sentences longer than 256 characters at appropriate break points
- **Pattern protection**: Preserves special patterns like URLs, emails, file extensions, and technical terms

### 🌍 Multilingual Support
- **Chinese, Japanese, Korean (CJK)**: Full support for Asian languages with proper punctuation handling
- **European languages**: Support for languages with diacritical marks and special characters
- **Middle Eastern languages**: RTL text support including Arabic and Hebrew
- **Mixed language content**: Handles documents with multiple languages seamlessly

### 📝 Markdown Processing
- **Block-level processing**: Handles headers, paragraphs, lists, tables, and code blocks
- **Nested structures**: Properly processes nested lists and complex document structures
- **Table processing**: Converts table data into header-value pairs for better semantic chunking
- **Code preservation**: Keeps code blocks intact as single chunks

### 🔬 Academic and Technical Content
- **Citation handling**: Preserves academic citations and reference formats
- **Mathematical expressions**: Protects mathematical formulas, ratios, and scientific notation
- **Technical patterns**: Handles configuration properties, version numbers, and IP addresses
- **Scientific names**: Preserves biological nomenclature and abbreviations

### 🏷️ Pattern Protection
- **URLs and emails**: Preserves web addresses and email addresses
- **File paths**: Handles file extensions and directory paths
- **HTML entities**: Protects encoded characters and special symbols
- **Quotation marks**: Handles various quote styles including nested quotes
- **Abbreviations**: Preserves common abbreviations and acronyms

## Installation

```bash
npm install @querycat/textsplitter
```

## Quick Start

### Basic Text Splitting

```javascript
import { splitIntoChunks } from '@querycat/textsplitter';

const text = 'Hello world. This is a test. How are you?';
const chunks = splitIntoChunks(text);
console.log(chunks);
// Output: [
//   { blockIndex: 0, content: 'Hello world.' },
//   { blockIndex: 0, content: 'This is a test.' },
//   { blockIndex: 0, content: 'How are you?' }
// ]
```

### Markdown Content Processing

```javascript
import { splitIntoChunks } from '@querycat/textsplitter';

const markdownText = `
# Main Title
This is a paragraph with multiple sentences. Another sentence here.

## Section
- List item 1
- List item 2
  - Nested item
`;

const chunks = splitIntoChunks(markdownText);
chunks.forEach(chunk => {
    console.log(`Block ${chunk.blockIndex}: ${chunk.content}`);
});
```

## API Reference

### `splitIntoChunks(text, maxLength?, options?)`

Splits plain text or markdown content into semantic chunks based on
punctuation marks and block structure.

**Parameters:**
- `text` (string): The input text to split. Markdown is supported but not required.
- `maxLength` (number, optional): Maximum length for each chunk (default: 512)
- `options` (object, optional):
  - `merge` (boolean, default: `true`): Whether to merge tiny fragments left
    over from splitting.
  - `mergeThreshold` (number, default: `maxLength`): Adjacent pairs whose
    combined length is below this threshold are merged into a single chunk
    (capped at `maxLength`).

**Returns:** Array of objects with `blockIndex` and `content` properties

**Example:**
```javascript
const markdown = '# Title\nParagraph text. Another sentence.';
const chunks = splitIntoChunks(markdown);
// Output: [
//   { blockIndex: 0, content: 'Title' },
//   { blockIndex: 1, content: 'Paragraph text.' },
//   { blockIndex: 1, content: 'Another sentence.' }
// ]
```

## Advanced Usage

### Handling Long Sentences

The splitter automatically handles sentences longer than the maximum length:

```javascript
const longText = 'a'.repeat(200) + ', ' + 'b'.repeat(200);
const chunks = splitIntoChunks(longText);
// Automatically splits at comma while preserving punctuation
```

### Multilingual Content

```javascript
const multilingualText = '今天天气真好。我们去公园玩吧！你觉得怎么样？';
const chunks = splitIntoChunks(multilingualText);
// Output: [
//   { blockIndex: 0, content: '今天天气真好。' },
//   { blockIndex: 0, content: '我们去公园玩吧！' },
//   { blockIndex: 0, content: '你觉得怎么样？' }
// ]
```

### Technical Content

```javascript
const technicalText = 'Configure kafka.consumer.request.timeout.ms=3000. Visit https://example.com for details.';
const chunks = splitIntoChunks(technicalText);
// Preserves configuration properties and URLs
```

### Academic Citations

```javascript
const academicText = 'According to Smith et al. (2023), the results were significant. See references (1, 2, 3) for details.';
const chunks = splitIntoChunks(academicText);
// Preserves citation formats and reference numbers
```

## Pattern Protection

The splitter automatically protects various patterns:

- **URLs**: `https://example.com/path?param=1`
- **Emails**: `user@example.com`
- **File paths**: `document.pdf`, `C:\Program Files\App`
- **IP addresses**: `192.168.1.1`
- **Version numbers**: `v1.2.3`, `Node.js 18.15.0`
- **Mathematical expressions**: `E = mc^2`, `x = 1.5`
- **Ratios**: `1:2:3`, `A:B = 3:7`
- **Academic citations**: `Smith, J. R. (2023)`
- **Configuration properties**: `database.connection.timeout=5000`
- **HTML entities**: `&amp;`, `&#169;`, `&#x20;`

## Language Support

### Asian Languages
- **Chinese**: Full support for simplified and traditional Chinese
- **Japanese**: Handles hiragana, katakana, and kanji
- **Korean**: Complete Hangul support
- **Thai**: Thai script support

### European Languages
- **Diacritical marks**: Café, naïve, résumé
- **Special characters**: German umlauts, French accents
- **Cyrillic**: Russian and other Cyrillic scripts

### Middle Eastern Languages
- **Arabic**: Complete RTL support
- **Hebrew**: RTL text processing
- **Persian**: Farsi language support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Keywords

text-splitter, semantic-chunking, punctuation-splitting, markdown-processing, multilingual, chinese, japanese, korean, academic-text, citation-handling, pattern-protection, sentence-splitting, text-processing, nlp, chunking
