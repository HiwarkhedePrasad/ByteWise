const vscode = require("vscode");
const { generateWebviewContent } = require("./generators/htmlGenerator");
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
  async showAnalysis(structs, fileName = "Unknown") {
    if (this.panel) {
      // Always regenerate HTML completely instead of trying to update
      this.panel.webview.html = generateWebviewContent(structs, fileName);

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
      this.panel.reveal(vscode.ViewColumn.Beside, true);

      this.panel.webview.html = generateWebviewContent(structs, fileName);

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

  /**
   * Export analysis results to a markdown file
   * @param {Array} structs - Array of struct information
   * @param {string} fileName - Source file name
   */
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
}

module.exports = WebViewProvider;
