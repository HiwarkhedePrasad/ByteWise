// Mock VS Code API BEFORE requiring the module
global.vscode = {
    workspace: {
        getConfiguration: () => ({
            get: (key, def) => def
        }),
        onDidChangeConfiguration: () => {}
    },
    window: {
        showInformationMessage: () => {},
        showWarningMessage: () => {},
        showErrorMessage: () => {}
    },
    Range: class {},
    Location: class {},
    Position: class {},
    Uri: { file: (path) => path }
};

const fs = require('fs');
const { StructAnalyzer } = require('./src/structAnalyzer');

try {
    const analyzer = new StructAnalyzer();
    const text = fs.readFileSync('test_cases.c', 'utf8');
    const structs = analyzer.parseStructs(text);
    fs.writeFileSync('verify_output.json', JSON.stringify(structs, null, 2));
    console.log("Success");
} catch (e) {
    fs.writeFileSync('verify_error.txt', e.stack);
    console.error(e);
    process.exit(1);
}
