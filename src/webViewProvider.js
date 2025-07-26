const vscode = require("vscode");

class WebViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.panel = undefined;
    this.preserveFocus = false;
  }

  setPreserveFocus(preserve) {
    this.preserveFocus = preserve;
  }

  // In webViewProvider.js, replace the showAnalysis method with this fixed version:

  async showAnalysis(structs, fileName = "Unknown") {
    if (this.panel) {
      // FIXED: Always regenerate HTML completely instead of trying to update
      this.panel.webview.html = this.getWebviewContent(structs, fileName);

      // Remove the postMessage call that was causing issues
      // The HTML already contains all the data we need

      if (!this.preserveFocus) {
        this.panel.reveal(vscode.ViewColumn.Two);
      }
    } else {
      // Create new panel
      this.panel = vscode.window.createWebviewPanel(
        "byteWiseAnalysis",
        "ByteWise - Struct Analysis",
        this.preserveFocus ? vscode.ViewColumn.Two : vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [this.extensionUri],
        }
      );

      console.log("Structs to render:", JSON.stringify(structs, null, 2));
      this.panel.reveal(vscode.ViewColumn.Beside, true);

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

    this.preserveFocus = false;
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
            `<div class="memory-block padding-block" data-info="Padding Byte" data-tooltip="Padding byte added for alignment"></div>`
          );
        }
      }
      // Add field blocks
      for (let i = 0; i < field.size; i++) {
        layoutBlocks.push(
          `<div class="memory-block field-block" 
            data-info="${this.escapeHtml(field.name)}" 
            data-tooltip="<strong>${this.escapeHtml(field.name)}</strong><br/>
            Type: ${this.escapeHtml(field.type)}<br/>
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
    const escapeHtml = this.escapeHtml;
    const generateSummaryStats = this.generateSummaryStats.bind(this);
    const generateStructHTML = this.generateStructHTML.bind(this);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ByteWise Analysis</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            /* Excalidraw-inspired color palette */
            --bg-primary: #ffffff;
            --bg-secondary: #fafbfc;
            --bg-tertiary: #f5f6f7;
            --bg-accent: #e3f2fd;
            --bg-hover: #f8f9fa;
            
            --text-primary: #1a1a1a;
            --text-secondary: #6b7280;
            --text-tertiary: #9ca3af;
            --text-accent: #2563eb;
            
            --border-light: #e5e7eb;
            --border-medium: #d1d5db;
            --border-strong: #9ca3af;
            
            --accent-blue: #2563eb;
            --accent-green: #059669;
            --accent-orange: #ea580c;
            --accent-purple: #7c3aed;
            --accent-red: #dc2626;
            
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            
            --radius-sm: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --radius-xl: 16px;
            
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--font-sans);
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
            min-height: 100vh;
        }
        
        .app-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 32px 24px;
        }
        
        /* Header */
        .header {
            text-align: center;
            margin-bottom: 48px;
        }
        
        .header-title {
            font-size: 32px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        
        .header-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
        }
        
        .header-subtitle {
            font-size: 16px;
            color: var(--text-secondary);
            font-weight: 400;
        }
        
        .header-filename {
            display: inline-flex;
            align-items: center;
            background: var(--bg-tertiary);
            padding: 4px 12px;
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: 14px;
            margin-top: 12px;
            color: var(--text-accent);
            border: 1px solid var(--border-light);
        }
        
        /* Summary Cards */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            margin-bottom: 48px;
        }
        
        .summary-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-lg);
            padding: 24px;
            text-align: center;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        
        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
        }
        
        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
            border-color: var(--border-medium);
        }
        
        .summary-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
            font-variant-numeric: tabular-nums;
        }
        
        .summary-label {
            font-size: 14px;
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        /* Struct Cards */
        .struct-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-xl);
            margin-bottom: 32px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            transition: all 0.3s ease;
        }
        
        .struct-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-1px);
        }
        
        .struct-header {
            background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
            padding: 24px 32px;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
        }
        
        .struct-name {
            font-family: var(--font-mono);
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .struct-name::before {
            content: '';
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--accent-blue);
        }
        
        .struct-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .badge {
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-optimizable {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fbbf24;
        }
        
        .badge-optimized {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #34d399;
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1px;
            background: var(--border-light);
            border-radius: var(--radius-md);
            overflow: hidden;
            margin: 0 32px 32px 32px;
        }
        
        .stat-item {
            background: var(--bg-primary);
            padding: 20px 16px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 4px;
            font-variant-numeric: tabular-nums;
        }
        
        .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Memory Layout Section */
        .memory-section {
            padding: 32px;
            border-bottom: 1px solid var(--border-light);
        }
        
        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .section-title::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent-blue);
        }
        
        .memory-legend {
            display: flex;
            gap: 16px;
            align-items: center;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
            border: 1px solid var(--border-medium);
        }
        
        .legend-field {
            background: var(--accent-blue);
            opacity: 0.7;
        }
        
        .legend-padding {
            background: var(--accent-red);
            opacity: 0.7;
        }
        
        /* Memory Layout Grid */
        .memory-layout {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: 24px;
            border: 1px solid var(--border-light);
        }
        
        .layout-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, 24px);
            gap: 2px;
            justify-content: center;
        }
        
        .memory-block {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            border: 1px solid var(--border-light);
        }
        
        .memory-block:hover {
            transform: scale(1.1);
            z-index: 10;
            box-shadow: var(--shadow-md);
        }
        
        .field-block {
            background: var(--field-color, var(--accent-blue));
            opacity: 0.8;
        }
        
        .padding-block {
            background: var(--accent-red);
            opacity: 0.6;
        }
        
        /* Field Table */
        .field-section {
            padding: 32px;
        }
        
        .field-table-container {
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-lg);
            overflow: hidden;
        }
        
        .field-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .field-table th {
            background: var(--bg-tertiary);
            padding: 16px 20px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid var(--border-light);
        }
        
        .field-table td {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-light);
            font-size: 14px;
            transition: background-color 0.2s ease;
        }
        
        .field-table tbody tr:hover {
            background: var(--bg-hover);
            cursor: pointer;
        }
        
        .field-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .field-name {
            font-family: var(--font-mono);
            font-weight: 600;
            color: var(--text-accent);
        }
        
        .field-type {
            font-family: var(--font-mono);
            font-size: 13px;
            background: var(--bg-tertiary);
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            color: var(--text-primary);
        }
        
        /* Optimization Section */
        .optimization-section {
            padding: 32px;
            background: linear-gradient(135deg, #fefce8, #fef3c7);
            border-top: 1px solid var(--border-light);
        }
        
        .optimization-header {
            text-align: center;
            margin-bottom: 24px;
        }
        
        .optimization-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .optimization-subtitle {
            font-size: 16px;
            color: var(--text-secondary);
        }
        
        .savings-highlight {
            background: var(--bg-primary);
            border: 2px solid var(--accent-green);
            border-radius: var(--radius-lg);
            padding: 24px;
            text-align: center;
            margin-bottom: 24px;
            box-shadow: var(--shadow-sm);
        }
        
        .savings-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--accent-green);
            margin-bottom: 8px;
        }
        
        .savings-details {
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        /* Code Block */
        .code-container {
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-lg);
            overflow: hidden;
            margin-bottom: 24px;
        }
        
        .code-header {
            background: var(--bg-tertiary);
            padding: 12px 20px;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .code-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
        }
        
        .code-block {
            padding: 24px;
            font-family: var(--font-mono);
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-secondary);
            overflow-x: auto;
        }
        
        /* Buttons */
        .button-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: var(--radius-md);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            outline: none;
        }
        
        .btn-primary {
            background: var(--accent-blue);
            color: white;
        }
        
        .btn-primary:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }
        
        .btn-secondary {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-medium);
        }
        
        .btn-secondary:hover {
            background: var(--bg-hover);
            border-color: var(--border-strong);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
        }
        
        .btn-success {
            background: var(--accent-green);
            color: white;
        }
        
        .btn-success:hover {
            background: #047857;
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }
        
        /* Export Section */
        .export-section {
            text-align: center;
            padding: 48px 32px;
            background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
            border-top: 1px solid var(--border-light);
        }
        
        .export-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        
        .export-subtitle {
            color: var(--text-secondary);
            margin-bottom: 24px;
        }
        
        /* Tooltip */
        .tooltip {
            position: absolute;
            background: var(--text-primary);
            color: var(--bg-primary);
            padding: 12px 16px;
            border-radius: var(--radius-md);
            font-size: 12px;
            font-weight: 500;
            line-height: 1.4;
            z-index: 1000;
            pointer-events: none;
            display: none;
            max-width: 280px;
            box-shadow: var(--shadow-xl);
            opacity: 0;
            transform: translateY(4px);
            transition: all 0.2s ease;
        }
        
        .tooltip.show {
            display: block;
            opacity: 1;
            transform: translateY(0);
        }
        
        .tooltip::after {
            content: '';
            position: absolute;
            top: -4px;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-bottom-color: var(--text-primary);
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .app-container {
                padding: 24px 16px;
            }
            
            .summary-grid {
                grid-template-columns: 1fr;
            }
            
            .struct-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                margin: 0 16px 24px 16px;
            }
            
            .memory-section,
            .field-section {
                padding: 24px 16px;
            }
            
            .layout-grid {
                grid-template-columns: repeat(auto-fill, 20px);
            }
            
            .memory-block {
                width: 20px;
                height: 20px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .btn {
                justify-content: center;
            }
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(24px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .struct-card {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        .struct-card:nth-child(2) { animation-delay: 0.1s; }
        .struct-card:nth-child(3) { animation-delay: 0.2s; }
        .struct-card:nth-child(4) { animation-delay: 0.3s; }
        
        /* Focus styles for accessibility */
        .btn:focus,
        .memory-block:focus {
            outline: 2px solid var(--accent-blue);
            outline-offset: 2px;
        }
        
        .field-table tbody tr:focus {
            outline: 2px solid var(--accent-blue);
            outline-offset: -2px;
        }
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
    
   // In the getWebviewContent method, replace the entire <script> section with this:

<script>
    const vscode = acquireVsCodeApi();
    
    // Store the current data globally for reference
    let currentStructs = ${JSON.stringify(structs)};
    let currentFileName = '${escapeHtml(fileName)}';
    
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
        const struct = currentStructs.find(s => s.name === structName);
        if (struct) {
            vscode.postMessage({
                command: 'showFieldDetails',
                struct: struct,
                field: fieldName
            });
        }
    }
    
    // Enhanced tooltip functionality
    const tooltip = document.getElementById('tooltip');
    let tooltipTimeout;
    
    function showTooltip(element, content) {
        clearTimeout(tooltipTimeout);
        tooltip.innerHTML = content;
        tooltip.classList.add('show');
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 12;
        
        // Adjust if tooltip goes off-screen
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        if (top < 8) {
            top = rect.bottom + 12;
            tooltip.style.transform = 'translateY(-4px)';
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }
    
    function hideTooltip() {
        tooltipTimeout = setTimeout(() => {
            tooltip.classList.remove('show');
        }, 100);
    }
    
    // Add event listeners for memory blocks
    document.querySelectorAll('.memory-block').forEach(block => {
        block.addEventListener('mouseenter', (e) => {
            const tooltipContent = e.target.dataset.tooltip;
            if (tooltipContent) {
                showTooltip(e.target, tooltipContent);
            }
        });
        
        block.addEventListener('mouseleave', hideTooltip);
        
        // Add keyboard support
        block.setAttribute('tabindex', '0');
        block.addEventListener('focus', (e) => {
            const tooltipContent = e.target.dataset.tooltip;
            if (tooltipContent) {
                showTooltip(e.target, tooltipContent);
            }
        });
        
        block.addEventListener('blur', hideTooltip);
    });
    
    // Add click handlers for field table rows
    document.querySelectorAll('.field-table tbody tr').forEach(row => {
        row.setAttribute('tabindex', '0');
        row.addEventListener('click', (e) => {
            const structContainer = e.target.closest('.struct-card');
            if (structContainer) {
                const structName = structContainer.dataset.structName;
                const fieldNameCell = row.querySelector('.field-name');
                if (fieldNameCell && structName) {
                    const fieldName = fieldNameCell.textContent.trim();
                    showFieldDetails(structName, fieldName);
                }
            }
        });
        
        // Keyboard support for table rows
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                row.click();
            }
        });
    });
    
    // REMOVED: The problematic message handler that was causing blank screens
    // No longer listening for 'updateAnalysis' messages since we regenerate HTML completely
    
    console.log('ByteWise WebView loaded successfully with modern design');
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
        <div class="struct-card" data-struct-name="${this.escapeHtml(
          struct.name || "Unknown"
        )}">
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
                    <div class="stat-value">${
                      (struct.fields || []).length
                    }</div>
                    <div class="stat-label">Fields</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${
                      struct.totalSize > 0
                        ? (
                            ((struct.paddingBytes || 0) / struct.totalSize) *
                            100
                          ).toFixed(1)
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
                                <td class="field-name">${this.escapeHtml(
                                  field.name || ""
                                )}</td>
                                <td><span class="field-type">${this.escapeHtml(
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
                        ${(struct.optimizationRatio || 0).toFixed(
                          1
                        )}% reduction 
                        (${struct.totalSize || 0}B → ${
                    struct.optimizedSize || 0
                  }B)
                    </div>
                </div>
                
                <div class="code-container">
                    <div class="code-header">
                        <div class="code-title">Optimized Structure</div>
                    </div>
                    <div class="code-block">${this.escapeHtml(
                      optimizedCode
                    )}</div>
                </div>
                
                <div class="button-group">
                    <button onclick="copyCode(\`${this.escapeHtml(
                      optimizedCode.replace(/`/g, "\\`")
                    )}\`)" class="btn btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy Code
                    </button>
                    <button onclick="applyOptimization('${this.escapeHtml(
                      struct.name || ""
                    )}', \`${this.escapeHtml(
                    optimizedCode.replace(/`/g, "\\`")
                  )}\`)" class="btn btn-success">
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
}

module.exports = WebViewProvider;
