## ByteWise — C/C++ Struct Analyzer for VS Code

ByteWise helps C/C++ developers understand and optimize the memory layout of their `struct`s. It visualizes field sizes, alignment, padding, and suggests reordering to reduce memory usage. An interactive webview shows a byte-accurate layout with quick actions to export, copy, and apply optimized definitions.

---

## Features

- **Struct analysis**: Parse and analyze `struct` definitions to compute field offsets, sizes, alignment, total size, and padding.
- **Selection and file analysis**: Analyze just your selection or every `struct` in the active file.
- **Inline hints (hover)**: Hover a struct field to see size and alignment details in-editor.
- **Optimization diagnostics**: Info diagnostics appear for structs with potential memory savings via reordering.
- **Interactive webview**: Visual layout, field details, optimized ordering suggestions, and export tools.
- **Actionable commands**: Copy optimized code, apply it into the editor, and export analysis to Markdown.
- **Configurable**: Alignment, type sizes (embedded targets), inline hints, themes, and auto-analyze on save.

### New: Project Structure with Optimization Status

- Workspace-aware file tree for C/C++ files relative to your opened VS Code workspace
- Color-coded file names: green if all structs are optimal (or no structs), red if any struct has savings
- Click a file name to load its analysis in the webview
- Apply Optimization replaces the struct definition in-place; reopens the file if needed

---

## Installation

### From the VS Code Marketplace

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for "ByteWise - C/C++ Struct Analyzer".
4. Click Install.

### From source

1. Clone the repository.
2. Run `npm install`.
3. Open the folder in VS Code.
4. Press F5 to launch an Extension Development Host.

### Usage

Once installed and activated, ByteWise automatically provides features when working with C/C++ files.

#### Analyzing Structs

You can analyze structs in several ways:

- **Analyze All Structs in File**: Command Palette → “ByteWise: Analyze All Structs in File”.
- **Analyze Selected Struct**: Select struct definitions → Command Palette → “ByteWise: Analyze Selected Struct”.
- **Analyze Struct Layout**: Command Palette → “ByteWise: Analyze Struct Layout” (also in editor title bar).
- **Context Menu**: Right-click within C/C++ files to access ByteWise actions.

#### Inline Hints

- Hover a struct field line to see its size, alignment, and array details (if any).

#### Optimization Diagnostics

- Info diagnostics appear under struct declarations with potential memory savings from reordering. Hover for details.

#### Project Structure Panel

- The analysis view includes a Project Structure section listing relevant C/C++ files.
- File names are colored by status: green for optimal/no-structs, red if optimizations are available.
- Click a file name to show its analysis right in the webview.

#### Apply Optimization

- Replaces the original `struct` definition in-place (supports both `struct Name { ... };` and `typedef struct { ... } Name;`). If the file isn’t open, it’s reopened automatically.

---

## Configuration

You can customize ByteWise's behavior through VS Code settings:

1.  Go to `File` > `Preferences` > `Settings` (`Code` > `Preferences` > `Settings` on macOS).
2.  Search for "ByteWise".

Available settings (see also `package.json` contributes → configuration):

- `bytewise.targetAlignment` (number, default 8): Target platform alignment (4 or 8).
- `bytewise.showOptimizations` (boolean, default true): Show optimization diagnostics.
- `bytewise.customTypeSizes` (object): Custom type sizes for embedded targets (e.g., `{ "int": 2, "long": 4 }`).
- `bytewise.showInlineHints` (boolean, default true): Enable inline hover hints.
- `bytewise.colorTheme` (string, default "default"): `default` | `colorblind` | `high-contrast`.
- `bytewise.analyzeOnSave` (boolean, default true): Re-analyze automatically on save.

Example `settings.json`:

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

Supported languages: C and C++ (`.c`, `.cpp`, `.h`, `.hpp`).

---

## How it works (high level)

- Cleans source (removes comments and directives) and locates `struct` definitions.
- Parses fields, computing sizes and alignments using a configurable type table.
- Builds a byte-accurate layout with offsets and padding; proposes a reordered variant to reduce padding.
- Renders a webview visualization; actions allow copying/applying optimized code and exporting Markdown reports.

All analysis runs locally inside VS Code; no code is sent externally.

---

## Development

Prerequisites: Node.js, npm, and VS Code ≥ 1.74.

1. Fork and clone the repo.
2. `npm install`.
3. Open the project in VS Code.
4. Press F5 to launch the Extension Development Host.

Run tests:

```bash
npm test
```

Project structure (high level):

```text
src/
  constants.js
  structAnalyzer.js
  webViewProvider.js
  generators/
    htmlGenerator.js
    markdownGenerator.js
  parsers/
    fieldParser.js
  utils/
    typeUtils.js
    layoutUtils.js

Media assets for the marketplace should live in `media/` (e.g., `media/analysis.png`, `media/project-tree.png`). Add screenshots/GIFs and reference them below.

## Screenshots

Place images in `media/`:

![Analysis View](media/analysis.png)
![Project Tree](media/project-tree.png)

## Commands

- ByteWise: Analyze Struct Layout (`bytewise.analyzeStruct`)
- ByteWise: Analyze Selected Struct (`bytewise.analyzeSelection`)
- ByteWise: Analyze All Structs in File (`bytewise.analyzeFile`)
- ByteWise: ByteWise Settings (`bytewise.openSettings`)
```

See `CHANGELOG.md` for notable updates.

---

## Contributing

We welcome contributions!

1. Open an issue to discuss bugs or enhancements.
2. Create a feature branch from `main`.
3. Keep edits focused and readable; add tests when reasonable.
4. Ensure `npm test` passes and address lint warnings.
5. Open a PR with a clear description and screenshots/GIFs for UI changes.

Guidelines:

- Favor explicit naming and early returns; avoid deep nesting.
- Keep UX simple and accessible (colorblind and high-contrast modes available).
- Do not add telemetry or send any user code externally.

If uncertain, open a Draft PR early for feedback.

---

## License

MIT — see `LICENSE.md`.

---
