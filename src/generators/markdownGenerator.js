/**
 * Markdown report generation utilities
 */

const { escapeHtml, generateOptimizedCode } = require("./htmlGenerator");

/**
 * Generate markdown report for struct analysis
 * @param {Array} structs - Array of struct information
 * @param {string} fileName - Source file name
 * @returns {string} Markdown report content
 */
function generateMarkdownReport(structs, fileName) {
  let markdown = `# ByteWise Struct Analysis Report - ${fileName}\n\n`;
  markdown += `This report provides a detailed analysis of struct memory layouts, identifying padding and suggesting optimizations for better memory efficiency.\n\n`;
  markdown += `---\n\n`;

  const totalStructs = structs.length;
  const totalBytes = structs.reduce((sum, s) => sum + (s.totalSize || 0), 0);
  const totalPadding = structs.reduce(
    (sum, s) => sum + (s.paddingBytes || 0),
    0
  );
  const totalSavings = structs.reduce(
    (sum, s) => sum + (s.memorySaved || 0),
    0
  );
  const optimizableStructs = structs.filter(
    (s) => (s.memorySaved || 0) > 0
  ).length;

  markdown += `## Summary Statistics\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `| :--------------------- | :--------------------------------- |\n`;
  markdown += `| Total Structs Analyzed | ${totalStructs} |\n`;
  markdown += `| Total Current Bytes    | ${totalBytes} bytes |\n`;
  markdown += `| Total Padding Bytes    | ${totalPadding} bytes |\n`;
  markdown += `| Potential Memory Savings | ${totalSavings} bytes |\n`;
  markdown += `| Optimizable Structs    | ${optimizableStructs} |\n`;
  markdown += `| Overall Padding Ratio  | ${
    totalBytes > 0 ? ((totalPadding / totalBytes) * 100).toFixed(1) : 0
  }% |\n`;
  markdown += `---\n\n`;

  structs.forEach((struct) => {
    const hasOptimization = struct.memorySaved && struct.memorySaved > 0;
    markdown += `## Struct: \`${struct.name || "Unknown"}\`\n\n`;
    markdown += `| Statistic | Value |\n`;
    markdown += `| :---------------- | :---------------- |\n`;
    markdown += `| Original Size   | ${struct.totalSize || 0} bytes |\n`;
    markdown += `| Padding Bytes   | ${struct.paddingBytes || 0} bytes |\n`;
    markdown += `| Number of Fields | ${(struct.fields || []).length} |\n`;
    markdown += `| Padding Ratio   | ${
      struct.totalSize > 0
        ? (((struct.paddingBytes || 0) / struct.totalSize) * 100).toFixed(1)
        : 0
    }% |\n`;
    if (hasOptimization) {
      markdown += `| Optimized Size  | ${struct.optimizedSize || 0} bytes |\n`;
      markdown += `| Memory Saved    | ${struct.memorySaved} bytes |\n`;
      markdown += `| Savings Ratio   | ${(
        struct.optimizationRatio || 0
      ).toFixed(1)}% |\n`;
    }
    markdown += `\n`;

    markdown += `### Field Details (Original Order)\n\n`;
    markdown += `| Field Name | Type | Size (B) | Offset (B) | Alignment (B) | Padding (B) | Notes |\n`;
    markdown += `| :--------- | :--- | :------- | :--------- | :------------ | :---------- | :---- |\n`;
    (struct.fields || []).forEach((field) => {
      let notes = [];
      if (field.arraySize) notes.push(`Array[${field.arraySize}]`);
      if (field.isBitField) notes.push(`Bitfield: ${field.bits} bits`);
      if (field.isFunctionPointer) notes.push("Function pointer");

      markdown += `| \`${escapeHtml(field.name || "")}\` | \`${escapeHtml(
        field.type || ""
      )}\` | ${field.size || 0} | ${field.offset || 0} | ${
        field.alignment || 0
      } | ${field.padding || 0} | ${notes.join(", ")} |\n`;
    });
    markdown += `\n`;

    if (hasOptimization) {
      markdown += `### Optimization Suggestion\n\n`;
      markdown += `Reordering fields could save **${
        struct.memorySaved
      } bytes** (${(struct.optimizationRatio || 0).toFixed(1)}% reduction).\n`;
      markdown += `New size: ${struct.optimizedSize || 0} bytes (from ${
        struct.totalSize || 0
      } bytes).\n\n`;

      markdown += `\`\`\`c\n${generateOptimizedCode(struct)}\n\`\`\`\n\n`;

      markdown += `### Field Details (Optimized Order)\n\n`;
      markdown += `| Field Name | Type | Size (B) | New Offset (B) | Alignment (B) | New Padding (B) |\n`;
      markdown += `| :--------- | :--- | :------- | :------------- | :------------ | :-------------- |\n`;
      (struct.optimizedFields || []).forEach((field) => {
        markdown += `| \`${escapeHtml(field.name || "")}\` | \`${escapeHtml(
          field.type || ""
        )}\` | ${field.size || 0} | ${field.offset || 0} | ${
          field.alignment || 0
        } | ${field.padding || 0} |\n`;
      });
      markdown += `\n`;
    } else {
      markdown += `### Optimization\n\n`;
      markdown += `This struct appears to be optimally arranged; no significant memory savings are expected from reordering fields.\n\n`;
    }
    markdown += `---\n\n`;
  });

  return markdown;
}

module.exports = {
  generateMarkdownReport,
};
