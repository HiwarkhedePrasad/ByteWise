const vscode = require("vscode");
const { StructAnalyzer } = require("./src/structAnalyzer");
const WebViewProvider = require("./src/webViewProvider");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("ByteWise extension is now active!");

  const analyzer = new StructAnalyzer();
  const webViewProvider = new WebViewProvider(context.extensionUri);

  // Register commands
  const analyzeCommand = vscode.commands.registerCommand(
    "bytewise.analyzeStruct",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      const document = editor.document;
      const text = document.getText();

      try {
        const structs = analyzer.parseStructs(text);
        if (structs.length === 0) {
          vscode.window.showInformationMessage(
            "No structs found in current file"
          );
          return;
        }

        await webViewProvider.showAnalysis(structs, document.fileName);
        vscode.window.showInformationMessage(
          `Found ${structs.length} struct(s) for analysis`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
        console.error("ByteWise analysis error:", error);
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
          return;
        }

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

      const document = editor.document;
      const text = document.getText();

      try {
        const structs = analyzer.parseStructs(text);
        if (structs.length === 0) {
          vscode.window.showInformationMessage("No structs found in file");
          return;
        }

        await webViewProvider.showAnalysis(structs, document.fileName);

        // Show summary
        const totalBytes = structs.reduce((sum, s) => sum + s.totalSize, 0);
        const totalPadding = structs.reduce(
          (sum, s) => sum + s.paddingBytes,
          0
        );
        const totalSavings = structs.reduce(
          (sum, s) => sum + (s.memorySaved || 0),
          0
        );

        vscode.window.showInformationMessage(
          `Analyzed ${structs.length} structs: ${totalBytes} bytes total, ${totalPadding} padding, ${totalSavings} potential savings`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `File analysis failed: ${error.message}`
        );
      }
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

  // Register diagnostic provider for struct optimization hints
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("bytewise");

  const diagnosticProvider = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const config = vscode.workspace.getConfiguration("bytewise");
      if (!config.get("showOptimizations", true)) {
        return;
      }

      const document = event.document;
      if (!["c", "cpp"].includes(document.languageId)) {
        return;
      }

      try {
        const structs = analyzer.parseStructs(document.getText());
        const diagnostics = [];

        structs.forEach((struct) => {
          if (struct.memorySaved && struct.memorySaved > 0) {
            // Find struct in document
            const text = document.getText();
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

        diagnosticCollection.set(document.uri, diagnostics);
      } catch (error) {
        // Silently ignore parsing errors in diagnostic provider
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
    diagnosticProvider
  );

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get(
    "bytewise.hasShownWelcome",
    false
  );
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        "ByteWise is ready! Right-click on C/C++ structs to analyze memory layout.",
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
