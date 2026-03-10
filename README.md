# ByteWise — C/C++ Struct Analyzer for VS Code

[![VS Code Version](https://img.shields.io/badge/VS%20Code-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.3.5-green.svg)](https://github.com/HiwarkhedePrasad/ByteWise)

**ByteWise** is a powerful Visual Studio Code extension designed to help C and C++ developers understand, analyze, and optimize the memory layout of their `struct` and `union` definitions. By visualizing field sizes, alignment requirements, padding bytes, and suggesting optimal field reordering, ByteWise enables developers to reduce memory footprint and improve cache efficiency in performance-critical applications.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Analysis Capabilities

| Feature | Description |
|---------|-------------|
| **Struct Analysis** | Parse and analyze `struct` and `union` definitions to compute field offsets, sizes, alignment requirements, total size, and padding bytes |
| **Selection & File Analysis** | Analyze just your selected code or every `struct` in the active file |
| **Inline Hints (Hover)** | Hover over a struct field to see size, alignment, and array details directly in the editor |
| **Optimization Diagnostics** | Info diagnostics appear for structs with potential memory savings via field reordering |
| **Interactive Webview** | Visual byte-accurate layout with field details, optimized ordering suggestions, and export tools |
| **Actionable Commands** | Copy optimized code, apply it into the editor, and export analysis to Markdown |

### Project Structure Panel (New in v1.2.3)

The extension now includes a workspace-aware project structure panel that provides:

- **File Tree View**: Displays all C/C++ files relative to your opened VS Code workspace
- **Color-Coded Status**: 
  - 🟢 **Green** — All structs are optimal or no structs found
  - 🔴 **Red** — One or more structs have optimization opportunities
- **Quick Navigation**: Click a file name to load its analysis in the webview
- **Apply Optimization**: Replaces struct definitions in-place; reopens the file if needed

---

## Installation

### From VS Code Marketplace

1. Open Visual Studio Code
2. Navigate to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for **"ByteWise - C/C++ Struct Analyzer"**
4. Click **Install**

### From Source

```bash
# Clone the repository
git clone https://github.com/HiwarkhedePrasad/ByteWise.git

# Navigate to the project directory
cd ByteWise

# Install dependencies
npm install
```

Then open the folder in VS Code and press **F5** to launch an Extension Development Host for testing.

---

## Usage

Once installed and activated, ByteWise automatically provides features when working with C/C++ files (`.c`, `.cpp`, `.h`, `.hpp`).

### Analyzing Structs

You can analyze structs in several ways:

| Method | Description |
|--------|-------------|
| **Command Palette** | Press `Ctrl+Shift+P` → Type "ByteWise" → Select a command |
| **Editor Title Bar** | Click the analysis icon in the editor title bar |
| **Context Menu** | Right-click within C/C++ files to access ByteWise actions |
| **Auto-Analysis** | Automatically analyzes on file save (configurable) |

#### Available Commands

| Command | Description |
|---------|-------------|
| `ByteWise: Analyze Struct Layout` | Analyze and display the struct layout in the webview |
| `ByteWise: Analyze Selected Struct` | Analyze only the selected struct definition |
| `ByteWise: Analyze All Structs in File` | Analyze every struct in the current file |
| `ByteWise: ByteWise Settings` | Open extension settings |

### Inline Hints

Hover over any struct field line to see detailed information:

- **Size**: Memory size in bytes
- **Alignment**: Alignment requirement in bytes
- **Array Details**: Array size and element size (if applicable)

### Optimization Diagnostics

Info diagnostics appear under struct declarations with potential memory savings. Hover over the diagnostic to see:
- Number of bytes that can be saved
- Percentage reduction in memory usage

### Project Structure Panel

The analysis view includes a **Project Structure** section:
1. Lists all relevant C/C++ files in your workspace
2. Color-codes files by optimization status
3. Click any file name to show its analysis in the webview

### Apply Optimization

The **Apply Optimization** feature:
- Replaces the original `struct` definition in-place
- Supports both `struct Name { ... };` and `typedef struct { ... } Name;` formats
- Automatically reopens the file if needed

---

## Configuration

Customize ByteWise through VS Code settings:

1. Go to `File` > `Preferences` > `Settings` (`Code` > `Preferences` > `Settings` on macOS)
2. Search for **"ByteWise"**

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `bytewise.targetAlignment` | number | `8` | Target platform alignment (4 or 8 bytes) |
| `bytewise.showOptimizations` | boolean | `true` | Show struct optimization suggestions |
| `bytewise.customTypeSizes` | object | `{}` | Custom type sizes for embedded targets |
| `bytewise.showInlineHints` | boolean | `true` | Show inline hover hints for struct fields |
| `bytewise.colorTheme` | string | `"default"` | Color theme: `default`, `colorblind`, or `high-contrast` |
| `bytewise.analyzeOnSave` | boolean | `true` | Re-analyze automatically on save |

### Example Configuration

```json
{
  "bytewise.targetAlignment": 8,
  "bytewise.showOptimizations": true,
  "bytewise.customTypeSizes": {
    "int": 2,
    "long": 4
  },
  "bytewise.showInlineHints": true,
  "bytewise.colorTheme": "default",
  "bytewise.analyzeOnSave": true
}
```

### Supported Languages

- C (`.c`, `.h`)
- C++ (`.cpp`, `.hpp`)

---

## How It Works

ByteWise performs struct analysis through the following steps:

```
┌─────────────────────┐
│  Source Code Input  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Clean Source Code   │  ← Remove comments and preprocessor directives
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Locate Structs      │  ← Find struct/union definitions
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Parse Fields        │  ← Extract type, name, arrays, bitfields
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Compute Layout      │  ← Calculate offsets, alignment, padding
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Optimize Ordering   │  ← Propose reordered variant to reduce padding
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Render Webview      │  ← Visual layout with actions
└─────────────────────┘
```

**Key Points:**
- All analysis runs **locally** inside VS Code
- **No code is sent externally** — your source code remains private
- Uses a configurable type table for size and alignment calculations

---

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Visual Studio Code (≥ 1.74.0)

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ByteWise.git
cd ByteWise

# Install dependencies
npm install

# Open in VS Code
code .
```

Press **F5** to launch the Extension Development Host.

### Running Tests

```bash
# Run unit tests
npm test

# Run VS Code integration tests
npm run test:vscode
```

### Project Structure

```
ByteWise/
├── extension.js              # Main entry point
├── package.json              # Extension manifest
├── jsconfig.json             # JavaScript configuration
├── eslint.config.mjs         # ESLint configuration
├── src/
│   ├── constants.js          # Extension constants
│   ├── structAnalyzer.js     # Core analysis logic
│   ├── webViewProvider.js    # Webview management
│   ├── generators/
│   │   ├── htmlGenerator.js  # HTML output generation
│   │   └── markdownGenerator.js # Markdown export
│   ├── parsers/
│   │   └── fieldParser.js    # Field parsing logic
│   ├── templates/
│   │   └── webviewTemplate.js # Webview HTML templates
│   └── utils/
│       ├── index.js          # Utility exports
│       ├── layoutUtils.js    # Layout calculations
│       ├── typeUtils.js      # Type size/alignment
│       └── warningUtils.js   # Warning generation
├── test/
│   ├── extension.test.js     # Extension tests
│   └── unit/
│       ├── enum.test.js      # Enum tests
│       └── parser.test.js    # Parser tests
├── resources/
│   └── icon.png              # Extension icon
└── media/                    # Screenshots and media assets
```

---

## Supported Struct Types

ByteWise handles various C/C++ struct features:

| Feature | Support |
|---------|---------|
| Basic types (int, char, float, etc.) | ✅ |
| Pointers | ✅ |
| Arrays (single & multi-dimensional) | ✅ |
| Bitfields | ✅ |
| Anonymous structs/unions | ✅ |
| Nested structs | ✅ |
| Unions | ✅ |
| `#pragma pack` | ✅ |
| `__attribute__((packed))` | ✅ |
| `__attribute__((aligned))` | ✅ |
| Flexible array members | ✅ |
| Enums (default & fixed underlying type) | ✅ |
| Typedef structs | ✅ |

---

## Contributing

We welcome contributions! Here's how to get started:

### Getting Started

1. **Open an issue** to discuss bugs or enhancements
2. **Fork the repository** and create a feature branch from `main`
3. **Make focused, readable changes** with appropriate tests
4. **Run tests**: Ensure `npm test` passes and address lint warnings
5. **Submit a PR** with a clear description and screenshots/GIFs for UI changes

### Guidelines

- Use explicit naming and early returns; avoid deep nesting
- Keep UX simple and accessible
- Support colorblind and high-contrast themes
- **Do not add telemetry** or send any user code externally

If uncertain, open a **Draft PR** early for feedback.

---

## Changelog

See [CHANGELOG.md](https://github.com/HiwarkhedePrasad/ByteWise/blob/main/CHANGELOG.md) for notable updates.

### Recent Changes (v1.2.3)

- **Added**: Workspace Project Structure panel with clickable files and color-coded optimization status
- **Changed**: Apply Optimization replaces struct definitions in-place
- **Changed**: File names shown relative to workspace
- **Fixed**: Bitfield code generation order
- **Fixed**: Pointer size/alignment for function pointers respects configuration

---

## License

This project is licensed under the MIT License — see the [LICENSE.md](https://github.com/HiwarkhedePrasad/ByteWise/blob/main/LICENSE.md) file for details.

```
MIT License

Copyright (c) 2025 Prasad Hiwarkhede

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## Author

**Prasad Hiwarkhede**

- GitHub: [@HiwarkhedePrasad](https://github.com/HiwarkhedePrasad)
- Repository: [ByteWise](https://github.com/HiwarkhedePrasad/ByteWise)

---

## Support

If you encounter any issues or have suggestions:

1. Check the [Issues](https://github.com/HiwarkhedePrasad/ByteWise/issues) page
2. Open a new issue with:
   - VS Code version
   - ByteWise version
   - Steps to reproduce
   - Expected vs. actual behavior

---

**Happy Coding! Optimize your memory layouts with ByteWise.**
