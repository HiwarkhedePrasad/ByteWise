const vscode = require("vscode");

/**
 * Tree item for a struct
 */
class StructItem extends vscode.TreeItem {
  constructor(struct) {
    super(struct.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.struct = struct;
    this.description = `${struct.totalSize}B · ${struct.paddingBytes || 0}B pad`;
    this.tooltip = new vscode.MarkdownString(
      `**struct ${struct.name}**\n\n` +
        `- Size: ${struct.totalSize} bytes\n` +
        `- Padding: ${struct.paddingBytes || 0} bytes\n` +
        `- Fields: ${(struct.fields || []).length}\n` +
        (struct.memorySaved > 0
          ? `- ~${struct.memorySaved} bytes recoverable by reordering`
          : `- Already optimally laid out`)
    );
    this.iconPath = new vscode.ThemeIcon("symbol-struct");
    this.contextValue =
      struct.memorySaved > 0 ? "optimizableStruct" : "struct";
  }
}

/**
 * Tree item for a field
 */
class FieldItem extends vscode.TreeItem {
  constructor(field) {
    const arraySuffix = field.arraySize ? `[${field.arraySize}]` : "";
    const bitSuffix = field.isBitField ? ` : ${field.bits}` : "";
    super(`${field.name}${arraySuffix}${bitSuffix}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${field.type} · ${field.size}B @ +${field.offset}`;
    this.tooltip = new vscode.MarkdownString(
      `**${field.name}** (${field.type})\n\n` +
        `- Size: ${field.size} bytes\n` +
        `- Alignment: ${field.alignment} bytes\n` +
        `- Offset: ${field.offset} bytes\n` +
        `- Padding before: ${field.padding || 0} bytes`
    );
    this.iconPath = new vscode.ThemeIcon("symbol-field");
    this.contextValue = "field";
  }
}

/**
 * TreeDataProvider listing analyzed structs in the sidebar
 */
class StructTreeProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.structs = [];
  }

  refresh(structs) {
    this.structs = structs || [];
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!element) {
      return this.structs.map((s) => new StructItem(s));
    }
    if (element instanceof StructItem) {
      return (element.struct.fields || []).map((f) => new FieldItem(f));
    }
    return [];
  }
}

module.exports = { StructTreeProvider };
