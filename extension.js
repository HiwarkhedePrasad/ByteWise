const vscode = require("vscode");
const { StructAnalyzer } = require("./src/structAnalyzer");
const { StructTreeProvider } = require("./src/treeProvider");
const { EditorDecorations } = require("./src/editorDecorations");
const {
  COMMANDS,
  SUPPORTED_LANGUAGES,
  DIAGNOSTIC_SOURCE,
  DIAGNOSTIC_CODE,
  EXTENSION_NAME,
} = require("./src/constants");

/**
 * Activate the ByteWise extension
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function activate(context) {
  const analyzer = new StructAnalyzer();
  const treeProvider = new StructTreeProvider();
  const decorations = new EditorDecorations();

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection(EXTENSION_NAME);
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = COMMANDS.ANALYZE_FILE;
  statusBarItem.name = "ByteWise";

  const treeView = vscode.window.createTreeView("bytewiseStructs", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  /**
   * Recompute diagnostics for a document
   * @param {vscode.TextDocument} document
   */
  function updateDiagnostics(document) {
    if (!document || !SUPPORTED_LANGUAGES.includes(document.languageId)) {
      return;
    }

    const text = document.getText();
    try {
      const structs = analyzer.parseStructs(text);
      const diagnostics = [];
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      if (config.get("showOptimizations", true)) {
        structs.forEach((struct) => {
          if (struct.memorySaved && struct.memorySaved > 0) {
            const escapedName = struct.name.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );
            const structRegex = new RegExp(
              `struct\\s+${escapedName}\\s*\\{`,
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
      return structs;
    } catch (error) {
      console.error("ByteWise diagnostics error:", error);
      diagnosticCollection.set(document.uri, []);
      return [];
    }
  }

  /**
   * Refresh status bar + sidebar tree + decorations from parsed structs
   */
  function refreshUI(document, structs) {
    const totalPadding = structs.reduce(
      (sum, s) => sum + (s.paddingBytes || 0),
      0
    );
    const totalSavings = structs.reduce(
      (sum, s) => sum + (s.memorySaved || 0),
      0
    );
    if (structs.length === 0) {
      statusBarItem.text = `$(check) ByteWise: no structs`;
    } else {
      statusBarItem.text = `$(symbol-struct) ${structs.length} structs · ${totalPadding}B pad · ${totalSavings}B saveable`;
    }
    statusBarItem.tooltip = "ByteWise: click for full analysis";
    statusBarItem.show();

    treeProvider.refresh(structs);

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === document) {
      decorations.apply(editor, structs);
    }
  }

  /**
   * Full analysis: diagnostics + tree + decorations + status bar
   */
  function analyzeDocument(document) {
    if (!document || !SUPPORTED_LANGUAGES.includes(document.languageId)) {
      return;
    }
    const structs = updateDiagnostics(document) || [];
    refreshUI(document, structs);
    return structs;
  }

  // --- Commands ---
  const analyzeCommand = vscode.commands.registerCommand(
    COMMANDS.ANALYZE_STRUCT,
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }
      const structs = analyzeDocument(editor.document) || [];
      vscode.commands.executeCommand("bytewiseStructs.focus");
      if (structs.length === 0) {
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
        treeProvider.refresh(structs);
        vscode.commands.executeCommand("bytewiseStructs.focus");
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
      const structs = analyzeDocument(editor.document) || [];
      vscode.commands.executeCommand("bytewiseStructs.focus");
      const totalBytes = structs.reduce((s, x) => s + (x.totalSize || 0), 0);
      const totalPadding = structs.reduce(
        (s, x) => s + (x.paddingBytes || 0),
        0
      );
      const totalSavings = structs.reduce(
        (s, x) => s + (x.memorySaved || 0),
        0
      );
      vscode.window.showInformationMessage(
        `ByteWise: ${structs.length} structs, ${totalBytes}B total, ${totalPadding}B padding, ${totalSavings}B potential savings`
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

  const applyOptimizationCommand = vscode.commands.registerCommand(
    "bytewise.applyOptimization",
    async (item) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          "Open the source file before applying an optimization"
        );
        return;
      }
      const struct = item?.struct;
      if (!struct) return;
      if (!struct.optimizedFields || struct.optimizedFields.length === 0) {
        vscode.window.showInformationMessage(
          "No optimization suggested for this struct."
        );
        return;
      }

      let code = `struct ${struct.name} {\n`;
      for (const field of struct.optimizedFields) {
        const name = field.arraySize
          ? `${field.name}[${field.arraySize}]`
          : field.name;
        code += `    ${field.type} ${
          field.isBitField ? `${name} : ${field.bits}` : name
        };\n`;
      }
      code += `}`;

      const text = editor.document.getText();
      const startRe = new RegExp(`struct\\s+${struct.name}\\s*\\{`);
      const match = startRe.exec(text);
      if (!match) {
        vscode.window.showErrorMessage(
          `Could not locate struct ${struct.name} in the active editor`
        );
        return;
      }
      let depth = 1;
      let i = match.index + match[0].length;
      while (i < text.length && depth > 0) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        i++;
      }
      const suffixEnd = text.indexOf(";", i);
      const range = new vscode.Range(
        editor.document.positionAt(match.index),
        editor.document.positionAt(
          suffixEnd === -1 ? i : suffixEnd + 1
        )
      );
      await editor.edit((b) => b.replace(range, code + ";"));
      vscode.window
        .showInformationMessage(`Optimized ${struct.name} applied.`, "Undo")
        .then((c) => {
          if (c === "Undo") vscode.commands.executeCommand("undo");
        });
    }
  );

  // Hover provider for inline field hints
  const hoverProvider = vscode.languages.registerHoverProvider(
    SUPPORTED_LANGUAGES,
    {
      provideHover(document, position) {
        const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
        if (!config.get("showInlineHints", true)) {
          return null;
        }

        const line = document.lineAt(position);
        const text = line.text;

        const fieldMatch = text.match(
          /^\s*(?:(?:const|volatile|static|register|unsigned|signed|struct|union|enum|class)\s+)*([\w:<>]+(?:\s*\*)*)\s+(\w+)(?:\[(\d+)\])?(?:\s*:\s*\d+)?\s*;/
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
          hoverText.appendMarkdown(`Size: ${size} bytes\n\n`);
          hoverText.appendMarkdown(`Alignment: ${alignment} bytes\n`);

          if (arraySize) {
            hoverText.appendMarkdown(
              `Array size: ${arraySize} elements, ${size / parseInt(arraySize)} bytes each\n`
            );
          }

          return new vscode.Hover(hoverText);
        }
        return null;
      },
    }
  );

  // Debounced live feedback while typing
  let changeTimer;
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const document = event.document;
      if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
        diagnosticCollection.delete(document.uri);
        return;
      }
      clearTimeout(changeTimer);
      changeTimer = setTimeout(() => analyzeDocument(document), 500);
    }
  );

  const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      if (!config.get("analyzeOnSave", true)) {
        return;
      }
      if (SUPPORTED_LANGUAGES.includes(document.languageId)) {
        analyzeDocument(document);
      }
    }
  );

  const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
        analyzeDocument(editor.document);
      } else {
        statusBarItem.hide();
      }
    }
  );

  context.subscriptions.push(
    analyzeCommand,
    analyzeSelectionCommand,
    analyzeFileCommand,
    settingsCommand,
    applyOptimizationCommand,
    hoverProvider,
    diagnosticCollection,
    changeDisposable,
    onSaveDisposable,
    activeEditorDisposable,
    treeView,
    statusBarItem,
    decorations
  );

  // Analyze the file already open, if any
  if (vscode.window.activeTextEditor) {
    analyzeDocument(vscode.window.activeTextEditor.document);
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
