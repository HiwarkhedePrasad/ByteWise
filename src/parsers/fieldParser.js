/**
 * Field parsing utilities for C/C++ struct fields
 */

const { getTypeSize, getTypeAlignment } = require("../utils/typeUtils");

/**
 * Parse struct fields from body text
 * @param {string} body - Struct body content
 * @param {number} targetAlignment - Target platform alignment
 * @param {Object} typeSizes - Custom type sizes
 * @returns {Array} Array of field objects
 */
function parseFields(body, targetAlignment, typeSizes) {
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
      const field = createField(
        type,
        name,
        sizeOrBits,
        patternIndex,
        targetAlignment,
        typeSizes
      );
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
}

/**
 * Create a field object based on pattern type
 * @param {string} type - Field type
 * @param {string} name - Field name
 * @param {string} sizeOrBits - Size or bits value
 * @param {number} patternIndex - Pattern index that matched
 * @param {number} targetAlignment - Target platform alignment
 * @param {Object} typeSizes - Custom type sizes
 * @returns {Object|null} Field object or null if invalid
 */
function createField(
  type,
  name,
  sizeOrBits,
  patternIndex,
  targetAlignment,
  typeSizes
) {
  const cleanType = type.trim();

  switch (patternIndex) {
    case 2: // Bit field
      return {
        name,
        type: cleanType,
        size: Math.ceil(parseInt(sizeOrBits) / 8), // Convert bits to bytes
        alignment: getTypeAlignment(cleanType, targetAlignment, typeSizes),
        offset: 0,
        isBitField: true,
        bits: parseInt(sizeOrBits),
      };

    case 3: // Function pointer
      return {
        name,
        type: "function pointer",
        size: 8, // Pointer size
        alignment: 8,
        offset: 0,
        isFunctionPointer: true,
      };

    default: // Regular field or array
      const arraySize = sizeOrBits ? parseInt(sizeOrBits) : 1;
      return {
        name,
        type: cleanType,
        size: getTypeSize(cleanType, arraySize, typeSizes),
        alignment: getTypeAlignment(cleanType, targetAlignment, typeSizes),
        offset: 0,
        arraySize: sizeOrBits ? arraySize : undefined,
      };
  }
}

module.exports = {
  parseFields,
};
