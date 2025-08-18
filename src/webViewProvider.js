const vscode = require("vscode");
const path = require("path");
const { generateWebviewContent } = require("./generators/htmlGenerator");
const { StructAnalyzer } = require("./structAnalyzer");
const { generateMarkdownReport } = require("./generators/markdownGenerator");
const {
  WEBVIEW_TYPE,
  WEBVIEW_TITLE,
  WEBVIEW_MESSAGE_COMMANDS,
} = require("./constants");

/**
 * Provides webview functionality for displaying struct analysis results
 */
class WebViewProvider {
  /**
   * Create a new WebViewProvider instance
   * @param {vscode.Uri} extensionUri - The extension's URI
   */
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.panel = undefined;
    this.preserveFocus = false;
    this.analyzer = new StructAnalyzer();
  }

  /**
   * Set whether to preserve focus when showing the webview
   * @param {boolean} preserve - Whether to preserve focus
   */
  setPreserveFocus(preserve) {
    this.preserveFocus = preserve;
  }

  /**
   * Show analysis results in the webview
   * @param {Array} structs - Array of struct information
   * @param {string} fileName - Source file name
   */
  async showAnalysis(structs, fileName = "Unknown", documentUri) {
    // remember last analyzed document for applyOptimization fallback
    if (documentUri) this.lastDocumentUri = documentUri;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceRoot = workspaceFolder?.uri?.fsPath;
    const relativeName =
      workspaceRoot && fileName.startsWith(workspaceRoot)
        ? path.relative(workspaceRoot, fileName)
        : fileName;

    // Build a compact tree of the workspace (depth-limited) with optimization status
    const workspaceTree = await this.buildWorkspaceTree(workspaceFolder, 2, 8);

    if (this.panel) {
      // Always regenerate HTML completely instead of trying to update
      this.panel.webview.html = generateWebviewContent(
        structs,
        relativeName,
        workspaceTree
      );

      if (!this.preserveFocus) {
        this.panel.reveal(vscode.ViewColumn.Two);
      }
    } else {
      // Create new panel
      this.panel = vscode.window.createWebviewPanel(
        WEBVIEW_TYPE,
        WEBVIEW_TITLE,
        this.preserveFocus ? vscode.ViewColumn.Two : vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [this.extensionUri],
        }
      );

      console.log("Structs to render:", JSON.stringify(structs, null, 2));
      this.panel.reveal(vscode.ViewColumn.Beside, this.preserveFocus);

      this.panel.webview.html = generateWebviewContent(
        structs,
        relativeName,
        workspaceTree
      );

      // Handle messages from webview
      this.panel.webview.onDidReceiveMessage(async (message) => {
        await this.handleWebviewMessage(message, structs, fileName);
      });

      // Handle panel disposal
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    this.preserveFocus = false;
  }

  /**
   * Handle messages from the webview
   * @param {Object} message - Message from webview
   * @param {Array} structs - Current struct data
   * @param {string} fileName - Current file name
   */
  async handleWebviewMessage(message, structs, fileName) {
    switch (message.command) {
      case WEBVIEW_MESSAGE_COMMANDS.COPY_OPTIMIZED:
        await vscode.env.clipboard.writeText(message.code);
        vscode.window.showInformationMessage(
          "Optimized struct copied to clipboard! 📋"
        );
        break;

      case WEBVIEW_MESSAGE_COMMANDS.APPLY_OPTIMIZATION:
        await this.applyOptimization(message.structName, message.code);
        break;

      case WEBVIEW_MESSAGE_COMMANDS.EXPORT_ANALYSIS:
        await this.exportAnalysis(structs, fileName);
        break;

      case WEBVIEW_MESSAGE_COMMANDS.OPEN_FILE_ANALYSIS: {
        const relPath = message.path;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        const absUri = vscode.Uri.file(
          path.join(workspaceFolder.uri.fsPath, relPath)
        );
        try {
          const doc = await vscode.workspace.openTextDocument(absUri);
          const text = doc.getText();
          const newStructs = this.analyzer.parseStructs(text);
          this.lastDocumentUri = doc.uri;
          const workspaceTree = await this.buildWorkspaceTree(
            workspaceFolder,
            2,
            8
          );
          this.panel.webview.html = generateWebviewContent(
            newStructs,
            relPath,
            workspaceTree
          );
        } catch (e) {
          vscode.window.showErrorMessage(
            `Failed to analyze ${relPath}: ${e.message}`
          );
        }
        break;
      }

      case WEBVIEW_MESSAGE_COMMANDS.SHOW_FIELD_DETAILS:
        this.showFieldDetails(message.struct, message.field);
        break;
    }
  }

  /**
   * Apply optimization by inserting optimized code into the editor
   * @param {string} structName - Name of the struct being optimized
   * @param {string} optimizedCode - The optimized struct code
   */
  async applyOptimization(structName, optimizedCode) {
    let editor = vscode.window.activeTextEditor;
    if (!editor && this.lastDocumentUri) {
      try {
        const doc = await vscode.workspace.openTextDocument(
          this.lastDocumentUri
        );
        editor = await vscode.window.showTextDocument(doc, { preview: false });
      } catch (e) {
        // fall through to message below
      }
    }
    if (!editor) {
      vscode.window.showErrorMessage(
        "No active editor found for applying optimization"
      );
      return;
    }

    const choice = await vscode.window.showInformationMessage(
      `Apply optimization for struct ${structName}?`,
      { modal: true },
      "Yes",
      "No"
    );

    if (choice === "Yes") {
      const range = this.findStructRange(editor.document, structName);
      if (range) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(range, optimizedCode + "\n");
        });
      } else {
        // Fallback: insert at cursor if the struct range could not be determined
        const position = editor.selection.active;
        await editor.edit((editBuilder) => {
          editBuilder.insert(position, "\n" + optimizedCode + "\n");
        });
      }
      vscode.window.showInformationMessage(
        `✨ Optimized struct ${structName} applied!`
      );
    }
  }

  /**
   * Find the range of a struct definition by name using brace balancing
   * @param {vscode.TextDocument} document
   * @param {string} structName
   * @returns {vscode.Range | undefined}
   */
  findStructRange(document, structName) {
    try {
      const text = document.getText();
      // Case 1: named struct: struct <name> { ... };
      let startRegex = new RegExp(`struct\\s+${structName}\\s*\\{`, "m");
      let match = startRegex.exec(text);
      // Case 2: typedef with trailing name: typedef struct { ... } <name>;
      let isTypedefTrailing = false;
      if (!match) {
        startRegex = new RegExp(`typedef\\s+struct\\s*(?:\\w+)?\\s*\\{`, "m");
        match = startRegex.exec(text);
        isTypedefTrailing = true;
      }
      if (!match) return undefined;
      let index = match.index + match[0].length;
      let depth = 1;
      while (index < text.length && depth > 0) {
        const ch = text[index++];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      // After closing brace, there may be whitespace, an alias, and ';'
      const afterBraceStart = index;
      while (index < text.length && /\s/.test(text[index])) index++;
      if (isTypedefTrailing) {
        // capture trailing name before semicolon
        const nameStart = index;
        while (index < text.length && /[\w_]/.test(text[index])) index++;
        const alias = text.slice(nameStart, index);
        if (alias !== structName) {
          // Not the typedef target we want; fallback to no match
          return undefined;
        }
      }
      while (index < text.length && text[index] !== ";") index++;
      if (index < text.length && text[index] === ";") index++;
      const start = document.positionAt(match.index);
      const end = document.positionAt(index);
      return new vscode.Range(start, end);
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Export analysis results to a markdown file
   * @param {Array} structs - Array of struct information
   * @param {string} fileName - Source file name
   */
  async exportAnalysis(structs, fileName) {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const baseName = path.basename(fileName).replace(/\.[^/.]+$/, "");
      const defaultFileName = `${baseName || "analysis"}_bytewise_analysis.md`;
      const defaultUri = workspaceFolder
        ? vscode.Uri.file(
            path.join(workspaceFolder.uri.fsPath, defaultFileName)
          )
        : undefined;
      const uri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: {
          Markdown: ["md"],
          Text: ["txt"],
          "All Files": ["*"],
        },
      });

      if (uri) {
        const markdown = generateMarkdownReport(structs, fileName);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, "utf8"));
        vscode.window.showInformationMessage(
          `Analysis exported to ${uri.fsPath} 📄`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error.message}`);
    }
  }

  /**
   * Show detailed information about a struct field
   * @param {Object} structInfo - The struct information
   * @param {string} fieldName - Name of the field to show details for
   */
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

  /**
   * Build a compact Mermaid diagram representing the workspace tree
   * @param {vscode.WorkspaceFolder|undefined} workspaceFolder
   * @param {number} maxDepth
   * @param {number} maxEntriesPerDir
   * @returns {Promise<string|undefined>}
   */
  async buildWorkspaceAscii(
    workspaceFolder,
    maxDepth = 2,
    maxEntriesPerDir = 8
  ) {
    try {
      if (!workspaceFolder) return undefined;
      // Collect files (ignore common noisy folders)
      const uris = await vscode.workspace.findFiles(
        "**/*",
        "**/{node_modules,.git,.next,dist,build,out,.vscode,coverage,.cache}/**",
        500
      );

      const rootPath = workspaceFolder.uri.fsPath;
      /** @type {Object.<string, any>} */
      const tree = {};

      for (const uri of uris) {
        const rel = path.relative(rootPath, uri.fsPath);
        if (!rel || rel.startsWith("..")) continue;
        const parts = rel.split(path.sep);
        let node = tree;
        for (let i = 0; i < Math.min(parts.length, maxDepth + 1); i++) {
          const part = parts[i];
          const isFile = i === parts.length - 1;
          if (i === maxDepth) {
            // Stop expanding deeper; count remaining as ellipsis
            node["…"] = (node["…"] || 0) + 1;
            break;
          }
          if (!node[part]) node[part] = {};
          if (isFile) {
            // mark file leaf
            node[part] = null;
          } else {
            if (node[part] !== null) node = node[part];
          }
        }
      }

      // Convert to ASCII tree using arrows
      const lines = [];
      const rootLabel = path.basename(rootPath) || "workspace";
      lines.push(rootLabel);

      function walk(node, depth) {
        const entries = Object.entries(node || {});
        const limited = entries.slice(0, maxEntriesPerDir);
        for (const [name, child] of limited) {
          const prefix = "  ".repeat(depth) + "-> ";
          lines.push(prefix + name);
          if (child && depth < maxDepth) {
            walk(child, depth + 1);
          }
        }
        if (entries.length > maxEntriesPerDir) {
          const prefix = "  ".repeat(depth) + "-> ";
          lines.push(prefix + "...");
        }
        if (node && node["…"]) {
          const prefix = "  ".repeat(depth) + "-> ";
          lines.push(prefix + `… ${node["…"]} more`);
        }
      }

      walk(tree, 1);
      return lines.join("\n");
    } catch (err) {
      console.warn("Workspace tree build failed:", err?.message || err);
      return undefined;
    }
  }

  /**
   * Build a structured workspace tree with per-file optimization status.
   * @param {vscode.WorkspaceFolder|undefined} workspaceFolder
   * @param {number} maxDepth
   * @param {number} maxEntriesPerDir
   * @returns {Promise<Object|undefined>}
   */
  async buildWorkspaceTree(
    workspaceFolder,
    maxDepth = 2,
    maxEntriesPerDir = 8
  ) {
    try {
      if (!workspaceFolder) return undefined;
      const uris = await vscode.workspace.findFiles(
        "**/*.{c,cpp,h,hpp}",
        "**/{node_modules,.git,.next,dist,build,out,.vscode,coverage,.cache}/**",
        1000
      );

      const rootPath = workspaceFolder.uri.fsPath;
      const tree = {};
      for (const uri of uris) {
        const rel = path.relative(rootPath, uri.fsPath);
        if (!rel || rel.startsWith("..")) continue;
        const parts = rel.split(path.sep);
        let node = tree;
        for (let i = 0; i < Math.min(parts.length, maxDepth + 1); i++) {
          const part = parts[i];
          const isFile = i === parts.length - 1;
          if (i === maxDepth) {
            node["…"] = (node["…"] || 0) + 1;
            break;
          }
          if (!node[part]) node[part] = {};
          if (isFile) node[part] = null;
          else if (node[part] !== null) node = node[part];
        }
      }

      const root = {
        name: path.basename(rootPath) || "workspace",
        folders: [],
        files: [],
      };
      const analyzeFileStatus = async (relPath) => {
        try {
          const fileUri = vscode.Uri.file(path.join(rootPath, relPath));
          const doc = await vscode.workspace.openTextDocument(fileUri);
          const structs = this.analyzer.parseStructs(doc.getText());
          if (structs.length === 0)
            return { hasStructs: false, isOptimized: true };
          const hasSavings = structs.some((s) => (s.memorySaved || 0) > 0);
          return { hasStructs: true, isOptimized: !hasSavings };
        } catch {
          return { hasStructs: false, isOptimized: false };
        }
      };

      const walkBuild = async (nodeObj, nodeMap, relBase, depth) => {
        const entries = Object.entries(nodeMap || {});
        const limited = entries.slice(0, maxEntriesPerDir);
        for (const [name, child] of limited) {
          const relPath = relBase ? path.join(relBase, name) : name;
          if (child === null) {
            const status = await analyzeFileStatus(relPath);
            nodeObj.files.push({
              name,
              relPath: relPath.replace(/\\/g, "/"),
              status,
            });
          } else {
            const folder = { name, folders: [], files: [] };
            nodeObj.folders.push(folder);
            if (depth < maxDepth) {
              await walkBuild(folder, child, relPath, depth + 1);
            }
          }
        }
        if (entries.length > maxEntriesPerDir) {
          nodeObj.files.push({
            name: "...",
            relPath: "",
            status: { hasStructs: false, isOptimized: true },
            ellipsis: true,
          });
        }
        if (nodeMap && nodeMap["…"]) {
          nodeObj.files.push({
            name: `… ${nodeMap["…"]} more`,
            relPath: "",
            status: { hasStructs: false, isOptimized: true },
            ellipsis: true,
          });
        }
      };

      await walkBuild(root, tree, "", 1);
      return root;
    } catch (err) {
      console.warn("Workspace tree build failed:", err?.message || err);
      return undefined;
    }
  }
}

module.exports = WebViewProvider;
