const vscode = require("vscode");
const {
  getDefaultTypeSizes,
  getTypeSize,
  getTypeAlignment,
  cleanCode,
} = require("./utils/typeUtils");
const { calculateLayout, optimizeLayout } = require("./utils/layoutUtils");
const { parseFields } = require("./parsers/fieldParser");
const { DEFAULT_ALIGNMENT } = require("./constants");

/**
 * Analyzes C/C++ struct memory layouts and provides optimization suggestions
 */
class StructAnalyzer {
  /**
   * Create a new StructAnalyzer instance
   */
  constructor() {
    this.updateConfig();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("bytewise")) {
        this.updateConfig();
      }
    });
  }

  /**
   * Update configuration settings from VS Code workspace
   */
  updateConfig() {
    const config = vscode.workspace.getConfiguration("bytewise");
    this.targetAlignment = config.get("targetAlignment", DEFAULT_ALIGNMENT);

    // Merge default type sizes with custom ones
    this.typeSizes = {
      ...getDefaultTypeSizes(this.targetAlignment),
      ...config.get("customTypeSizes", {}),
    };
  }

  /**
   * Parse structs from C/C++ code
   * @param {string} text - The source code text
   * @returns {Array} Array of StructInfo objects
   */
  parseStructs(text) {
    const structs = [];

    // Remove comments and preprocessor directives
    text = cleanCode(text);

    // Match struct definitions (including typedef structs and anonymous structs)
    const structRegex =
      /(?:typedef\s+)?struct\s*(\w+)?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}(?:\s*(\w+))?(\s*\[[^\]]*\])?\s*;/g;
    let match;

    while ((match = structRegex.exec(text)) !== null) {
      try {
        const [fullMatch, structName, body, typedefName] = match;
        const name = typedefName || structName || "anonymous";
        const fields = parseFields(body, this.targetAlignment, this.typeSizes);

        if (fields.length === 0) {
          continue; // Skip empty structs
        }

        const layout = calculateLayout(fields);
        const optimization = optimizeLayout(layout.fields);

        structs.push({
          name,
          fields: layout.fields,
          totalSize: layout.totalSize,
          paddingBytes: layout.paddingBytes,
          ...optimization,
          sourceMatch: fullMatch,
        });
      } catch (error) {
        console.warn(`Failed to parse struct: ${error.message}`);
        continue;
      }
    }

    return structs;
  }

  /**
   * Get the size of a type in bytes (delegated to utility)
   * @param {string} type - The type name
   * @param {number} arraySize - Array size (default 1)
   * @returns {number} Size in bytes
   */
  getTypeSize(type, arraySize = 1) {
    return getTypeSize(type, arraySize, this.typeSizes);
  }

  /**
   * Get the alignment requirement of a type (delegated to utility)
   * @param {string} type - The type name
   * @returns {number} Alignment in bytes
   */
  getTypeAlignment(type) {
    return getTypeAlignment(type, this.targetAlignment, this.typeSizes);
  }
}

module.exports = { StructAnalyzer };
