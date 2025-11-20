let vscode;
try {
  vscode = require("vscode");
} catch (e) {
  vscode = global.vscode;
}
const {
  getDefaultTypeSizes,
  getTypeSize,
  getTypeAlignment,
  cleanCode,
} = require("./utils/typeUtils");
const { parseFields } = require("./parsers/fieldParser");
const { calculateLayout, optimizeLayout, calculateUnionLayout } = require("./utils/layoutUtils");
const { getWarnings } = require("./utils/warningUtils");

const DEFAULT_ALIGNMENT = 8;

class StructAnalyzer {
  constructor() {
    this.targetAlignment = DEFAULT_ALIGNMENT;
    this.typeSizes = getDefaultTypeSizes(DEFAULT_ALIGNMENT);
    this.typeTable = {}; // Table to store struct definitions and typedefs

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
    this.typeTable = {}; // Reset type table for new analysis

    // Remove comments and preprocessor directives
    text = cleanCode(text);

    // Pass 1: Collect all struct definitions and typedefs
    
    // 1a. Collect simple typedefs (e.g., typedef int MyInt;)
    const simpleTypedefRegex = /typedef\s+([\w\s\*]+)\s+(\w+)\s*;/g;
    let match;
    while ((match = simpleTypedefRegex.exec(text)) !== null) {
        const [_, baseType, alias] = match;
        if (!baseType.includes("struct") && !baseType.includes("union")) {
             this.typeTable[alias] = { baseType: baseType.trim() };
        }
    }

    // 1b. Collect struct/union definitions using brace counting
    const rawStructs = [];
    let anonCounter = 1;
    
    // Track pragmas
    const pragmaPackRegex = /#pragma\s+pack\s*\(\s*(push\s*,\s*)?(\d+)\s*\)|#pragma\s+pack\s*\(\s*pop\s*\)/g;
    const pragmas = [];
    let pMatch;
    while ((pMatch = pragmaPackRegex.exec(text)) !== null) {
        pragmas.push({
            index: pMatch.index,
            isPop: pMatch[0].includes("pop"),
            value: pMatch[2] ? parseInt(pMatch[2]) : null
        });
    }

    let cursor = 0;
    while (cursor < text.length) {
        // Find next "struct" or "union"
        const subText = text.substring(cursor);
        const keywordMatch = subText.match(/\b(struct|union)\b/);
        
        if (!keywordMatch) break;
        
        const kind = keywordMatch[1];
        const startIndex = cursor + keywordMatch.index;
        
        // Check if it's a definition (has {) or just a declaration/usage
        // We look ahead for { before ;
        const openBraceIndex = text.indexOf('{', startIndex);
        const semicolonIndex = text.indexOf(';', startIndex);
        
        if (openBraceIndex === -1 || (semicolonIndex !== -1 && semicolonIndex < openBraceIndex)) {
            // It's a forward declaration "struct Foo;" or usage "struct Foo x;"
            // Skip it
            cursor = (semicolonIndex !== -1 ? semicolonIndex : startIndex) + 1;
            continue;
        }
        
        // It is a definition.
        // Extract name (if any) between keyword and {
        const preBrace = text.substring(startIndex + kind.length, openBraceIndex).trim();
        
        let structName = null;
        // Clean up attributes from preBrace if any
        const cleanPreBrace = preBrace.replace(/__attribute__\s*\(\([^)]*\)\)/g, "").trim();
        if (cleanPreBrace) {
            const parts = cleanPreBrace.split(/\s+/);
            structName = parts[parts.length - 1]; // Take last word as name
        }

        // Find closing brace
        let braceDepth = 1;
        let i = openBraceIndex + 1;
        while (i < text.length && braceDepth > 0) {
            if (text[i] === '{') braceDepth++;
            else if (text[i] === '}') braceDepth--;
            i++;
        }
        
        if (braceDepth > 0) {
            // Unclosed brace, abort
            break;
        }
        
        const closeBraceIndex = i - 1;
        const body = text.substring(openBraceIndex + 1, closeBraceIndex);
        
        // Parse suffix (from } to ;)
        const suffixEndIndex = text.indexOf(';', closeBraceIndex);
        if (suffixEndIndex === -1) {
            cursor = closeBraceIndex + 1;
            continue;
        }
        
        const suffix = text.substring(closeBraceIndex + 1, suffixEndIndex);
        const fullMatch = text.substring(startIndex, suffixEndIndex + 1);
        
        // Parse suffix for attributes and typedef/instance name
        let typedefName = null;
        let isPacked = false;
        let alignAttr = null;
        
        if (suffix) {
            const cleanSuffix = suffix.trim();
            if (cleanSuffix.includes("packed")) isPacked = true;
            
            const alignMatch = cleanSuffix.match(/aligned\s*\(\s*(\d+)\s*\)/);
            if (alignMatch) alignAttr = parseInt(alignMatch[1]);
            
            const suffixWithoutAttrs = cleanSuffix.replace(/__attribute__\s*\(\([^)]*\)\)/g, "").trim();
            const nameMatch = suffixWithoutAttrs.match(/(\w+)(?:\s*\[[^\]]*\])?$/);
            if (nameMatch) typedefName = nameMatch[1];
        }
        
        // Check #pragma pack
        let currentPack = null;
        for (const p of pragmas) {
            if (p.index > startIndex) break;
            if (p.isPop) currentPack = null;
            else currentPack = p.value;
        }
        if (currentPack === 1) isPacked = true;
        
        // Determine primary name
        let primaryName = structName;
        if (!primaryName) {
            primaryName = typedefName ? typedefName : `__anon_${kind}_${anonCounter++}`;
        }
        
        // Register
        const entry = {
            kind,
            name: primaryName,
            body,
            isPacked,
            alignAttr,
            sourceMatch: fullMatch
        };
        
        this.typeTable[primaryName] = entry;
        if (typedefName && typedefName !== primaryName) {
            this.typeTable[typedefName] = { baseType: primaryName };
        }
        if (structName) {
            this.typeTable[`${kind} ${structName}`] = { baseType: primaryName };
        }
        
        rawStructs.push({ ...entry, typedefName });
        
        cursor = suffixEndIndex + 1;
    }

    // Pass 2: Resolve fields and calculate layouts
    const MAX_PASSES = 3;
    for (let i = 0; i < MAX_PASSES; i++) {
        let changes = false;
        
        for (const struct of rawStructs) {
            if (this.typeTable[struct.name].size !== undefined) continue; // Already resolved

            const fields = parseFields(struct.body, this.targetAlignment, this.typeSizes, this.typeTable);
            
            // Check if all fields are resolved
            // We allow size 0 for flexible arrays, bitfields, etc.
            const allResolved = fields.every(f => f.size !== undefined);
            
            if (allResolved || i === MAX_PASSES - 1) {
                 let layout;
                 if (struct.kind === 'union') {
                     layout = calculateUnionLayout(fields, struct.isPacked ? 1 : this.targetAlignment);
                 } else {
                     layout = calculateLayout(fields, struct.isPacked ? 1 : this.targetAlignment);
                 }
                 
                 const optimization = optimizeLayout(layout.fields, struct.isPacked ? 1 : this.targetAlignment);

                 // Update type table with size/align
                 this.typeTable[struct.name] = {
                     ...this.typeTable[struct.name],
                     fields: layout.fields,
                     size: layout.totalSize,
                     align: layout.alignment,
                 };
                 
                 // Only push to results if it's a top-level struct (not just a dependency)
                 if (!structs.find(s => s.name === struct.name)) {
                     structs.push({
                        name: struct.typedefName || struct.name,
                        fields: layout.fields,
                        totalSize: layout.totalSize,
                        paddingBytes: layout.paddingBytes,
                        ...optimization,
                        sourceMatch: struct.sourceMatch,
                     });
                 }
                 changes = true;
            }
        }
        
        if (!changes) break;
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
    return getTypeSize(type, arraySize, this.typeSizes, this.typeTable);
  }

  /**
   * Get the alignment requirement of a type (delegated to utility)
   * @param {string} type - The type name
   * @returns {number} Alignment in bytes
   */
  getTypeAlignment(type) {
    return getTypeAlignment(type, this.targetAlignment, this.typeSizes, this.typeTable);
  }
}

module.exports = { StructAnalyzer };
