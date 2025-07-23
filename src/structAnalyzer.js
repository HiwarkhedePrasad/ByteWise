const vscode = require("vscode");

class StructAnalyzer {
  constructor() {
    this.updateConfig();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("bytewise")) {
        this.updateConfig();
      }
    });
  }

  updateConfig() {
    const config = vscode.workspace.getConfiguration("bytewise");
    this.targetAlignment = config.get("targetAlignment", 8);

    // Default type sizes for common C/C++ types
    this.typeSizes = {
      // Character types
      char: 1,
      "signed char": 1,
      "unsigned char": 1,

      // Integer types
      short: 2,
      "short int": 2,
      "signed short": 2,
      "unsigned short": 2,
      int: 4,
      "signed int": 4,
      "unsigned int": 4,
      long: this.targetAlignment === 8 ? 8 : 4,
      "long int": this.targetAlignment === 8 ? 8 : 4,
      "signed long": this.targetAlignment === 8 ? 8 : 4,
      "unsigned long": this.targetAlignment === 8 ? 8 : 4,
      "long long": 8,
      "long long int": 8,
      "signed long long": 8,
      "unsigned long long": 8,

      // Fixed-width integer types
      int8_t: 1,
      uint8_t: 1,
      int16_t: 2,
      uint16_t: 2,
      int32_t: 4,
      uint32_t: 4,
      int64_t: 8,
      uint64_t: 8,

      // Floating-point types
      float: 4,
      double: 8,
      "long double": 16,

      // Other types
      size_t: 8,
      ptrdiff_t: 8,
      "void*": 8,
      bool: 1,
      _Bool: 1,

      // Apply custom type sizes
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
    text = this.cleanCode(text);

    // Match struct definitions (including typedef structs and anonymous structs)
    const structRegex =
      /(?:typedef\s+)?struct\s*(\w+)?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}(?:\s*(\w+))?(\s*\[[^\]]*\])?\s*;/g;
    let match;

    while ((match = structRegex.exec(text)) !== null) {
      try {
        const [fullMatch, structName, body, typedefName, arrayDecl] = match;
        const name = typedefName || structName || "anonymous";
        const fields = this.parseFields(body);

        if (fields.length === 0) {
          continue; // Skip empty structs
        }

        const layout = this.calculateLayout(fields);
        const optimization = this.optimizeLayout(layout.fields);

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
   * Clean code by removing comments and preprocessor directives
   * @param {string} text - Raw source code
   * @returns {string} Cleaned code
   */
  cleanCode(text) {
    // Remove single-line comments
    text = text.replace(/\/\/.*$/gm, "");

    // Remove multi-line comments
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove preprocessor directives
    text = text.replace(/^\s*#.*$/gm, "");

    return text;
  }

  /**
   * Parse struct fields from body text
   * @param {string} body - Struct body content
   * @returns {Array} Array of field objects
   */
  parseFields(body) {
    const fields = [];

    // Split by semicolons and filter empty lines
    const lines = body.split(";").filter((line) => line.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Handle different field patterns
      const patterns = [
        // Regular field: type name or type name[size]
        /^\s*(\w+(?:\s*\*)*)\s+(\w+)(?:\[(\d+)\])?\s*$/,
        // Const/volatile modifiers: const type name
        /^\s*(?:const\s+|volatile\s+)*(\w+(?:\s*\*)*)\s+(\w+)(?:\[(\d+)\])?\s*$/,
        // Bit fields: type name : bits
        /^\s*(\w+(?:\s*\*)*)\s+(\w+)\s*:\s*(\d+)\s*$/,
        // Function pointers: return_type (*name)(params)
        /^\s*(\w+)\s*\(\s*\*\s*(\w+)\s*\)\s*\([^)]*\)\s*$/,
      ];

      let fieldMatch = null;
      let patternIndex = -1;

      for (let i = 0; i < patterns.length; i++) {
        fieldMatch = trimmed.match(patterns[i]);
        if (fieldMatch) {
          patternIndex = i;
          break;
        }
      }

      if (fieldMatch) {
        const [, type, name, sizeOrBits] = fieldMatch;

        if (patternIndex === 2) {
          // Bit field
          fields.push({
            name,
            type: type.trim(),
            size: Math.ceil(parseInt(sizeOrBits) / 8), // Convert bits to bytes
            alignment: this.getTypeAlignment(type.trim()),
            offset: 0,
            isBitField: true,
            bits: parseInt(sizeOrBits),
          });
        } else if (patternIndex === 3) {
          // Function pointer
          fields.push({
            name,
            type: "function pointer",
            size: 8, // Pointer size
            alignment: 8,
            offset: 0,
            isFunctionPointer: true,
          });
        } else {
          // Regular field or array
          const arraySize = sizeOrBits ? parseInt(sizeOrBits) : 1;
          const cleanType = type.trim();

          fields.push({
            name,
            type: cleanType,
            size: this.getTypeSize(cleanType, arraySize),
            alignment: this.getTypeAlignment(cleanType),
            offset: 0,
            arraySize: sizeOrBits ? arraySize : undefined,
          });
        }
      }
    }

    return fields;
  }

  /**
   * Get the size of a type in bytes
   * @param {string} type - The type name
   * @param {number} arraySize - Array size (default 1)
   * @returns {number} Size in bytes
   */
  getTypeSize(type, arraySize = 1) {
    // Handle pointers
    if (type.includes("*")) {
      return 8 * arraySize; // 64-bit pointers
    }

    // Clean up type (remove extra spaces)
    const cleanType = type.replace(/\s+/g, " ").trim();

    // Check if it's a known type
    const baseSize = this.typeSizes[cleanType];
    if (baseSize !== undefined) {
      return baseSize * arraySize;
    }

    // Handle common type variations
    if (cleanType.includes("char")) return 1 * arraySize;
    if (cleanType.includes("short")) return 2 * arraySize;
    if (cleanType.includes("int") && !cleanType.includes("long"))
      return 4 * arraySize;
    if (cleanType.includes("long long")) return 8 * arraySize;
    if (cleanType.includes("long"))
      return (this.targetAlignment === 8 ? 8 : 4) * arraySize;
    if (cleanType.includes("float")) return 4 * arraySize;
    if (cleanType.includes("double")) return 8 * arraySize;

    // Default to 4 bytes for unknown types
    console.warn(`Unknown type: ${cleanType}, assuming 4 bytes`);
    return 4 * arraySize;
  }

  /**
   * Get the alignment requirement of a type
   * @param {string} type - The type name
   * @returns {number} Alignment in bytes
   */
  getTypeAlignment(type) {
    if (type.includes("*")) {
      return 8; // Pointer alignment
    }

    const size = this.getTypeSize(type, 1);
    return Math.min(size, this.targetAlignment);
  }

  /**
   * Calculate memory layout for fields
   * @param {Array} fields - Array of field objects
   * @returns {Object} Layout information
   */
  calculateLayout(fields) {
    let offset = 0;
    let totalPadding = 0;
    const layoutFields = [];

    for (const field of fields) {
      // Calculate padding needed for alignment
      const padding =
        (field.alignment - (offset % field.alignment)) % field.alignment;
      offset += padding;
      totalPadding += padding;

      layoutFields.push({
        ...field,
        offset,
        padding,
      });

      offset += field.size;
    }

    // Final padding to align struct size to largest alignment
    const largestAlignment = Math.max(...fields.map((f) => f.alignment), 1);
    const finalPadding =
      (largestAlignment - (offset % largestAlignment)) % largestAlignment;
    offset += finalPadding;
    totalPadding += finalPadding;

    return {
      fields: layoutFields,
      totalSize: offset,
      paddingBytes: totalPadding,
    };
  }

  /**
   * Optimize struct layout by reordering fields
   * @param {Array} fields - Original fields
   * @returns {Object} Optimization information
   */
  optimizeLayout(fields) {
    // Sort fields by alignment (descending) then by size (descending)
    const sortedFields = [...fields].sort((a, b) => {
      if (a.alignment !== b.alignment) {
        return b.alignment - a.alignment;
      }
      return b.size - a.size;
    });

    const optimizedLayout = this.calculateLayout(sortedFields);
    const originalSize = this.calculateLayout(fields).totalSize;
    const memorySaved = originalSize - optimizedLayout.totalSize;

    return {
      optimizedFields: optimizedLayout.fields,
      optimizedSize: optimizedLayout.totalSize,
      memorySaved: memorySaved > 0 ? memorySaved : 0,
      optimizationRatio:
        originalSize > 0 ? (memorySaved / originalSize) * 100 : 0,
    };
  }
}

module.exports = { StructAnalyzer };
