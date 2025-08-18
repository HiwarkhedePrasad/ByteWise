/**
 * Constants used throughout the ByteWise extension
 */

const EXTENSION_NAME = "bytewise";
const WEBVIEW_TYPE = "byteWiseAnalysis";
const WEBVIEW_TITLE = "ByteWise - Struct Analysis";

const COMMANDS = {
  ANALYZE_STRUCT: `${EXTENSION_NAME}.analyzeStruct`,
  ANALYZE_SELECTION: `${EXTENSION_NAME}.analyzeSelection`,
  ANALYZE_FILE: `${EXTENSION_NAME}.analyzeFile`,
  OPEN_SETTINGS: `${EXTENSION_NAME}.openSettings`,
};

const SUPPORTED_LANGUAGES = ["c", "cpp"];
const SUPPORTED_EXTENSIONS = [".c", ".cpp", ".h", ".hpp"];

const DEFAULT_ALIGNMENT = 8;
const POINTER_SIZE = 8; // 64-bit pointers

const DIAGNOSTIC_SOURCE = "ByteWise";
const DIAGNOSTIC_CODE = "struct-optimization";

const WEBVIEW_MESSAGE_COMMANDS = {
  COPY_OPTIMIZED: "copyOptimized",
  APPLY_OPTIMIZATION: "applyOptimization",
  EXPORT_ANALYSIS: "exportAnalysis",
  SHOW_FIELD_DETAILS: "showFieldDetails",
};

module.exports = {
  EXTENSION_NAME,
  WEBVIEW_TYPE,
  WEBVIEW_TITLE,
  COMMANDS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_EXTENSIONS,
  DEFAULT_ALIGNMENT,
  POINTER_SIZE,
  DIAGNOSTIC_SOURCE,
  DIAGNOSTIC_CODE,
  WEBVIEW_MESSAGE_COMMANDS,
};
