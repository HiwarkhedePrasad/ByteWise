const vscode = require("vscode");

/**
 * Native-styled webview that renders the per-byte memory map of structs.
 * Opened on demand only (no auto-popup).
 */
class LayoutWebview {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.panel = undefined;
  }

  show(structs, fileName) {
    if (this.panel) {
      this.panel.webview.html = this.render(structs, fileName);
      this.panel.reveal(vscode.ViewColumn.Beside, true);
      this.panel._structs = structs;
      this.panel._fileName = fileName;
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "bytewiseLayout",
      "ByteWise Memory Layout",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.webview.html = this.render(structs, fileName);
    this.panel._structs = structs;
    this.panel._fileName = fileName;

    this.panel.webview.onDidReceiveMessage((msg) => {
      if (msg.command === "apply") {
        const struct = (this.panel._structs || []).find(
          (s) => s.name === msg.structName
        );
        if (struct) {
          vscode.commands.executeCommand("bytewise.applyOptimization", {
            struct,
          });
        }
      } else if (msg.command === "copy") {
        vscode.env.clipboard.writeText(msg.code);
        vscode.window.showInformationMessage(
          "Optimized struct copied to clipboard."
        );
      }
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  layoutBlocks(fields, totalSize) {
    // Chunk bytes so huge structs don't freeze the page
    const chunk = Math.max(1, Math.ceil(totalSize / 1024));
    const blocks = [];
    let current = 0;

    const push = (size, kind, label, hue) => {
      for (let i = 0; i < size; i += chunk) {
        const w = Math.min(chunk, size - i);
        blocks.push({ kind, label, hue, w });
      }
    };

    for (const field of fields || []) {
      if (field.offset > current) {
        push(field.offset - current, "pad", "Padding", 0);
      }
      push(
        field.size,
        "field",
        `${field.name} (${field.type}, ${field.size}B @ +${field.offset})`,
        (field.name.charCodeAt(0) * 137) % 360
      );
      current = field.offset + field.size;
    }
    if (totalSize > current) {
      push(totalSize - current, "pad", "Trailing padding", 0);
    }
    return blocks;
  }

  render(structs, fileName) {
    const cards = (structs || [])
      .map((s) => {
        const blocks = this.layoutBlocks(s.fields, s.totalSize || 0)
          .map(
            (b) =>
              `<div class="cell ${b.kind}" title="${b.label}${b.kind === "field" || b.kind === "pad" ? ` (${b.w}B)` : ""}" style="--h:${b.hue};width:${Math.max(14, b.w * 14)}px"></div>`
          )
          .join("");
        const opt =
          s.memorySaved > 0
            ? `<p class="opt">Save <b>${s.memorySaved}B</b> (${s.totalSize}B → ${s.optimizedSize}B) by reordering fields.</p>
               <button onclick='applyOpt(${JSON.stringify(s.name)})'>⚡ Apply Optimization</button>`
            : `<p class="ok">✔ Already optimally laid out</p>`;
        return `<section class="card">
          <h2>struct ${s.name} <span class="size">${s.totalSize}B · ${s.paddingBytes || 0}B padding</span></h2>
          <div class="grid">${blocks}</div>
          ${opt}
        </section>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
  h1 { font-size: 18px; }
  .file { color: var(--vscode-descriptionForeground); margin-bottom: 20px; }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 16px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin: 0 0 12px; }
  .size { font-weight: normal; color: var(--vscode-descriptionForeground); font-size: 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 3px; }
  .cell { height: 18px; border-radius: 3px; min-width: 14px; }
  .field { background: hsl(var(--h), 60%, 55%, 0.7); border: 1px solid hsl(var(--h), 60%, 40%); }
  .pad { background: repeating-linear-gradient(45deg, rgba(220,80,80,.5) 0 4px, rgba(220,80,80,.15) 4px 8px); border: 1px dashed rgba(220,80,80,.8); }
  .opt { color: var(--vscode-editorWarning-foreground, #cca700); margin-top: 12px; }
  .ok { color: var(--vscode-testing-iconPassed, #89d185); margin-top: 12px; }
  button { margin-top: 8px; padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button:hover { background: var(--vscode-button-hoverBackground); }
</style></head>
<body>
  <h1>Memory Layout</h1>
  <div class="file">${String(fileName || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>
  ${cards || "<p>No structs in this file.</p>"}
  <script>
    const vscode = acquireVsCodeApi();
    function applyOpt(name) { vscode.postMessage({ command: 'apply', structName: name }); }
  </script>
</body></html>`;
  }
}

module.exports = { LayoutWebview };
