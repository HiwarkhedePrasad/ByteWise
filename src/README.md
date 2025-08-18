# ByteWise Source Code Structure

This directory contains the reorganized and cleaned source code for the ByteWise VS Code extension.

## Directory Structure

```
src/
├── constants.js              # Extension constants and configuration
├── structAnalyzer.js         # Main struct analysis logic
├── webViewProvider.js        # Webview management and UI
├── utils/                    # Utility functions
│   ├── index.js             # Central export point
│   ├── typeUtils.js         # C/C++ type handling utilities
│   └── layoutUtils.js       # Memory layout calculation utilities
├── parsers/                  # Code parsing utilities
│   └── fieldParser.js       # Struct field parsing logic
├── generators/               # Content generation utilities
│   ├── index.js             # Central export point
│   ├── htmlGenerator.js     # HTML content generation
│   └── markdownGenerator.js # Markdown report generation
└── templates/                # UI templates
    └── webviewTemplate.js   # HTML/CSS/JS templates for webview
```

## Key Improvements

### 1. **Modular Architecture**
- Separated concerns into logical modules
- Clear separation between business logic, UI, and utilities
- Easy to test and maintain individual components

### 2. **Constants Management**
- Centralized all extension constants
- Consistent naming conventions
- Easy to update configuration values

### 3. **Code Organization**
- Moved large embedded HTML/CSS/JS to separate template files
- Split complex functions into smaller, focused utilities
- Improved readability and maintainability

### 4. **Documentation**
- Added comprehensive JSDoc comments
- Clear function signatures and parameter descriptions
- Improved code self-documentation

### 5. **Error Handling**
- Consistent error handling patterns
- Better user feedback for failures
- Graceful degradation

### 6. **Performance**
- Reduced code duplication
- Optimized imports and dependencies
- Cleaner memory management

## Usage

The main entry point remains `extension.js` in the root directory, which imports and uses these modularized components. The new structure maintains full backward compatibility while providing a much cleaner and more maintainable codebase.
