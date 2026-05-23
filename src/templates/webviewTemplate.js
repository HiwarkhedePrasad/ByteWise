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
      --paper: #f8f7f2;
      --paper-warm: #fffdf7;
      --ink: #1a1a1a;
      --ink-soft: #3b3b3b;
      --muted-ink: #5c5c5c;
      --text-secondary: #3b3b3b;
      --bg-hover: rgba(158, 199, 239, 0.24);

      --marker-yellow: #f8e889;
      --marker-blue: #9ec7ef;
      --marker-green: #9fd6ad;
      --marker-red: #f1a0a0;
      --marker-peach: #f3cfa3;

      --sketch-border: 2px solid var(--ink);
      --sketch-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
      --hard-shadow: 4px 4px 0 #000;

      --font-hand: 'Kalam', 'Architects Daughter', 'Caveat', 'Segoe Print', cursive;
      --font-mono: 'Cousine', 'Roboto Mono', 'Courier New', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-hand);
      font-size: 16px;
      line-height: 1.45;
      color: var(--ink);
      min-height: 100vh;
      background-color: var(--paper);
      background-image:
        radial-gradient(circle at 1px 1px, rgba(26, 26, 26, 0.18) 1px, transparent 1px),
        linear-gradient(0deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
      background-size: 22px 22px, 110px 110px, 110px 110px;
      background-position: 0 0, 0 0, 0 0;
    }

    .app-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .header {
      text-align: center;
      margin-bottom: 44px;
    }

    .header-title {
      font-size: 38px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      letter-spacing: 0.5px;
      transform: rotate(-0.5deg);
    }

    .header-icon {
      width: 44px;
      height: 44px;
      border: var(--sketch-border);
      border-radius: var(--sketch-radius);
      box-shadow: var(--hard-shadow);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--marker-yellow);
      color: var(--ink);
      font-size: 20px;
    }

    .header-subtitle {
      font-size: 18px;
      color: var(--ink-soft);
      transform: rotate(0.2deg);
    }

    .header-filename {
      display: inline-flex;
      align-items: center;
      background: var(--paper-warm);
      padding: 6px 14px;
      border: var(--sketch-border);
      border-radius: var(--sketch-radius);
      font-family: var(--font-mono);
      font-size: 13px;
      margin-top: 12px;
      color: var(--ink);
      box-shadow: var(--hard-shadow);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .summary-card,
    .struct-card,
    .field-table-container,
    .memory-layout,
    .code-container,
    .savings-highlight,
    .tooltip {
      background: var(--paper-warm);
      border: var(--sketch-border);
      border-radius: var(--sketch-radius);
      box-shadow: var(--hard-shadow);
    }

    .summary-card {
      padding: 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: transform 0.18s ease;
    }

    .summary-card::before {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      top: 8px;
      height: 8px;
      background: repeating-linear-gradient(
        -15deg,
        rgba(248, 232, 137, 0.75) 0 8px,
        rgba(248, 232, 137, 0.35) 8px 16px
      );
      border-radius: 8px;
    }

    .summary-card:hover {
      transform: rotate(-1deg) scale(1.02);
    }

    .summary-value {
      font-size: 30px;
      font-weight: 700;
      color: var(--ink);
      margin: 14px 0 6px;
      font-variant-numeric: tabular-nums;
    }

    .summary-label {
      font-size: 14px;
      color: var(--ink-soft);
      font-weight: 600;
    }

    .struct-card {
      margin-bottom: 28px;
      overflow: hidden;
      transition: transform 0.2s ease;
    }

    .struct-card:hover {
      transform: rotate(0.3deg);
    }

    .struct-header {
      background: linear-gradient(175deg, rgba(158, 199, 239, 0.26), rgba(248, 232, 137, 0.2));
      padding: 22px 28px;
      border-bottom: var(--sketch-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }

    .struct-name {
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 700;
      color: var(--ink);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .struct-name::before {
      content: '';
      width: 12px;
      height: 12px;
      border: var(--sketch-border);
      border-radius: 50%;
      background: var(--marker-blue);
      box-shadow: 2px 2px 0 #000;
    }

    .struct-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 5px 12px;
      border: var(--sketch-border);
      border-radius: var(--sketch-radius);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      box-shadow: 2px 2px 0 #000;
    }

    .badge-optimizable {
      background: var(--marker-peach);
      color: var(--ink);
    }

    .badge-optimized {
      background: var(--marker-green);
      color: var(--ink);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin: 22px 28px;
    }

    .stat-item {
      background: rgba(255, 255, 255, 0.65);
      padding: 16px 10px;
      border: var(--sketch-border);
      border-radius: var(--sketch-radius);
      box-shadow: 2px 2px 0 #000;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 4px;
      font-variant-numeric: tabular-nums;
    }

    .stat-label {
      font-size: 12px;
      color: var(--muted-ink);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .memory-section,
    .field-section,
    .optimization-section {
      padding: 28px;
      border-top: var(--sketch-border);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 10px;
      flex-wrap: wrap;
    }

    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--ink);
      display: flex;
      align-items: center;
      gap: 8px;
      transform: rotate(-0.4deg);
    }

    .section-title::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ink);
    }

    .memory-legend {
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--ink-soft);
    }

    .legend-color {
      width: 14px;
      height: 14px;
      border: 2px solid var(--ink);
      border-radius: 4px;
      box-shadow: 2px 2px 0 #000;
    }

    .legend-field {
      background: repeating-linear-gradient(
        -18deg,
        rgba(158, 199, 239, 0.88) 0 5px,
        rgba(158, 199, 239, 0.54) 5px 11px
      );
    }

    .legend-padding {
      background:
        repeating-linear-gradient(45deg, rgba(241, 160, 160, 0.75) 0 5px, rgba(241, 160, 160, 0.35) 5px 10px),
        repeating-linear-gradient(-45deg, rgba(220, 60, 60, 0.3) 0 5px, rgba(220, 60, 60, 0.08) 5px 10px);
    }

    .memory-layout {
      padding: 20px;
      background: rgba(255, 255, 255, 0.72);
    }

    .layout-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 24px);
      gap: 4px;
      justify-content: center;
    }

    .memory-block {
      width: 24px;
      height: 24px;
      border: 2px solid var(--ink);
      border-radius: 7px 11px 8px 10px / 9px 8px 11px 7px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      position: relative;
      box-shadow: 2px 2px 0 #000;
    }

    .memory-block:hover {
      transform: rotate(-3deg) scale(1.08);
      z-index: 10;
      box-shadow: 4px 4px 0 #000;
    }

    .field-block {
      background:
        radial-gradient(circle at 25% 30%, rgba(255, 255, 255, 0.45) 0 35%, transparent 36%),
        repeating-linear-gradient(
          -20deg,
          var(--field-color, var(--marker-blue)) 0 7px,
          rgba(255, 255, 255, 0.42) 7px 14px
        ),
        var(--field-color, var(--marker-blue));
    }

    .padding-block {
      background:
        repeating-linear-gradient(45deg, rgba(241, 160, 160, 0.78) 0 5px, rgba(241, 160, 160, 0.35) 5px 10px),
        repeating-linear-gradient(-45deg, rgba(180, 45, 45, 0.45) 0 5px, rgba(180, 45, 45, 0.1) 5px 10px);
    }

    .field-table-container {
      overflow: hidden;
    }

    .field-table {
      width: 100%;
      border-collapse: collapse;
    }

    .field-table th {
      background: rgba(248, 232, 137, 0.42);
      padding: 14px 16px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border-bottom: var(--sketch-border);
    }

    .field-table td {
      padding: 14px 16px;
      border-bottom: 1px dashed rgba(26, 26, 26, 0.45);
      font-size: 15px;
      transition: transform 0.15s ease, background-color 0.15s ease;
    }

    .field-table tbody tr:hover {
      background: rgba(158, 199, 239, 0.24);
      cursor: pointer;
      transform: rotate(-0.2deg);
    }

    .field-table tbody tr:last-child td {
      border-bottom: none;
    }

    .field-name,
    .field-type,
    .code-block,
    .code-title,
    .ws-item {
      font-family: var(--font-mono);
    }

    .field-name {
      font-weight: 700;
      color: var(--ink);
    }

    .field-type {
      font-size: 13px;
      background: rgba(158, 199, 239, 0.25);
      padding: 4px 8px;
      border: 1px solid var(--ink);
      border-radius: 8px 12px 7px 10px / 9px 8px 12px 7px;
      color: var(--ink);
      box-shadow: 2px 2px 0 #000;
    }

    .optimization-section {
      background: linear-gradient(170deg, rgba(248, 232, 137, 0.36), rgba(159, 214, 173, 0.36));
    }

    .optimization-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .optimization-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .optimization-subtitle {
      font-size: 17px;
      color: var(--ink-soft);
    }

    .savings-highlight {
      padding: 22px;
      text-align: center;
      margin-bottom: 22px;
      background: rgba(255, 255, 255, 0.7);
    }

    .savings-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 6px;
    }

    .savings-details {
      color: var(--ink-soft);
      font-size: 15px;
    }

    .code-container {
      overflow: hidden;
      margin-bottom: 20px;
    }

    .code-header {
      background: rgba(158, 199, 239, 0.28);
      padding: 12px 18px;
      border-bottom: var(--sketch-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .code-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ink);
    }

    .code-block {
      padding: 20px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--ink);
      background: rgba(255, 255, 255, 0.65);
      overflow-x: auto;
    }

    .button-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 20px;
      border: var(--sketch-border);
      border-radius: var(--sketch-radius);
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--ink);
      outline: none;
      box-shadow: var(--hard-shadow);
      font-family: var(--font-hand);
      background: var(--paper-warm);
    }

    .btn-primary {
      background: var(--marker-blue);
    }

    .btn-secondary {
      background: var(--marker-yellow);
    }

    .btn-success {
      background: var(--marker-green);
    }

    .btn:hover {
      transform: rotate(-2deg) scale(1.05);
      box-shadow: 6px 6px 0 #000;
    }

    .export-section {
      text-align: center;
      padding: 40px 24px;
      border-top: var(--sketch-border);
      background: rgba(248, 232, 137, 0.2);
    }

    .export-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }

    .export-subtitle {
      color: var(--ink-soft);
      margin-bottom: 20px;
      font-size: 16px;
    }

    .tooltip {
      position: absolute;
      color: var(--ink);
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
      z-index: 1000;
      pointer-events: none;
      display: none;
      max-width: 280px;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      background: #fffbe6;
    }

    .tooltip.show {
      display: block;
      opacity: 1;
      transform: translateY(0);
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: -7px;
      left: 50%;
      transform: translateX(-50%);
      border: 7px solid transparent;
      border-bottom-color: #fffbe6;
    }

    @media (max-width: 768px) {
      .app-container {
        padding: 24px 14px;
      }

      .header-title {
        font-size: 30px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .struct-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        margin: 16px;
      }

      .memory-section,
      .field-section,
      .optimization-section {
        padding: 20px 14px;
      }

      .layout-grid {
        grid-template-columns: repeat(auto-fill, 20px);
        gap: 3px;
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

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .struct-card {
      animation: fadeInUp 0.45s ease forwards;
    }

    .struct-card:nth-child(2) { animation-delay: 0.06s; }
    .struct-card:nth-child(3) { animation-delay: 0.12s; }
    .struct-card:nth-child(4) { animation-delay: 0.18s; }

    .btn:focus,
    .memory-block:focus {
      outline: 2px dashed var(--ink);
      outline-offset: 2px;
    }

    .field-table tbody tr:focus {
      outline: 2px dashed var(--ink);
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
