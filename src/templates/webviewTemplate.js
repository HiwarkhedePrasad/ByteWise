/**
 * HTML template and styling for the ByteWise webview
 */

/**
 * Get the main CSS styles for the webview
 * @returns {string} CSS styles
 */
function getWebviewStyles() {
  return `
    :root {
      /* Excalidraw-inspired color palette */
      --bg-primary: #ffffff;
      --bg-secondary: #fafbfc;
      --bg-tertiary: #f5f6f7;
      --bg-accent: #e3f2fd;
      --bg-hover: #f8f9fa;
      
      --text-primary: #1a1a1a;
      --text-secondary: #6b7280;
      --text-tertiary: #9ca3af;
      --text-accent: #2563eb;
      
      --border-light: #e5e7eb;
      --border-medium: #d1d5db;
      --border-strong: #9ca3af;
      
      --accent-blue: #2563eb;
      --accent-green: #059669;
      --accent-orange: #ea580c;
      --accent-purple: #7c3aed;
      --accent-red: #dc2626;
      
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-primary);
      min-height: 100vh;
    }
    
    .app-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    
    .header-title {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    
    .header-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }
    
    .header-subtitle {
      font-size: 16px;
      color: var(--text-secondary);
      font-weight: 400;
    }
    
    .header-filename {
      display: inline-flex;
      align-items: center;
      background: var(--bg-tertiary);
      padding: 4px 12px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 14px;
      margin-top: 12px;
      color: var(--text-accent);
      border: 1px solid var(--border-light);
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    
    .summary-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 24px;
      text-align: center;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    
    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
    }
    
    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--border-medium);
    }
    
    .summary-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
      font-variant-numeric: tabular-nums;
    }
    
    .summary-label {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    /* Struct Cards */
    .struct-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
      margin-bottom: 32px;
      overflow: hidden;
      box-shadow: var(--shadow-md);
      transition: all 0.3s ease;
    }
    
    .struct-card:hover {
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
    }
    
    .struct-header {
      background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
      padding: 24px 32px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .struct-name {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .struct-name::before {
      content: '';
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent-blue);
    }
    
    .struct-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .badge {
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-optimizable {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fbbf24;
    }
    
    .badge-optimized {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #34d399;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1px;
      background: var(--border-light);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin: 0 32px 32px 32px;
    }
    
    .stat-item {
      background: var(--bg-primary);
      padding: 20px 16px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
      font-variant-numeric: tabular-nums;
    }
    
    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Memory Layout Section */
    .memory-section {
      padding: 32px;
      border-bottom: 1px solid var(--border-light);
    }
    
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-blue);
    }
    
    .memory-legend {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid var(--border-medium);
    }
    
    .legend-field {
      background: var(--accent-blue);
      opacity: 0.7;
    }
    
    .legend-padding {
      background: var(--accent-red);
      opacity: 0.7;
    }
    
    /* Memory Layout Grid */
    .memory-layout {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: 24px;
      border: 1px solid var(--border-light);
    }
    
    .layout-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 24px);
      gap: 2px;
      justify-content: center;
    }
    
    .memory-block {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border: 1px solid var(--border-light);
    }
    
    .memory-block:hover {
      transform: scale(1.1);
      z-index: 10;
      box-shadow: var(--shadow-md);
    }
    
    .field-block {
      background: var(--field-color, var(--accent-blue));
      opacity: 0.8;
    }
    
    .padding-block {
      background: var(--accent-red);
      opacity: 0.6;
    }
    
    /* Field Table */
    .field-section {
      padding: 32px;
    }
    
    .field-table-container {
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    
    .field-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .field-table th {
      background: var(--bg-tertiary);
      padding: 16px 20px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-light);
    }
    
    .field-table td {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-light);
      font-size: 14px;
      transition: background-color 0.2s ease;
    }
    
    .field-table tbody tr:hover {
      background: var(--bg-hover);
      cursor: pointer;
    }
    
    .field-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .field-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-accent);
    }
    
    .field-type {
      font-family: var(--font-mono);
      font-size: 13px;
      background: var(--bg-tertiary);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
    }
    
    /* Optimization Section */
    .optimization-section {
      padding: 32px;
      background: linear-gradient(135deg, #fefce8, #fef3c7);
      border-top: 1px solid var(--border-light);
    }
    
    .optimization-header {
      text-align: center;
      margin-bottom: 24px;
    }
    
    .optimization-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .optimization-subtitle {
      font-size: 16px;
      color: var(--text-secondary);
    }
    
    .savings-highlight {
      background: var(--bg-primary);
      border: 2px solid var(--accent-green);
      border-radius: var(--radius-lg);
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
    }
    
    .savings-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent-green);
      margin-bottom: 8px;
    }
    
    .savings-details {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    /* Code Block */
    .code-container {
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 24px;
    }
    
    .code-header {
      background: var(--bg-tertiary);
      padding: 12px 20px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .code-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }
    
    .code-block {
      padding: 24px;
      font-family: var(--font-mono);
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-secondary);
      overflow-x: auto;
    }
    
    /* Buttons */
    .button-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      outline: none;
    }
    
    .btn-primary {
      background: var(--accent-blue);
      color: white;
    }
    
    .btn-primary:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    .btn-secondary {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
    }
    
    .btn-secondary:hover {
      background: var(--bg-hover);
      border-color: var(--border-strong);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
    
    .btn-success {
      background: var(--accent-green);
      color: white;
    }
    
    .btn-success:hover {
      background: #047857;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    /* Export Section */
    .export-section {
      text-align: center;
      padding: 48px 32px;
      background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
      border-top: 1px solid var(--border-light);
    }
    
    .export-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    
    .export-subtitle {
      color: var(--text-secondary);
      margin-bottom: 24px;
    }
    
    /* Tooltip */
    .tooltip {
      position: absolute;
      background: var(--text-primary);
      color: var(--bg-primary);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      z-index: 1000;
      pointer-events: none;
      display: none;
      max-width: 280px;
      box-shadow: var(--shadow-xl);
      opacity: 0;
      transform: translateY(4px);
      transition: all 0.2s ease;
    }
    
    .tooltip.show {
      display: block;
      opacity: 1;
      transform: translateY(0);
    }
    
    .tooltip::after {
      content: '';
      position: absolute;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      border: 4px solid transparent;
      border-bottom-color: var(--text-primary);
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .app-container {
        padding: 24px 16px;
      }
      
      .summary-grid {
        grid-template-columns: 1fr;
      }
      
      .struct-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        margin: 0 16px 24px 16px;
      }
      
      .memory-section,
      .field-section {
        padding: 24px 16px;
      }
      
      .layout-grid {
        grid-template-columns: repeat(auto-fill, 20px);
      }
      
      .memory-block {
        width: 20px;
        height: 20px;
      }
      
      .button-group {
        flex-direction: column;
      }
      
      .btn {
        justify-content: center;
      }
    }
    
    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .struct-card {
      animation: fadeInUp 0.6s ease forwards;
    }
    
    .struct-card:nth-child(2) { animation-delay: 0.1s; }
    .struct-card:nth-child(3) { animation-delay: 0.2s; }
    .struct-card:nth-child(4) { animation-delay: 0.3s; }
    
    /* Focus styles for accessibility */
    .btn:focus,
    .memory-block:focus {
      outline: 2px solid var(--accent-blue);
      outline-offset: 2px;
    }
    
    .field-table tbody tr:focus {
      outline: 2px solid var(--accent-blue);
      outline-offset: -2px;
    }
  `;
}

/**
 * Get the JavaScript code for the webview
 * @returns {string} JavaScript code
 */
function getWebviewScript() {
  return `
    const vscode = acquireVsCodeApi();
    
    // Store the current data globally for reference
    let currentStructs = {};
    let currentFileName = '';
    
    function copyCode(code) {
      vscode.postMessage({
        command: 'copyOptimized',
        code: code
      });
    }
    // New helper that avoids HTML escaping complexities
    function copyText(text) {
      vscode.postMessage({
        command: 'copyOptimized',
        code: text
      });
    }
    
    function applyOptimization(structName, code) {
      vscode.postMessage({
        command: 'applyOptimization',
        structName: structName,
        code: code
      });
    }
    
    function exportAnalysis() {
      vscode.postMessage({
        command: 'exportAnalysis'
      });
    }
    function openFileAnalysis(relPath) {
      if (!relPath) return;
      vscode.postMessage({
        command: 'openFileAnalysis',
        path: relPath
      });
    }
    
    function showFieldDetails(structName, fieldName) {
      const struct = currentStructs.find(s => s.name === structName);
      if (struct) {
        vscode.postMessage({
          command: 'showFieldDetails',
          struct: struct,
          field: fieldName
        });
      }
    }
    
    // Enhanced tooltip functionality
    const tooltip = document.getElementById('tooltip');
    let tooltipTimeout;
    
    function showTooltip(element, content) {
      clearTimeout(tooltipTimeout);
      tooltip.innerHTML = content;
      tooltip.classList.add('show');
      
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.top - tooltipRect.height - 12;
      
      // Adjust if tooltip goes off-screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 8) {
        top = rect.bottom + 12;
        tooltip.style.transform = 'translateY(-4px)';
      }
      
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }
    
    function hideTooltip() {
      tooltipTimeout = setTimeout(() => {
        tooltip.classList.remove('show');
      }, 100);
    }
    
    // Add event listeners for memory blocks
    document.querySelectorAll('.memory-block').forEach(block => {
      block.addEventListener('mouseenter', (e) => {
        const tooltipContent = e.target.dataset.tooltip;
        if (tooltipContent) {
          showTooltip(e.target, tooltipContent);
        }
      });
      
      block.addEventListener('mouseleave', hideTooltip);
      
      // Add keyboard support
      block.setAttribute('tabindex', '0');
      block.addEventListener('focus', (e) => {
        const tooltipContent = e.target.dataset.tooltip;
        if (tooltipContent) {
          showTooltip(e.target, tooltipContent);
        }
      });
      
      block.addEventListener('blur', hideTooltip);
    });
    
    // Add click handlers for field table rows
    document.querySelectorAll('.field-table tbody tr').forEach(row => {
      row.setAttribute('tabindex', '0');
      row.addEventListener('click', (e) => {
        const structContainer = e.target.closest('.struct-card');
        if (structContainer) {
          const structName = structContainer.dataset.structName;
          const fieldNameCell = row.querySelector('.field-name');
          if (fieldNameCell && structName) {
            const fieldName = fieldNameCell.textContent.trim();
            showFieldDetails(structName, fieldName);
          }
        }
      });
      
      // Keyboard support for table rows
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      });
    });
    
    console.log('ByteWise WebView loaded successfully with modern design');
  `;
}

module.exports = {
  getWebviewStyles,
  getWebviewScript,
};
