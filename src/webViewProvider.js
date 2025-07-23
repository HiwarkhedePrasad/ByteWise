const vscode = require("vscode");

class WebViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.panel = undefined;
  }

  async showAnalysis(structs, fileName = "Unknown") {
    if (this.panel) {
      this.panel.dispose();
    }

    this.panel = vscode.window.createWebviewPanel(
      "byteWiseAnalysis",
      "ByteWise - Struct Analysis",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    // Ensure this method returns a string (the full HTML)
    this.panel.webview.html = this.getWebviewContent(structs, fileName);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "copyOptimized":
          await vscode.env.clipboard.writeText(message.code);
          vscode.window.showInformationMessage(
            "Optimized struct copied to clipboard! 📋"
          );
          break;

        case "applyOptimization":
          await this.applyOptimization(message.structName, message.code);
          break;

        case "exportAnalysis":
          await this.exportAnalysis(structs, fileName);
          break;

        case "showFieldDetails":
          this.showFieldDetails(message.struct, message.field);
          break;
      }
    });

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  async applyOptimization(structName, optimizedCode) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found");
      return;
    }

    const choice = await vscode.window.showInformationMessage(
      `Apply optimization for struct ${structName}?`,
      { modal: true },
      "Yes",
      "No"
    );

    if (choice === "Yes") {
      const position = editor.selection.active;
      await editor.edit((editBuilder) => {
        editBuilder.insert(position, "\n" + optimizedCode + "\n");
      });
      vscode.window.showInformationMessage(
        `✨ Optimized struct ${structName} applied!`
      );
    }
  }

  async exportAnalysis(structs, fileName) {
    try {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${fileName}_bytewise_analysis.md`),
        filters: {
          Markdown: ["md"],
          Text: ["txt"],
          "All Files": ["*"],
        },
      });

      if (uri) {
        const markdown = this.generateMarkdownReport(structs, fileName);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, "utf8"));
        vscode.window.showInformationMessage(
          `Analysis exported to ${uri.fsPath} 📄`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error.message}`);
    }
  }

  showFieldDetails(structInfo, fieldName) {
    const field = structInfo.fields.find((f) => f.name === fieldName);
    if (!field) return;

    const message =
      `**${field.name}** (${field.type})\n\n` +
      `📏 Size: ${field.size} bytes\n` +
      `🎯 Alignment: ${field.alignment} bytes\n` +
      `📍 Offset: ${field.offset} bytes\n` +
      `🔢 Padding: ${field.padding || 0} bytes\n` +
      `${field.arraySize ? `📊 Array: ${field.arraySize} elements\n` : ""}` +
      `${field.isBitField ? `⚡ Bit field: ${field.bits} bits` : ""}`;

    vscode.window.showInformationMessage(message);
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  generateMemoryLayout(fields, totalSize) {
    let layoutBlocks = [];
    let currentOffset = 0;

    fields.forEach((field) => {
      // Add padding blocks if any
      if (field.offset > currentOffset) {
        const padding = field.offset - currentOffset;
        for (let i = 0; i < padding; i++) {
          layoutBlocks.push(
            `<div class="memory-block padding-block" data-info="Padding Byte"></div>`
          );
        }
      }
      // Add field blocks
      for (let i = 0; i < field.size; i++) {
        layoutBlocks.push(
          `<div class="memory-block field-block" data-info="<strong>${this.escapeHtml(
            field.name
          )}</strong><br>Type: ${this.escapeHtml(field.type)}<br>Size: ${
            field.size
          }B<br>Offset: ${field.offset}B<br>Alignment: ${
            field.alignment
          }B"></div>`
        );
      }
      currentOffset = field.offset + field.size;
    });

    // Add trailing padding if any
    if (totalSize > currentOffset) {
      const trailingPadding = totalSize - currentOffset;
      for (let i = 0; i < trailingPadding; i++) {
        layoutBlocks.push(
          `<div class="memory-block padding-block" data-info="Trailing Padding Byte"></div>`
        );
      }
    }

    return layoutBlocks.join("");
  }

  generateOptimizedCode(struct) {
    if (!struct.optimizedFields || struct.optimizedFields.length === 0) {
      return `struct ${struct.name} {\n    // No optimization suggested or fields are already optimally ordered.\n};`;
    }

    let code = `struct ${struct.name} {\n`;
    struct.optimizedFields.forEach((field) => {
      let typeName = field.type;
      if (field.arraySize) {
        typeName += `[${field.arraySize}]`;
      }
      if (field.isBitField) {
        typeName += ` : ${field.bits}`;
      }
      code += `    ${typeName} ${field.name};\n`;
    });
    code += `};`;
    return code;
  }

  generateMarkdownReport(structs, fileName) {
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
        markdown += `| Optimized Size  | ${
          struct.optimizedSize || 0
        } bytes |\n`;
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

        markdown += `| \`${this.escapeHtml(
          field.name || ""
        )}\` | \`${this.escapeHtml(field.type || "")}\` | ${
          field.size || 0
        } | ${field.offset || 0} | ${field.alignment || 0} | ${
          field.padding || 0
        } | ${notes.join(", ")} |\n`;
      });
      markdown += `\n`;

      if (hasOptimization) {
        markdown += `### Optimization Suggestion\n\n`;
        markdown += `Reordering fields could save **${
          struct.memorySaved
        } bytes** (${(struct.optimizationRatio || 0).toFixed(
          1
        )}% reduction).\n`;
        markdown += `New size: ${struct.optimizedSize || 0} bytes (from ${
          struct.totalSize || 0
        } bytes).\n\n`;

        markdown += `\`\`\`c\n${this.generateOptimizedCode(
          struct
        )}\n\`\`\`\n\n`;

        markdown += `### Field Details (Optimized Order)\n\n`;
        markdown += `| Field Name | Type | Size (B) | New Offset (B) | Alignment (B) | New Padding (B) |\n`;
        markdown += `| :--------- | :--- | :------- | :------------- | :------------ | :-------------- |\n`;
        (struct.optimizedFields || []).forEach((field) => {
          markdown += `| \`${this.escapeHtml(
            field.name || ""
          )}\` | \`${this.escapeHtml(field.type || "")}\` | ${
            field.size || 0
          } | ${field.offset || 0} | ${field.alignment || 0} | ${
            field.padding || 0
          } |\n`;
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

  getWebviewContent(structs, fileName) {
    // The configuration setting is not used in the HTML as we're dynamically detecting the theme.
    // const config = vscode.workspace.getConfiguration("bytewise");
    // const colorThemeConfig = config.get("colorTheme", "default");

    // Get the current color theme kind from VS Code
    const currentColorThemeKind = vscode.window.activeColorTheme.kind;

    let colorTheme; // Declare colorTheme

    // Use a switch statement to map the VS Code enum values to your desired string literals for CSS.
    switch (currentColorThemeKind) {
      case vscode.ColorThemeKind.HighContrast:
      case vscode.ColorThemeKind.HighContrastLight: // Include this for high contrast light themes
        colorTheme = "high-contrast";
        break;
      // Removed: case vscode.ColorThemeKind.Colorblind: // This was the error. VS Code's enum doesn't have this.
      case vscode.ColorThemeKind.Dark: // Explicitly handle Dark theme
        colorTheme = "dark"; // Or "default" if you want dark and light to use the same "default" styles
        break;
      case vscode.ColorThemeKind.Light: // Explicitly handle Light theme
        colorTheme = "light"; // Or "default"
        break;
      default: // Fallback for any other theme kind (e.g., new ones, or if light/dark should be "default")
        colorTheme = "default";
        break;
    }

    // Make sure to use 'this' when calling class methods within other class methods
    const escapeHtml = this.escapeHtml;
    const generateSummaryStats = this.generateSummaryStats.bind(this); // Bind to 'this' to maintain context
    const generateStructHTML = this.generateStructHTML.bind(this); // Bind to 'this' to maintain context

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ByteWise Analysis</title>
    <style>
        :root {
            --primary-color: var(--vscode-textLink-foreground);
            --background: var(--vscode-editor-background);
            --foreground: var(--vscode-editor-foreground);
            --border: var(--vscode-panel-border);
            --selection: var(--vscode-editor-selectionBackground);
            --hover: var(--vscode-list-hoverBackground);
            --error: var(--vscode-errorForeground);
            --warning: var(--vscode-warningForeground);
            --success: var(--vscode-testing-iconPassed);
            
            /* Color themes */
            --field-color: ${
              colorTheme === "high-contrast"
                ? "#ffffff"
                : // If you had a 'colorblind' theme you manage manually, you could still check for it here,
                // but 'colorTheme' wouldn't automatically be set to "colorblind" from VS Code's enum.
                // For demonstration, I'll keep the logic but remember 'colorTheme' won't be "colorblind"
                // unless you set it explicitly based on some other detection or config.
                colorTheme === "colorblind" // This comparison is now against your string 'colorblind'
                ? "#0173b2" // Example color for a custom 'colorblind' theme style
                : "var(--vscode-textLink-foreground)"
            };
            --padding-color: ${
              colorTheme === "high-contrast"
                ? "#ff0000"
                : colorTheme === "colorblind"
                ? "#de8f05"
                : "var(--vscode-errorForeground)"
            };
            --optimization-color: ${
              colorTheme === "high-contrast"
                ? "#00ff00"
                : colorTheme === "colorblind"
                ? "#029e73"
                : "var(--vscode-testing-iconPassed)"
            };
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: var(--vscode-font-size, 13px);
            margin: 0;
            padding: 20px;
            background: var(--background);
            color: var(--foreground);
            line-height: 1.6;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--selection);
            border-radius: 8px;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            color: var(--primary-color);
            font-size: 2em;
        }
        
        .header .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 1.1em;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: var(--selection);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid var(--border);
        }
        
        .summary-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 5px;
        }
        
        .summary-label {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        
        .struct-container {
            margin-bottom: 40px;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .struct-header {
            background: var(--selection);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
        }
        
        .struct-name {
            font-weight: bold;
            font-size: 1.3em;
            color: var(--primary-color);
        }
        
        .struct-badges {
            display: flex;
            gap: 10px;
        }
        
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .badge-optimizable {
            background: var(--warning);
            color: var(--background);
        }
        
        .badge-optimized {
            background: var(--success);
            color: var(--background);
        }
        
        .struct-stats {
            background: var(--background);
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            border-bottom: 1px solid var(--border);
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        
        .memory-section {
            padding: 25px;
        }
        
        .section-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 20px;
            color: var(--primary-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .memory-layout {
            margin-bottom: 30px;
        }
        
        .layout-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, 22px);
            gap: 2px;
            margin: 20px 0;
            max-width: 100%;
            padding: 15px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        
        .memory-block {
            width: 22px;
            height: 22px;
            border: 1px solid var(--border);
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 2px;
        }
        
        .memory-block:hover {
            transform: scale(1.1);
            z-index: 10;
            border-width: 2px;
        }
        
        .field-block {
            background: var(--field-color);
            opacity: 0.8;
        }
        
        .padding-block {
            background: var(--padding-color);
            opacity: 0.6;
        }
        
        .field-info {
            margin: 25px 0;
        }
        
        .field-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .field-table th,
        .field-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }
        
        .field-table th {
            background: var(--selection);
            font-weight: bold;
            color: var(--primary-color);
            position: sticky;
            top: 0;
        }
        
        .field-table tr:hover {
            background: var(--hover);
        }
        
        .field-table tr:last-child td {
            border-bottom: none;
        }
        
        .field-name {
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .field-type {
            font-family: 'Courier New', monospace;
            background: var(--selection);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .optimization {
            margin-top: 30px;
            padding: 25px;
            background: var(--selection);
            border-radius: 8px;
            border: 1px solid var(--optimization-color);
        }
        
        .optimization-header {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 15px;
            color: var(--optimization-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .savings-highlight {
            font-size: 1.2em;
            color: var(--optimization-color);
            margin-bottom: 20px;
            padding: 15px;
            background: var(--background);
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
        }
        
        .button-group {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: bold;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        .button-secondary {
            background: var(--selection);
            color: var(--foreground);
            border: 1px solid var(--border);
        }
        
        .button-secondary:hover {
            background: var(--hover);
        }
        
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
            border: 1px solid var(--border);
            position: relative;
        }
        
        .code-block pre {
            margin: 0;
            white-space: pre-wrap;
            line-height: 1.5;
        }
        
        .tooltip {
            position: absolute;
            background: var(--vscode-editorHoverWidget-background);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            padding: 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            display: none;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .tooltip strong {
            color: var(--primary-color);
        }
        
        .export-section {
            margin-top: 40px;
            text-align: center;
            padding: 25px;
            background: var(--selection);
            border-radius: 8px;
        }
        
        .legend {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 2px;
            border: 1px solid var(--border);
        }
        
        .legend-field {
            background: var(--field-color);
            opacity: 0.8;
        }
        
        .legend-padding {
            background: var(--padding-color);
            opacity: 0.6;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .struct-stats,
            .summary-stats {
                grid-template-columns: 1fr;
            }
            
            .layout-grid {
                grid-template-columns: repeat(auto-fill, 18px);
            }
            
            .memory-block {
                width: 18px;
                height: 18px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .legend {
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧾 ByteWise Analysis</h1>
        <div class="subtitle">Memory Layout Analysis for ${escapeHtml(
          fileName
        )}</div>
    </div>
    
    ${generateSummaryStats(structs)}
    
    ${structs
      .map((struct, index) => generateStructHTML(struct, index))
      .join("")}
    
    <div class="export-section">
        <h3>📄 Export Analysis</h3>
        <p>Save this analysis as a markdown report for documentation or sharing.</p>
        <button onclick="exportAnalysis()" class="button-secondary">
            💾 Export Report
        </button>
    </div>
    
    <div class="tooltip" id="tooltip"></div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function copyCode(code) {
            vscode.postMessage({
                command: 'copyOptimized',
                code: code
            });
        }
        
        function applyOptimization(structName, code) {
            vscode.postMessage({
                command: 'applyOptimization',
                structName: structName,
                code: code
            });
        }
        
        function exportAnalysis() {
            vscode.postMessage({
                command: 'exportAnalysis'
            });
        }
        
        function showFieldDetails(structName, fieldName) {
            const structs = ${JSON.stringify(structs)};
            const struct = structs.find(s => s.name === structName);
            if (struct) {
                vscode.postMessage({
                    command: 'showFieldDetails',
                    struct: struct,
                    field: fieldName
                });
            }
        }
        
        // Tooltip functionality
        const tooltip = document.getElementById('tooltip');
        
        document.querySelectorAll('.memory-block').forEach(block => {
            block.addEventListener('mouseenter', (e) => {
                const info = e.target.dataset.info;
                if (info) {
                    tooltip.innerHTML = info;
                    tooltip.style.display = 'block';
                    
                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.left = (rect.left + rect.width + 10) + 'px';
                    tooltip.style.top = rect.top + 'px';
                    
                    // Adjust position if tooltip goes off-screen
                    setTimeout(() => {
                        const tooltipRect = tooltip.getBoundingClientRect();
                        if (tooltipRect.right > window.innerWidth) {
                            tooltip.style.left = (rect.left - tooltipRect.width - 10) + 'px';
                        }
                        if (tooltipRect.bottom > window.innerHeight) {
                            tooltip.style.top = (rect.top - tooltipRect.height - 10) + 'px';
                        }
                    }, 0);
                }
            });
            
            block.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
        
        // Add click handlers for field table rows
        document.querySelectorAll('.field-table tbody tr').forEach(row => {
            row.addEventListener('click', (e) => {
                const structContainer = e.target.closest('.struct-container');
                if (structContainer) {
                    const structName = structContainer.dataset.structName;
                    const fieldNameCell = row.querySelector('.field-name');
                    if (fieldNameCell && structName) {
                        const fieldName = fieldNameCell.textContent.trim();
                        showFieldDetails(structName, fieldName);
                    }
                }
            });
        });
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        console.log('ByteWise WebView loaded successfully');
    </script>
</body>
</html>`;
  }

  generateSummaryStats(structs) {
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
            <div class="summary-stats">
                <div class="summary-card">
                    <div class="summary-value">${totalStructs}</div>
                    <div class="summary-label">Structs Analyzed</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${totalBytes}</div>
                    <div class="summary-label">Total Bytes</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${totalPadding}</div>
                    <div class="summary-label">Padding Bytes</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${totalSavings}</div>
                    <div class="summary-label">Potential Savings</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${optimizableStructs}</div>
                    <div class="summary-label">Optimizable Structs</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${
                      totalBytes > 0
                        ? ((totalPadding / totalBytes) * 100).toFixed(1)
                        : 0
                    }%</div>
                    <div class="summary-label">Padding Ratio</div>
                </div>
            </div>`;
  }

  generateStructHTML(struct, index) {
    const memoryLayout = this.generateMemoryLayout(
      struct.fields || [],
      struct.totalSize || 0
    );
    const optimizedCode = this.generateOptimizedCode(struct);
    const hasOptimization = struct.memorySaved && struct.memorySaved > 0;

    return `
            <div class="struct-container" data-struct-name="${this.escapeHtml(
              struct.name || "Unknown"
            )}" id="struct-${index}">
                <div class="struct-header">
                    <div class="struct-name">struct ${this.escapeHtml(
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
                <div class="struct-stats">
                    <div class="stat">
                        <div class="stat-value">${struct.totalSize || 0}B</div>
                        <div class="stat-label">Original Size</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${
                          struct.paddingBytes || 0
                        }B</div>
                        <div class="stat-label">Padding</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${
                          (struct.fields || []).length
                        }</div>
                        <div class="stat-label">Fields</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${
                          struct.totalSize > 0
                            ? (
                                ((struct.paddingBytes || 0) /
                                  struct.totalSize) *
                                100
                              ).toFixed(1)
                            : 0
                        }%</div>
                        <div class="stat-label">Padding Ratio</div>
                    </div>
                    ${
                      hasOptimization
                        ? `
                    <div class="stat">
                        <div class="stat-value">${
                          struct.optimizedSize || 0
                        }B</div>
                        <div class="stat-label">Optimized Size</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${
                          struct.memorySaved || 0
                        }B</div>
                        <div class="stat-label">Memory Saved</div>
                    </div>
                    `
                        : ""
                    }
                </div>
                <div class="memory-section">
                    <div class="section-title">Memory Layout</div>
                    <div class="legend">
                        <div class="legend-item"><span class="legend-color legend-field"></span>Field</div>
                        <div class="legend-item"><span class="legend-color legend-padding"></span>Padding</div>
                    </div>
                    <div class="memory-layout">
                        <div class="layout-grid">
                            ${memoryLayout}
                        </div>
                    </div>
                </div>
                <div class="field-info">
                    <div class="section-title">Field Details</div>
                    <table class="field-table">
                        <thead>
                            <tr>
                                <th>Field Name</th>
                                <th>Type</th>
                                <th>Size (B)</th>
                                <th>Offset (B)</th>
                                <th>Alignment (B)</th>
                                <th>Padding (B)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(struct.fields || [])
                              .map(
                                (field) => `
                            <tr onclick="showFieldDetails('${this.escapeHtml(
                              struct.name || ""
                            )}', '${this.escapeHtml(field.name || "")}')">
                                <td class="field-name">${this.escapeHtml(
                                  field.name || ""
                                )}</td>
                                <td class="field-type">${this.escapeHtml(
                                  field.type || ""
                                )}</td>
                                <td>${field.size || 0}</td>
                                <td>${field.offset || 0}</td>
                                <td>${field.alignment || 0}</td>
                                <td>${field.padding || 0}</td>
                            </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
                ${
                  hasOptimization
                    ? `
                <div class="optimization">
                    <div class="optimization-header">Optimization Suggestion</div>
                    <div class="savings-highlight">
                        Reordering fields could save <strong>${
                          struct.memorySaved
                        } bytes</strong> (${(
                        struct.optimizationRatio || 0
                      ).toFixed(1)}% reduction).
                        <br>New size: ${
                          struct.optimizedSize || 0
                        } bytes (from ${struct.totalSize || 0} bytes).
                    </div>
                    <div class="code-block">
                        <pre>${this.escapeHtml(optimizedCode)}</pre>
                    </div>
                    <div class="button-group">
                        <button onclick="copyCode(\`${this.escapeHtml(
                          optimizedCode
                        )}\`)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy Optimized Code
                        </button>
                        <button onclick="applyOptimization('${this.escapeHtml(
                          struct.name || ""
                        )}', \`${this.escapeHtml(optimizedCode)}\`)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            Apply Optimization
                        </button>
                    </div>
                </div>
                `
                    : `
                <div class="optimization">
                    <div class="optimization-header">Optimization</div>
                    <p>This struct appears to be optimally arranged; no significant memory savings are expected from reordering fields.</p>
                </div>
                `
                }
            </div>`;
  }
}

module.exports = WebViewProvider;
