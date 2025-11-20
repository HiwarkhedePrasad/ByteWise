/**
 * Field parsing utilities for C/C++ struct fields
 */

const { getTypeSize, getTypeAlignment } = require("../utils/typeUtils");

/**
 * Parse struct fields from body text
 * @param {string} body - Struct body content
 * @param {number} targetAlignment - Target platform alignment
 * @param {Object} typeSizes - Custom type sizes
 * @param {Object} typeTable - Table of known structs/typedefs
 * @returns {Array} Array of field objects
 */
function parseFields(body, targetAlignment, typeSizes, typeTable = {}) {
  const fields = [];

  // Split by semicolons and filter empty lines
  // We need to be careful not to split inside nested braces if we were parsing recursively,
  // but since we extracted the body, we assume it's a flat list of fields or nested anonymous structs.
  // However, anonymous structs/unions inside might contain semicolons.
  // For now, we'll stick to the simple split but improve the regex to handle anonymous types better.
  
  // Better approach: iterate through the string and find statements
  const statements = splitStatements(body);

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed) continue;

    // Handle different field patterns
    const patterns = [
      // Anonymous struct/union: struct { ... } name; OR union { ... };
      // Also handles named nested structs: struct Name { ... } name;
      /^\s*(struct|union)\s*(?:\w+\s*)?\{([\s\S]*)\}\s*(\w+)?\s*$/,
      
      // Regular field: type name or type name[size]
      // Supports attributes at end: int b __attribute__((...));
      // We use .* for attribute to handle nested parens roughly
      /^\s*([\w\s]+(?:\s*\*)*)\s+(\w+)(?:\[(.*)\])?(?:\s*__attribute__.*)?\s*$/,
      
      // Const/volatile modifiers: const type name
      /^\s*(?:const\s+|volatile\s+)*([\w\s]+(?:\s*\*)*)\s+(\w+)(?:\[(.*)\])?(?:\s*__attribute__.*)?\s*$/,
      
      // Bit fields: type name : bits
      /^\s*([\w\s]+(?:\s*\*)*)\s+(\w+)\s*:\s*(\d+)\s*$/,
      
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
      const field = createField(
        fieldMatch,
        patternIndex,
        targetAlignment,
        typeSizes,
        typeTable
      );
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
}

/**
 * Helper to split statements by semicolon, respecting braces
 */
function splitStatements(text) {
    const statements = [];
    let current = "";
    let braceDepth = 0;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '{') braceDepth++;
        else if (char === '}') braceDepth--;
        
        if (char === ';' && braceDepth === 0) {
            statements.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    if (current.trim()) statements.push(current);
    return statements;
}

/**
 * Create a field object based on pattern type
 * @param {Array} match - Regex match result
 * @param {number} patternIndex - Pattern index that matched
 * @param {number} targetAlignment - Target platform alignment
 * @param {Object} typeSizes - Custom type sizes
 * @param {Object} typeTable - Table of known structs/typedefs
 * @returns {Object|null} Field object or null if invalid
 */
function createField(
  match,
  patternIndex,
  targetAlignment,
  typeSizes,
  typeTable
) {
  // Helper to generate unique anonymous names
  const getAnonName = () => `__anon_field_${Math.random().toString(36).substr(2, 9)}`;

  switch (patternIndex) {
    case 0: // Anonymous struct/union
      const [, kind, body, name] = match;
      
      // Recursive parsing for anonymous types
      const innerFields = parseFields(body, targetAlignment, typeSizes, typeTable);
      
      return {
          name: name || getAnonName(), // Generate name if missing (anonymous member)
          type: `${kind} { ... }`,
          isAnonymous: true,
          isUnion: kind === 'union',
          size: 0, // Will be calculated in layoutUtils
          alignment: 1,
          offset: 0,
          innerFields: innerFields,
      };

    case 3: // Bit field
      const [, bfType, bfName, bits] = match;
      const cleanBfType = bfType.trim();
      return {
        name: bfName,
        type: cleanBfType,
        // Don't calculate size in bytes here, let layoutUtils handle storage units
        size: 0, 
        alignment: getTypeAlignment(cleanBfType, targetAlignment, typeSizes, typeTable),
        offset: 0,
        isBitField: true,
        bits: parseInt(bits),
      };

    case 4: // Function pointer
      const [, retType, fpName] = match;
      return {
        name: fpName,
        type: "function pointer",
        size: getTypeSize("void*", 1, typeSizes, typeTable),
        alignment: getTypeAlignment("void*", targetAlignment, typeSizes, typeTable),
        offset: 0,
        isFunctionPointer: true,
      };

    default: // Regular field or array (cases 1 and 2)
      const [, type, fieldName, arraySizeStr] = match;
      const cleanType = type.trim();
      
      // Handle multi-dimensional arrays: [3][4] -> 12
      let arraySize = 1;
      let isFlexibleArray = false;
      
      if (arraySizeStr !== undefined) {
          if (arraySizeStr.trim() === "") {
              // Flexible array member: char data[]
              isFlexibleArray = true;
              arraySize = 0;
          } else {
              const dimensions = arraySizeStr.split("][").map(s => {
                  return parseInt(s.replace(/[\[\]]/g, ""));
              });
              arraySize = dimensions.reduce((a, b) => a * b, 1);
          }
      }
      
      let alignment = getTypeAlignment(cleanType, targetAlignment, typeSizes, typeTable);
      
      // Check for alignment attribute in the full match or suffix
      // The regex captures attribute in the full match but we didn't capture it in a group for all patterns.
      // Let's check the full line for __attribute__((aligned(N)))
      // We need the original line. But we only have 'match'.
      // 'match.input' contains the input string if using exec, but here we use match().
      // match.input is available in modern JS.
      
      if (match.input) {
          const alignMatch = match.input.match(/__attribute__\s*\(\(\s*aligned\s*\(\s*(\d+)\s*\)\s*\)\)/);
          if (alignMatch) {
              alignment = parseInt(alignMatch[1]);
          }
      }

      return {
        name: fieldName,
        type: cleanType,
        size: isFlexibleArray ? 0 : getTypeSize(cleanType, arraySize, typeSizes, typeTable),
        alignment: alignment,
        offset: 0,
        arraySize: arraySizeStr ? arraySize : undefined,
        isFlexibleArray
      };
  }
}

module.exports = {
  parseFields,
};
