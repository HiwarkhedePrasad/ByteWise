# Changelog

All notable changes to this project will be documented in this file.

## [1.3.6] - 2026-10-03

### Changed

- Replaced the webview panel with native VS Code UI: Explorer sidebar tree of structs/fields, inline field decorations, and a status bar summary
- Panel no longer opens automatically; analysis updates when you run a command, switch editors, or save
- Debounced diagnostics/analysis while typing
- Workspace file scanning now reads from disk with caching instead of opening every file
- Apply Optimization applies directly with an Undo action instead of a modal prompt

### Fixed

- Per-byte memory layout rendering that could freeze on large structs (webview removed)
- Struct name escaping in optimization diagnostics
- Hover hints now handle qualifiers and multi-level pointers

## [1.2.3] - 2025-08-18

### Added

- Workspace Project Structure panel with clickable files and color-coded optimization status (green = optimal/no structs, red = needs optimization)

### Changed

- Apply Optimization replaces struct definitions in-place (falls back to cursor insert), reopens last analyzed file if needed
- File names shown relative to workspace
- Safer default export paths

### Fixed

- Bitfield code generation order
- Pointer size/alignment for function pointers respects configuration

## [1.2.2]

- Initial public release
