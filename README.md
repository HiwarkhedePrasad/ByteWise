# ByteWise — C/C++ Struct Analyzer for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/phiwarkhede.bytewise.svg)](https://marketplace.visualstudio.com/items?itemName=phiwarkhede.bytewise)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/phiwarkhede.bytewise.svg)](https://marketplace.visualstudio.com/items?itemName=phiwarkhede.bytewise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**ByteWise** helps C and C++ developers understand, analyze, and optimize the memory layout of `struct` and `union` definitions — directly inside the editor. It computes field offsets, sizes, alignment, and padding, then suggests an optimal field ordering to shrink your structs.

Everything runs locally. No code is sent anywhere.

---

## Features

### Native Sidebar Tree

A **ByteWise Structs** panel in the Explorer lists every struct in the active file. Expand a struct to see its fields:

```
▸ struct Config            24B · 6B pad
    retryCount   int        4B @ +0
    enabled      bool       1B @ +4
    name         char[16]  16B @ +8
▸ union PacketHeader       8B · 0B pad
```

Structs with recoverable padding get a **⚡ Apply Optimization** inline action.

### Inline Field Highlights

Every struct field is highlighted in your source with a subtle background, plus an overview-ruler marker. Hover a highlighted field for a quick summary:

> **retryCount** — 4B at offset 0, 0B padding before

### Status Bar Summary

A live status bar item keeps the numbers in view:

```
$(symbol-struct) 4 structs · 12B pad · 8B saveable
```

Click it to run a full analysis at any time.

### Optimization Diagnostics

Structs that can be shrink by reordering their fields get an info diagnostic under their declaration with the exact byte savings and percentage reduction.

### One-Click Optimization

**Apply Optimization** rewrites the struct definition in place using the computed optimal field ordering. Fully undoable with `Ctrl+Z`.

---

## Getting Started

1. Install **ByteWise** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=phiwarkhede.bytewise)
2. Open any `.c`, `.cpp`, `.h`, or `.hpp` file
3. Open the **ByteWise Structs** panel in the Explorer — analysis runs automatically on save

### Commands

| Command | Description |
|---------|-------------|
| `ByteWise: Analyze Struct Layout` | Analyze the active file and focus the sidebar panel |
| `ByteWise: Analyze Selected Struct` | Analyze only the selected struct definition |
| `ByteWise: Analyze All Structs in File` | Full analysis with a summary notification |
| `ByteWise: Apply Struct Optimization` | Rewrite a struct with optimal field ordering |
| `ByteWise: ByteWise Settings` | Open ByteWise settings |

---

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `bytewise.targetAlignment` | `4 \| 8` | `8` | Target platform alignment |
| `bytewise.showOptimizations` | boolean | `true` | Show optimization diagnostics |
| `bytewise.customTypeSizes` | object | `{}` | Override type sizes for embedded targets, e.g. `{"int": 2, "long": 4}` |
| `bytewise.showInlineHints` | boolean | `true` | Show hover hints on struct fields |
| `bytewise.analyzeOnSave` | boolean | `true` | Re-analyze on save |

---

## What ByteWise Understands

| Feature | Supported |
|---------|:---------:|
| Basic types (`int`, `char`, `float`, …) | ✅ |
| Pointers (single & multi-level) | ✅ |
| Arrays, single & multi-dimensional | ✅ |
| Bitfields | ✅ |
| Unions & anonymous structs | ✅ |
| Nested structs | ✅ |
| `typedef struct` variants | ✅ |
| Enums (default & fixed underlying type) | ✅ |
| `#pragma pack(N)` | ✅ |
| `__attribute__((packed / aligned(N)))` | ✅ |
| Flexible array members | ✅ |

---

## How It Works

1. **Clean** — comments and preprocessor directives are stripped
2. **Locate** — every `struct`/`union` definition is found via brace matching
3. **Parse** — fields are extracted with types, arrays, bitfields, and attributes
4. **Compute** — offsets, alignment, and padding are calculated per target platform
5. **Optimize** — an alternate field ordering is computed and compared; the difference is reported as potential savings

---

## Development

```bash
git clone https://github.com/HiwarkhedePrasad/ByteWise.git
cd ByteWise
npm install
```

Press `F5` in VS Code to launch the Extension Development Host.

```bash
npm test              # unit tests
npm run test:vscode   # integration tests
```

---

## Contributing

Issues and PRs welcome. Please run `npm test` before submitting and avoid adding telemetry or external code transmission.

## License

MIT — see [LICENSE.md](LICENSE.md).
