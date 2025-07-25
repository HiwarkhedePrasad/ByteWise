const vscode = require("vscode");
const { StructAnalyzer } = require("./src/structAnalyzer");
const WebViewProvider = require("./src/webViewProvider"); // Make sure this path is correct

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("ByteWise extension is now active!");

  const analyzer = new StructAnalyzer();
  // Instantiate WebViewProvider outside of performAnalysisAndDisplay
  const webViewProvider = new WebViewProvider(context.extensionUri);

  // Register diagnostic provider here, globally in activate
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("bytewise");

  // Function to update diagnostics only (for real-time feedback while typing)
  async function updateDiagnosticsOnly(document) {
    if (!document || !["c", "cpp"].includes(document.languageId)) {
      return; // Only analyze C/C++ files
    }

    const text = document.getText();
    try {
      const structs = analyzer.parseStructs(text);

      // Update Diagnostics only
      const diagnostics = [];
      const config = vscode.workspace.getConfiguration("bytewise");
      if (config.get("showOptimizations", true)) {
        // Only add diagnostics if enabled
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
              diagnostic.source = "ByteWise";
              diagnostic.code = "struct-optimization";
              diagnostics.push(diagnostic);
            }
          }
        });
      }
      diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      console.error("ByteWise analysis error:", error);
      diagnosticCollection.set(document.uri, []); // Clear diagnostics on error
    }
  }

  // Function to perform analysis and update UI (for commands and save events)
  async function performAnalysisAndDisplay(
    document,
    triggerShowWebview = false
  ) {
    if (!document || !["c", "cpp"].includes(document.languageId)) {
      return; // Only analyze C/C++ files
    }

    const text = document.getText();
    try {
      const structs = analyzer.parseStructs(text);

      // Update webview only if explicitly triggered or already visible
      if (structs.length > 0) {
        if (
          triggerShowWebview ||
          (webViewProvider.panel && webViewProvider.panel.visible)
        ) {
          await webViewProvider.showAnalysis(structs, document.fileName);
        }
      } else {
        // If no structs found, and the panel is open, clear it
        if (webViewProvider.panel && webViewProvider.panel.visible) {
          await webViewProvider.showAnalysis([], document.fileName);
        }
      }

      // Update Diagnostics
      const diagnostics = [];
      const config = vscode.workspace.getConfiguration("bytewise");
      if (config.get("showOptimizations", true)) {
        // Only add diagnostics if enabled
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
              diagnostic.source = "ByteWise";
              diagnostic.code = "struct-optimization";
              diagnostics.push(diagnostic);
            }
          }
        });
      }
      diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      console.error("ByteWise analysis error:", error);
      diagnosticCollection.set(document.uri, []); // Clear diagnostics on error
    }
  }

  // --- Register Commands ---
  const analyzeCommand = vscode.commands.registerCommand(
    "bytewise.analyzeStruct",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }
      // This command *should* always show the webview
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
    "bytewise.analyzeSelection",
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
        if (structs.length === 0) {
          vscode.window.showInformationMessage("No structs found in selection");
          // If no structs found in selection, and panel is open, clear it
          if (webViewProvider.panel && webViewProvider.panel.visible) {
            await webViewProvider.showAnalysis([], editor.document.fileName);
          }
          return;
        }
        // This command *should* always show the webview for the selection
        await webViewProvider.showAnalysis(structs, editor.document.fileName);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Selection analysis failed: ${error.message}`
        );
      }
    }
  );

  const analyzeFileCommand = vscode.commands.registerCommand(
    "bytewise.analyzeFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }
      // This command *should* always show the webview for the file
      await performAnalysisAndDisplay(editor.document, true);

      const structs = analyzer.parseStructs(editor.document.getText());
      const totalBytes = structs.reduce((sum, s) => sum + s.totalSize, 0);
      const totalPadding = structs.reduce((sum, s) => sum + s.paddingBytes, 0);
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
    "bytewise.openSettings",
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "bytewise"
      );
    }
  );

  // Register hover provider for inline hints
  const hoverProvider = vscode.languages.registerHoverProvider(["c", "cpp"], {
    provideHover(document, position, token) {
      const config = vscode.workspace.getConfiguration("bytewise");
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
  });

  // CHANGED: onDidChangeTextDocument now only updates diagnostics, not the webview
  const diagnosticUpdater = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const document = event.document;
      if (!["c", "cpp"].includes(document.languageId)) {
        diagnosticCollection.delete(document.uri); // Clear diagnostics for non C/CPP files
        return;
      }

      // Only update diagnostics while typing, NOT the webview
      updateDiagnosticsOnly(document);
    }
  );

  // CHANGED: onDidSaveTextDocument now updates both diagnostics AND webview
  const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      const config = vscode.workspace.getConfiguration("bytewise");
      if (!config.get("analyzeOnSave", true)) {
        return;
      }

      if (["c", "cpp"].includes(document.languageId)) {
        console.log(
          `ByteWise: Document saved, re-analyzing ${document.fileName}`
        );
        // On save, update both diagnostics and webview (if visible), but preserve focus
        await performAnalysisAndDisplay(document, false);
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
    "bytewise.hasShownWelcome",
    false
  );
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        "ByteWise is ready! Right-click on C/C++ structs to analyze memory layout. Try saving a C/C++ file to see live updates!",
        "Got it!"
      )
      .then(() => {
        context.globalState.update("bytewise.hasShownWelcome", true);
      });
  }
}

function deactivate() {
  console.log("ByteWise extension deactivated");
}

module.exports = {
  activate,
  deactivate,
};
