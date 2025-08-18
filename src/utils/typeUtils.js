/**
 * Utility functions for C/C++ type handling
 */

const { DEFAULT_ALIGNMENT, POINTER_SIZE } = require("../constants");

/**
 * Default type sizes for common C/C++ types
 */
function getDefaultTypeSizes(targetAlignment = DEFAULT_ALIGNMENT) {
  return {
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
    long: targetAlignment === 8 ? 8 : 4,
    "long int": targetAlignment === 8 ? 8 : 4,
    "signed long": targetAlignment === 8 ? 8 : 4,
    "unsigned long": targetAlignment === 8 ? 8 : 4,
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
    "void*": POINTER_SIZE,
    bool: 1,
    _Bool: 1,
  };
}

/**
 * Get the size of a type in bytes
 * @param {string} type - The type name
 * @param {number} arraySize - Array size (default 1)
 * @param {Object} typeSizes - Custom type sizes
 * @returns {number} Size in bytes
 */
function getTypeSize(type, arraySize = 1, typeSizes = {}) {
  // Handle pointers
  if (type.includes("*")) {
    return POINTER_SIZE * arraySize;
  }

  // Clean up type (remove extra spaces)
  const cleanType = type.replace(/\s+/g, " ").trim();

  // Check if it's a known type
  const baseSize = typeSizes[cleanType];
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
    return (DEFAULT_ALIGNMENT === 8 ? 8 : 4) * arraySize;
  if (cleanType.includes("float")) return 4 * arraySize;
  if (cleanType.includes("double")) return 8 * arraySize;

  // Default to 4 bytes for unknown types
  console.warn(`Unknown type: ${cleanType}, assuming 4 bytes`);
  return 4 * arraySize;
}

/**
 * Get the alignment requirement of a type
 * @param {string} type - The type name
 * @param {number} targetAlignment - Target platform alignment
 * @param {Object} typeSizes - Custom type sizes
 * @returns {number} Alignment in bytes
 */
function getTypeAlignment(
  type,
  targetAlignment = DEFAULT_ALIGNMENT,
  typeSizes = {}
) {
  if (type.includes("*")) {
    return POINTER_SIZE; // Pointer alignment
  }

  const size = getTypeSize(type, 1, typeSizes);
  return Math.min(size, targetAlignment);
}

/**
 * Clean code by removing comments and preprocessor directives
 * @param {string} text - Raw source code
 * @returns {string} Cleaned code
 */
function cleanCode(text) {
  // Remove single-line comments
  text = text.replace(/\/\/.*$/gm, "");

  // Remove multi-line comments
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove preprocessor directives
  text = text.replace(/^\s*#.*$/gm, "");

  return text;
}

module.exports = {
  getDefaultTypeSizes,
  getTypeSize,
  getTypeAlignment,
  cleanCode,
};
