const vscode = require("vscode");
const { StructAnalyzer } = require("./src/structAnalyzer");
const WebViewProvider = require("./src/webViewProvider");
const {
  COMMANDS,
  SUPPORTED_LANGUAGES,
  DIAGNOSTIC_SOURCE,
  DIAGNOSTIC_CODE,
  EXTENSION_NAME,
} = require("./src/constants");

/**
 * @type {WebViewProvider | undefined}
 * Declare webViewProvider outside activate to maintain its instance across calls.
 */
let byteWiseWebViewProvider;

/**
 * Activate the ByteWise extension
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function activate(context) {
  console.log("ByteWise extension is now active!");

  const analyzer = new StructAnalyzer();
  byteWiseWebViewProvider = new WebViewProvider(context.extensionUri);

  // Register diagnostic provider
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection(EXTENSION_NAME);

  /**
   * Update diagnostics only (for real-time feedback while typing)
   * @param {vscode.TextDocument} document - The document to update diagnostics for
   */
  async function updateDiagnosticsOnly(document) {
    if (!document || !SUPPORTED_LANGUAGES.includes(document.languageId)) {
      return;
    }

    const text = document.getText();
    try {
      const structs = analyzer.parseStructs(text);

      // Update Diagnostics only
      const diagnostics = [];
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      if (config.get("showOptimizations", true)) {
        structs.forEach((struct) => {
          if (struct.memorySaved && struct.memorySaved > 0) {
            const structRegex = new RegExp(
              `struct\\s+${struct.name}\\s*\\{`,
              "g"
            );
            const match = structRegex.exec(text);

            if (match) {
              const position = document.positionAt(match.index);
              const range = new vscode.Range(
                position,
                position.translate(0, match[0].length)
              );

              const diagnostic = new vscode.Diagnostic(
                range,
                `Struct can be optimized to save ${
                  struct.memorySaved
                } bytes (${(
                  (struct.memorySaved / struct.totalSize) *
                  100
                ).toFixed(1)}% reduction)`,
                vscode.DiagnosticSeverity.Information
              );
              diagnostic.source = DIAGNOSTIC_SOURCE;
              diagnostic.code = DIAGNOSTIC_CODE;
              diagnostics.push(diagnostic);
            }
          }
        });
      }
      diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      console.error(
        "ByteWise analysis error during diagnostics update:",
        error
      );
      diagnosticCollection.set(document.uri, []);
    }
  }

  /**
   * Perform analysis and update UI (both diagnostics and webview)
   * @param {vscode.TextDocument} document - The document to analyze
   * @param {boolean} triggerShowWebview - Force webview to open even if no structs found
   */
  async function performAnalysisAndDisplay(
    document,
    triggerShowWebview = false
  ) {
    if (!document || !SUPPORTED_LANGUAGES.includes(document.languageId)) {
      return;
    }

    const text = document.getText();
    try {
      const structs = analyzer.parseStructs(text);
      console.log(
        `ByteWise: Parsed ${structs.length} structs from ${document.fileName}`
      );

      // Always update diagnostics first
      await updateDiagnosticsOnly(document);

      // Logic for showing/updating the webview:
      // 1. If a command explicitly triggered it (triggerShowWebview is true).
      // 2. If the panel is already open and visible.
      // 3. If structs are found and the panel is not yet open (to open it automatically).
      if (
        triggerShowWebview ||
        (byteWiseWebViewProvider.panel &&
          byteWiseWebViewProvider.panel.visible) ||
        structs.length > 0 // Always show webview if structs exist
      ) {
        // Pass the analysis results to the webview provider
        // The showAnalysis method in WebViewProvider will handle creating/updating the panel
        await byteWiseWebViewProvider.showAnalysis(structs, document.fileName);
      } else if (
        structs.length === 0 &&
        byteWiseWebViewProvider.panel &&
        byteWiseWebViewProvider.panel.visible
      ) {
        // If no structs are found, but the panel is visible, update it to show "No structs found" message.
        // This prevents the panel from showing stale data or remaining blank if all structs are removed.
        await byteWiseWebViewProvider.showAnalysis([], document.fileName);
      }
    } catch (error) {
      console.error("ByteWise analysis error:", error);
      if (triggerShowWebview) {
        vscode.window.showErrorMessage(
          `ByteWise analysis failed: ${error.message}`
        );
      }
      // If an error occurs during parsing, and the webview is open,
      // you might want to show an error message in the webview itself.
      if (
        byteWiseWebViewProvider.panel &&
        byteWiseWebViewProvider.panel.visible
      ) {
        byteWiseWebViewProvider.showAnalysis([], document.fileName); // Pass error message to webview
      }
    }
  }

  // --- Register Commands ---
  const analyzeCommand = vscode.commands.registerCommand(
    COMMANDS.ANALYZE_STRUCT,
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      // Command should always show webview, even if empty
      await performAnalysisAndDisplay(editor.document, true);

      const structs = analyzer.parseStructs(editor.document.getText());
      if (structs.length > 0) {
        vscode.window.showInformationMessage(
          `Found ${structs.length} struct(s) for analysis`
        );
      } else {
        vscode.window.showInformationMessage(
          "No structs found in the current file."
        );
      }
    }
  );

  const analyzeSelectionCommand = vscode.commands.registerCommand(
    COMMANDS.ANALYZE_SELECTION,
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage("No text selected");
        return;
      }

      const text = editor.document.getText(selection);

      try {
        const structs = analyzer.parseStructs(text);
        // For selection, always show analysis in the webview
        await byteWiseWebViewProvider.showAnalysis(
          structs,
          editor.document.fileName
        );

        if (structs.length === 0) {
          vscode.window.showInformationMessage("No structs found in selection");
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Selection analysis failed: ${error.message}`
        );
      }
    }
  );

  const analyzeFileCommand = vscode.commands.registerCommand(
    COMMANDS.ANALYZE_FILE,
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      // Command should always show webview, even if empty
      await performAnalysisAndDisplay(editor.document, true);

      const structs = analyzer.parseStructs(editor.document.getText());
      const totalBytes = structs.reduce(
        (sum, s) => sum + (s.totalSize || 0),
        0
      );
      const totalPadding = structs.reduce(
        (sum, s) => sum + (s.paddingBytes || 0),
        0
      );
      const totalSavings = structs.reduce(
        (sum, s) => sum + (s.memorySaved || 0),
        0
      );
      vscode.window.showInformationMessage(
        `Analyzed ${structs.length} structs: ${totalBytes} bytes total, ${totalPadding} padding, ${totalSavings} potential savings`
      );
    }
  );

  const settingsCommand = vscode.commands.registerCommand(
    COMMANDS.OPEN_SETTINGS,
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        EXTENSION_NAME
      );
    }
  );

  // Register hover provider for inline hints
  const hoverProvider = vscode.languages.registerHoverProvider(
    SUPPORTED_LANGUAGES,
    {
      /**
       * @param {vscode.TextDocument} document
       * @param {vscode.Position} position
       * @param {vscode.CancellationToken} token
       */
      provideHover(document, position, token) {
        const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
        if (!config.get("showInlineHints", true)) {
          return null;
        }

        const line = document.lineAt(position);
        const text = line.text;

        // Match struct field declarations
        const fieldMatch = text.match(
          /^\s*(\w+(?:\s*\*)?)\s+(\w+)(?:\[(\d+)\])?(?:\s*:\s*\d+)?\s*;/
        );
        if (fieldMatch) {
          const [, type, name, arraySize] = fieldMatch;
          const size = analyzer.getTypeSize(
            type,
            arraySize ? parseInt(arraySize) : 1
          );
          const alignment = analyzer.getTypeAlignment(type);

          const hoverText = new vscode.MarkdownString();
          hoverText.appendMarkdown(`**${name}** \`${type}\`\n\n`);
          hoverText.appendMarkdown(`📏 **Size:** ${size} bytes\n`);
          hoverText.appendMarkdown(`🎯 **Alignment:** ${alignment} bytes\n`);

          if (arraySize) {
            hoverText.appendMarkdown(
              `📊 **Array Size:** ${arraySize} elements\n`
            );
            hoverText.appendMarkdown(
              `💾 **Element Size:** ${size / parseInt(arraySize)} bytes\n`
            );
          }

          hoverText.appendMarkdown(`\n---\n*ByteWise struct analyzer*`);

          return new vscode.Hover(hoverText);
        }
        return null;
      },
    }
  );

  // onDidChangeTextDocument - only updates diagnostics, preserves webview
  const diagnosticUpdater = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const document = event.document;
      if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
        diagnosticCollection.delete(document.uri);
        return;
      }

      // Only update diagnostics while typing, don't touch the webview
      updateDiagnosticsOnly(document);
    }
  );

  // onDidSaveTextDocument - properly updates webview on save
  const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      if (!config.get("analyzeOnSave", true)) {
        return;
      }

      if (SUPPORTED_LANGUAGES.includes(document.languageId)) {
        console.log(
          `ByteWise: Document saved, re-analyzing ${document.fileName}`
        );
        // Trigger a full analysis and display update on save
        await performAnalysisAndDisplay(document, false); // No need to force show if already visible
      }
    }
  );

  // Register all disposables
  context.subscriptions.push(
    analyzeCommand,
    analyzeSelectionCommand,
    analyzeFileCommand,
    settingsCommand,
    hoverProvider,
    diagnosticCollection,
    diagnosticUpdater,
    onSaveDisposable
  );

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get(
    `${EXTENSION_NAME}.hasShownWelcome`,
    false
  );
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        "ByteWise is ready! Right-click on C/C++ structs to analyze memory layout. Try saving a C/C++ file to see live updates!",
        "Got it!"
      )
      .then(() => {
        context.globalState.update(`${EXTENSION_NAME}.hasShownWelcome`, true);
      });
  }
}

/**
 * Deactivate the ByteWise extension
 */
function deactivate() {
  console.log("ByteWise extension deactivated");

  // Clean up webview panel
  if (byteWiseWebViewProvider?.panel) {
    byteWiseWebViewProvider.panel.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
