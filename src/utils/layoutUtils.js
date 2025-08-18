/**
 * Utility functions for memory layout calculations
 */

/**
 * Calculate memory layout for fields
 * @param {Array} fields - Array of field objects
 * @returns {Object} Layout information
 */
function calculateLayout(fields) {
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
function optimizeLayout(fields) {
  // Sort fields by alignment (descending) then by size (descending)
  const sortedFields = [...fields].sort((a, b) => {
    if (a.alignment !== b.alignment) {
      return b.alignment - a.alignment;
    }
    return b.size - a.size;
  });

  const optimizedLayout = calculateLayout(sortedFields);
  const originalSize = calculateLayout(fields).totalSize;
  const memorySaved = originalSize - optimizedLayout.totalSize;

  return {
    optimizedFields: optimizedLayout.fields,
    optimizedSize: optimizedLayout.totalSize,
    memorySaved: memorySaved > 0 ? memorySaved : 0,
    optimizationRatio:
      originalSize > 0 ? (memorySaved / originalSize) * 100 : 0,
  };
}

module.exports = {
  calculateLayout,
  optimizeLayout,
};
