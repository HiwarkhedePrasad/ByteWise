const vscode = require("vscode");

/**
 * Inline editor decorations: colorize struct fields by byte contribution
 * so padding-heavy regions are visible directly in the source.
 */
class EditorDecorations {
  constructor() {
    /** @type {Map<string, vscode.TextEditorDecorationType>} */
    this.typeCache = new Map();
    /** @type {Map<vscode.TextEditor, vscode.TextEditorDecorationType[]>} */
    this.applied = new Map();
  }

  /**
   * Colorize one field, keyed by its byte size relative to siblings
   */
  typeForColor(lightness) {
    const key = `field-${lightness}`;
    if (!this.typeCache.has(key)) {
      this.typeCache.set(
        key,
        vscode.window.createTextEditorDecorationType({
          backgroundColor: `hsla(210, 70%, 60%, ${lightness})`,
          border: "1px solid rgba(100,150,220,0.5)",
          borderRadius: "3px",
          overviewRulerColor: "rgba(100,150,220,0.6)",
          overviewRulerLane: vscode.OverviewRulerLane.Right,
        })
      );
    }
    return this.typeCache.get(key);
  }

  /**
   * Apply decorations for parsed structs over the active editor
   * @param {vscode.TextEditor} editor
   * @param {Array} structs
   */
  apply(editor, structs) {
    if (!editor) return;
    this.clear(editor);

    const text = editor.document.getText();
    const fieldType = this.typeForColor(0.16);
    const fieldRanges = [];

    for (const struct of structs || []) {
      let startIndex = text.indexOf(struct.sourceMatch);
      if (startIndex === -1) continue;

      for (const field of struct.fields || []) {
        // Locate the field's declaration inside this struct's source
        const bodyStart = text.indexOf("{", startIndex);
        if (bodyStart === -1) break;
        const nameRe = new RegExp(
          `\\b${field.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
        );
        const m = nameRe.exec(text.slice(bodyStart));
        if (!m) continue;
        const abs = bodyStart + m.index;
        const range = new vscode.Range(
          editor.document.positionAt(abs),
          editor.document.positionAt(abs + field.name.length)
        );
        fieldRanges.push({
          range,
          hoverMessage: new vscode.MarkdownString(
            `**${field.name}** — ${field.size}B at offset ${field.offset}` +
              (field.padding ? `, ${field.padding}B padding before` : "")
          ),
        });
      }
    }

    editor.setDecorations(fieldType, fieldRanges);
    this.applied.set(editor, [fieldType]);
  }

  clear(editor) {
    const prev = this.applied.get(editor) || [];
    for (const t of prev) {
      editor.setDecorations(t, []);
    }
    this.applied.delete(editor);
  }

  dispose() {
    for (const types of this.applied.values()) {
      for (const t of types) t.dispose();
    }
    for (const t of this.typeCache.values()) t.dispose();
    this.typeCache.clear();
    this.applied.clear();
  }
}

module.exports = { EditorDecorations };
