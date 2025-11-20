/**
 * Utility for generating warnings about unsupported features
 */

function getWarnings(text) {
  const warnings = [];

  if (text.includes("#define")) {
    warnings.push("Macros detected: Analysis might be inaccurate if macros affect types.");
  }
  
  if (text.includes("#ifdef") || text.includes("#if defined")) {
    warnings.push("Conditional compilation detected: Analysis assumes all branches are active or ignored.");
  }
  
  if (text.match(/\[\s*\]/)) {
      // Flexible array member check (empty brackets at end of struct)
      // Simple check
      warnings.push("Flexible array members detected: Size calculation might be incomplete.");
  }

  return warnings;
}

module.exports = { getWarnings };
