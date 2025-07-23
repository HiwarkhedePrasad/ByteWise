---
# ByteWise VS Code Extension

ByteWise is a VS Code extension designed to help C/C++ developers understand and optimize the memory layout of their `struct`s. It provides insights into struct sizing, padding, and potential memory savings through reordering.
---

## Features

- **Struct Analysis**: Analyze `struct` definitions in your C/C++ code to visualize their memory layout, including individual field sizes, padding, and total struct size.
- **Selection Analysis**: Analyze only a selected portion of your code for `struct` definitions.
- **File Analysis**: Analyze all `struct`s within the active file and get a summary of total bytes, padding, and potential savings.
- **Inline Hints (Hover)**: Hover over `struct` members to see their size and alignment information directly in the editor.
- **Optimization Diagnostics**: Get real-time VS Code diagnostics (warnings/information) highlighting `struct`s that can be optimized for memory savings due to padding.
- **Interactive Web View**: A dedicated web view panel displays a detailed, interactive breakdown of your `struct`s' memory layout.
- **Settings Integration**: Customize ByteWise behavior through VS Code settings, including toggling inline hints and optimization diagnostics.

---

## Getting Started

### Installation

1.  Open VS Code.
2.  Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3.  Search for "ByteWise".
4.  Click **Install**.

### Usage

Once installed and activated, ByteWise automatically provides features when working with C/C++ files.

#### Analyzing Structs

You can analyze structs in several ways:

- **Analyze Active File**:

  1.  Open a C/C++ file containing `struct` definitions.
  2.  Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
  3.  Type "ByteWise: Analyze File" and select the command.
  4.  An interactive web view will appear with the analysis, and a summary message will be shown.

- **Analyze Selection**:

  1.  Select a `struct` definition or multiple `struct` definitions in your C/C++ file.
  2.  Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
  3.  Type "ByteWise: Analyze Selection" and select the command.
  4.  An interactive web view will appear with the analysis of the selected structs.

- **Context Menu (Right-Click)**:
  1.  Right-click anywhere in a C/C++ file.
  2.  Look for "ByteWise" options in the context menu to analyze the file or selected text.

#### Inline Hints

- Simply **hover your mouse** over a member variable within a `struct` definition in your C/C++ file. A hover tooltip will appear showing its size and alignment.

#### Optimization Diagnostics

- ByteWise will automatically display **information diagnostics** (light blue squiggly underlines) under `struct` definitions that have potential memory savings due to padding. Hover over these diagnostics to see the estimated savings.

---

## Configuration

You can customize ByteWise's behavior through VS Code settings:

1.  Go to `File` > `Preferences` > `Settings` (`Code` > `Preferences` > `Settings` on macOS).
2.  Search for "ByteWise".

Available settings:

- **`bytewise.showInlineHints`**: Enable or disable inline hover hints for struct members (default: `true`).
- **`bytewise.showOptimizations`**: Enable or disable diagnostic messages for struct optimization opportunities (default: `true`).

---

## Contributing

(If this were a real project, you'd add information here about how to contribute, file issues, etc.)

---

## License

(If this were a real project, you'd add license information here, e.g., MIT, Apache 2.0, etc.)

---
