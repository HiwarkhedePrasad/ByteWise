# Changelog

All notable changes to this project will be documented in this file.

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
