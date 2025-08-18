/**
 * HTML content generation utilities for the ByteWise webview
 */

const {
  getWebviewStyles,
  getWebviewScript,
} = require("../templates/webviewTemplate");

/**
 * Escape HTML characters
 * @param {string} unsafe - Unsafe string
 * @returns {string} Escaped string
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate memory layout visualization
 * @param {Array} fields - Struct fields
 * @param {number} totalSize - Total struct size
 * @returns {string} HTML for memory layout
 */
function generateMemoryLayout(fields, totalSize) {
  let layoutBlocks = [];
  let currentOffset = 0;

  fields.forEach((field) => {
    // Add padding blocks if any
    if (field.offset > currentOffset) {
      const padding = field.offset - currentOffset;
      for (let i = 0; i < padding; i++) {
        layoutBlocks.push(
          `<div class="memory-block padding-block" data-info="Padding Byte" data-tooltip="Padding byte added for alignment"></div>`
        );
      }
    }
    // Add field blocks
    for (let i = 0; i < field.size; i++) {
      layoutBlocks.push(
        `<div class="memory-block field-block" 
          data-info="${escapeHtml(field.name)}" 
          data-tooltip="<strong>${escapeHtml(field.name)}</strong><br/>
          Type: ${escapeHtml(field.type)}<br/>
          Size: ${field.size} bytes<br/>
          Offset: ${field.offset} bytes<br/>
          Alignment: ${field.alignment} bytes"
          style="--field-color: hsl(${
            (field.name.charCodeAt(0) * 137) % 360
          }, 70%, 85%)"></div>`
      );
    }
    currentOffset = field.offset + field.size;
  });

  // Add trailing padding if any
  if (totalSize > currentOffset) {
    const trailingPadding = totalSize - currentOffset;
    for (let i = 0; i < trailingPadding; i++) {
      layoutBlocks.push(
        `<div class="memory-block padding-block" data-info="Trailing Padding" data-tooltip="Trailing padding to align struct size"></div>`
      );
    }
  }

  return layoutBlocks.join("");
}

/**
 * Generate optimized code for a struct
 * @param {Object} struct - Struct information
 * @returns {string} Optimized C code
 */
function generateOptimizedCode(struct) {
  if (!struct.optimizedFields || struct.optimizedFields.length === 0) {
    return `struct ${struct.name} {\n    // No optimization suggested or fields are already optimally ordered.\n};`;
  }

  let code = `struct ${struct.name} {\n`;
  struct.optimizedFields.forEach((field) => {
    // Emit correct C syntax, including arrays and bitfields
    const baseType = field.type;
    const nameWithArray = field.arraySize
      ? `${field.name}[${field.arraySize}]`
      : field.name;
    const nameWithBitfield = field.isBitField
      ? `${nameWithArray} : ${field.bits}`
      : nameWithArray;
    code += `    ${baseType} ${nameWithBitfield};\n`;
  });
  code += `};`;
  return code;
}

/**
 * Generate summary statistics HTML
 * @param {Array} structs - Array of struct information
 * @returns {string} HTML for summary statistics
 */
function generateSummaryStats(structs) {
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

  return `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${totalStructs}</div>
        <div class="summary-label">Structs Analyzed</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${totalBytes}B</div>
        <div class="summary-label">Total Memory</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${totalPadding}B</div>
        <div class="summary-label">Padding Bytes</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${totalSavings}B</div>
        <div class="summary-label">Potential Savings</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${optimizableStructs}</div>
        <div class="summary-label">Optimizable</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${
          totalBytes > 0 ? ((totalPadding / totalBytes) * 100).toFixed(1) : 0
        }%</div>
        <div class="summary-label">Padding Ratio</div>
      </div>
    </div>`;
}

/**
 * Generate HTML for a single struct
 * @param {Object} struct - Struct information
 * @param {number} index - Struct index
 * @returns {string} HTML for struct display
 */
function generateStructHTML(struct, index) {
  const memoryLayout = generateMemoryLayout(
    struct.fields || [],
    struct.totalSize || 0
  );
  const optimizedCode = generateOptimizedCode(struct);
  const hasOptimization = struct.memorySaved && struct.memorySaved > 0;

  return `
    <div class="struct-card" data-struct-name="${escapeHtml(
      struct.name || "Unknown"
    )}">
      <div class="struct-header">
        <div class="struct-name">struct ${escapeHtml(
          struct.name || "Unknown"
        )}</div>
        <div class="struct-badges">
          ${
            hasOptimization
              ? '<span class="badge badge-optimizable">Optimizable</span>'
              : '<span class="badge badge-optimized">Optimized</span>'
          }
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${struct.totalSize || 0}B</div>
          <div class="stat-label">Original Size</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${struct.paddingBytes || 0}B</div>
          <div class="stat-label">Padding</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${(struct.fields || []).length}</div>
          <div class="stat-label">Fields</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${
            struct.totalSize > 0
              ? (((struct.paddingBytes || 0) / struct.totalSize) * 100).toFixed(
                  1
                )
              : 0
          }%</div>
          <div class="stat-label">Padding Ratio</div>
        </div>
        ${
          hasOptimization
            ? `
        <div class="stat-item">
          <div class="stat-value">${struct.optimizedSize || 0}B</div>
          <div class="stat-label">Optimized Size</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${struct.memorySaved || 0}B</div>
          <div class="stat-label">Memory Saved</div>
        </div>
        `
            : ""
        }
      </div>
      
      <div class="memory-section">
        <div class="section-header">
          <div class="section-title">Memory Layout</div>
          <div class="memory-legend">
            <div class="legend-item">
              <div class="legend-color legend-field"></div>
              <span>Field Data</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-padding"></div>
              <span>Padding</span>
            </div>
          </div>
        </div>
        <div class="memory-layout">
          <div class="layout-grid">
            ${memoryLayout}
          </div>
        </div>
      </div>
      
      <div class="field-section">
        <div class="section-title">Field Details</div>
        <div class="field-table-container">
          <table class="field-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Offset</th>
                <th>Alignment</th>
                <th>Padding</th>
              </tr>
            </thead>
            <tbody>
              ${(struct.fields || [])
                .map(
                  (field) => `
              <tr>
                <td class="field-name">${escapeHtml(field.name || "")}</td>
                <td><span class="field-type">${escapeHtml(
                  field.type || ""
                )}</span></td>
                <td>${field.size || 0}B</td>
                <td>${field.offset || 0}B</td>
                <td>${field.alignment || 0}B</td>
                <td>${field.padding || 0}B</td>
              </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      
      ${
        hasOptimization
          ? `
      <div class="optimization-section">
        <div class="optimization-header">
          <div class="optimization-title">
            ⚡ Optimization Opportunity
          </div>
          <div class="optimization-subtitle">
            Reordering fields can reduce memory usage
          </div>
        </div>
        
        <div class="savings-highlight">
          <div class="savings-value">${
            struct.memorySaved || 0
          } bytes saved</div>
          <div class="savings-details">
            ${(struct.optimizationRatio || 0).toFixed(1)}% reduction 
            (${struct.totalSize || 0}B → ${struct.optimizedSize || 0}B)
          </div>
        </div>
        
        <div class="code-container">
          <div class="code-header">
            <div class="code-title">Optimized Structure</div>
          </div>
          <div class="code-block">${escapeHtml(optimizedCode)}</div>
        </div>
        
        <div class="button-group">
          <button onclick='copyText(${JSON.stringify(
            optimizedCode
          )})' class="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Code
          </button>
          <button onclick='applyOptimization(${JSON.stringify(
            struct.name || ""
          )}, ${JSON.stringify(optimizedCode)})' class="btn btn-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Apply Optimization
          </button>
        </div>
      </div>
      `
          : `
      <div class="optimization-section">
        <div class="optimization-header">
          <div class="optimization-title">
            ✅ Already Optimized
          </div>
          <div class="optimization-subtitle">
            This struct appears to be optimally arranged
          </div>
        </div>
      </div>
      `
      }
    </div>`;
}

/**
 * Generate the complete webview HTML content
 * @param {Array} structs - Array of struct information
 * @param {string} fileName - Source file name
 * @param {string} [workspaceTree] - Optional ASCII workspace tree
 * @returns {string} Complete HTML content
 */
function generateWebviewContent(structs, fileName, workspaceTree) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ByteWise Analysis</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        ${getWebviewStyles()}
    </style>
</head>
<body>
    <div class="app-container">
        <header class="header">
            <h1 class="header-title">
                <div class="header-icon">📊</div>
                ByteWise Analysis
            </h1>
            <p class="header-subtitle">Memory Layout Analysis & Optimization</p>
            <div class="header-filename">${escapeHtml(fileName)}</div>
        </header>
        
        ${workspaceTree ? renderWorkspaceTree(workspaceTree) : ""}
        
        ${generateSummaryStats(structs)}
        
        ${structs
          .map((struct, index) => generateStructHTML(struct, index))
          .join("")}
        
        <div class="export-section">
            <h3 class="export-title">📄 Export Analysis</h3>
            <p class="export-subtitle">Save this analysis as a markdown report for documentation or sharing.</p>
            <button onclick="exportAnalysis()" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Report
            </button>
        </div>
    </div>
    
    <div class="tooltip" id="tooltip"></div>
    
    <script>
        ${getWebviewScript()}
        
        // Set global data for the current analysis
        currentStructs = ${JSON.stringify(structs)};
        currentFileName = '${escapeHtml(fileName)}';
    </script>
</body>
</html>`;
}

function renderWorkspaceTree(tree) {
  // Render folders and files as an interactive list with color-coded filenames
  const renderNode = (node, depth = 0) => {
    const indent = "&nbsp;".repeat(depth * 4);
    const foldersHtml = (node.folders || [])
      .map(
        (f) =>
          `${indent}<div class=\"ws-item ws-folder\">📁 ${escapeHtml(
            f.name
          )}</div>` + renderNode(f, depth + 1)
      )
      .join("");
    const filesHtml = (node.files || [])
      .map((file) => {
        const cls = file.status?.isOptimized ? "ws-file-ok" : "ws-file-bad";
        const clickable = file.ellipsis
          ? ""
          : ` onclick=\"openFileAnalysis('${escapeHtml(
              file.relPath || ""
            )}')\"`;
        const label = escapeHtml(file.name);
        return `${indent}<div class=\"ws-item ws-file ${cls}\"${clickable}>${label}</div>`;
      })
      .join("");
    return foldersHtml + filesHtml;
  };

  return `
  <section class="field-section">
    <div class="section-title">Project Structure</div>
    <div class="field-table-container">
      <style>
        .ws-item { font-family: var(--font-mono); padding: 4px 8px; cursor: default; }
        .ws-folder { color: var(--text-secondary); font-weight: 600; }
        .ws-file { cursor: pointer; }
        .ws-file-ok { color: #059669; }
        .ws-file-bad { color: #dc2626; }
        .ws-file:hover { background: var(--bg-hover); }
      </style>
      <div class="code-block" style="white-space: normal;">
        ${renderNode(tree, 0)}
      </div>
    </div>
  </section>
  `;
}

module.exports = {
  escapeHtml,
  generateMemoryLayout,
  generateOptimizedCode,
  generateSummaryStats,
  generateStructHTML,
  generateWebviewContent,
};
