// Libra Hub - Tool Manager
// Manages loading, storing, and displaying HTML tools

class ToolManager {
    constructor() {
        this.tools = [];
        this.currentTool = null;
        this.init();
    }

    async init() {
        // Wait for Capacitor to be ready
        try {
            if (window.Capacitor) {
                await window.Capacitor.Plugins.Device.getInfo();
                console.log('Capacitor ready');
            } else {
                console.log('Browser mode - no Capacitor available');
            }
        } catch (error) {
            console.log('Capacitor not available, running in browser mode');
        }

        // Initialize regardless of platform
        setTimeout(() => {
            this.loadTools();
            this.renderTools();
        }, 100);
    }

    // Load tools from localStorage
    loadTools() {
        try {
            const savedTools = localStorage.getItem('libraHubTools');
            if (savedTools) {
                this.tools = JSON.parse(savedTools);
                console.log(`Loaded ${this.tools.length} tools`);
            } else {
                // Add default tools
                this.tools = [
                    {
                        id: 'libraleadscms',
                        name: 'LibraLeads CMS',
                        icon: '📊',
                        description: 'Advanced CRM & Lead Management',
                        path: 'tools/LibraLeadsCMS.html',
                        isDefault: true
                    },
                    {
                        id: 'businesscardextractor',
                        name: 'Business Card Extractor',
                        icon: '📇',
                        description: 'Extract contacts from business cards',
                        path: 'tools/BusinessCardExtractor_V8.html',
                        isDefault: true
                    }
                ];
                this.saveTools();
            }
            this.renderTools();
        } catch (error) {
            console.error('Error loading tools:', error);
            this.showStatus('Fehler beim Laden der Tools', 'error');
        }
    }

    // Save tools to localStorage
    saveTools() {
        try {
            localStorage.setItem('libraHubTools', JSON.stringify(this.tools));
            console.log('Tools saved');
        } catch (error) {
            console.error('Error saving tools:', error);
            this.showStatus('Fehler beim Speichern der Tools', 'error');
        }
    }

    // Render tools grid
    renderTools() {
        const grid = document.getElementById('tools-grid');
        if (!grid) return;

        // Clear existing tools (but keep add button)
        const addButton = grid.querySelector('.add-tool');
        grid.innerHTML = '';

        // Add tool cards
        this.tools.forEach(tool => {
            const toolCard = this.createToolCard(tool);
            grid.appendChild(toolCard);
        });

        // Re-add the add button
        if (addButton) {
            grid.appendChild(addButton);
        }
    }

    // Create a tool card element
    createToolCard(tool) {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.onclick = () => this.loadTool(tool);

        const status = tool.isDefault ? 'Built-in' : 'Custom';

        card.innerHTML = `
            <div class="tool-card-header">
                <div class="tool-icon">${tool.icon}</div>
                <div class="tool-info">
                    <div class="tool-name">${tool.name}</div>
                    <div class="tool-description">${tool.description}</div>
                    <div class="tool-status">${status}</div>
                </div>
                ${!tool.isDefault ? `
                <div class="tool-actions">
                    <button class="tool-action-btn" onclick="event.stopPropagation(); toolManager.removeTool('${tool.id}')" title="Remove">🗑️</button>
                    <button class="tool-action-btn" onclick="event.stopPropagation(); toolManager.replaceTool('${tool.id}')" title="Replace">🔄</button>
                </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    // Load a tool in the iframe
    loadTool(tool) {
        console.log('Loading tool:', tool.name);

        const iframe = document.getElementById('tool-iframe');
        const title = document.getElementById('current-tool-title');
        const toolView = document.getElementById('tool-view');
        const hubView = document.getElementById('hub-view');

        if (iframe && title && toolView && hubView) {
            this.currentTool = tool;
            title.textContent = tool.name;

            // For default tools, load from tools directory
            if (tool.isDefault) {
                iframe.src = tool.path;
            } else {
                // For user-added tools, load from blob URL or file content
                iframe.src = tool.contentUrl || tool.path;
            }

            // Show tool view
            hubView.style.display = 'none';
            toolView.style.display = 'block';

            this.showStatus(`${tool.name} geladen`, 'info');
        }
    }

    // Show hub view
    showHub() {
        const toolView = document.getElementById('tool-view');
        const hubView = document.getElementById('hub-view');

        if (toolView && hubView) {
            toolView.style.display = 'none';
            hubView.style.display = 'block';
            this.currentTool = null;
        }
    }

    // Add a new tool from file
    async addNewTool(file) {
        if (!file || file.type !== 'text/html') {
            this.showStatus('Bitte wählen Sie eine HTML-Datei aus', 'error');
            return;
        }

        try {
            const content = await this.readFileAsText(file);
            const toolId = this.generateId();

            // Extract title from HTML
            const titleMatch = content.match(/<title>(.*?)<\/title>/i);
            const toolName = titleMatch ? titleMatch[1] : file.name.replace('.html', '');

            // Fix CSP issues in uploaded HTML
            const fixedContent = this.fixContentCSP(content);

            // Create base64 data URL instead of blob (CSP-safer)
            const dataUrl = 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(fixedContent)));

            const newTool = {
                id: toolId,
                name: toolName,
                icon: '🔧', // Default icon, could be customized
                description: 'Custom Tool',
                path: file.name,
                contentUrl: dataUrl,
                content: fixedContent,
                isDefault: false,
                dateAdded: new Date().toISOString()
            };

            this.tools.push(newTool);
            this.saveTools();
            this.renderTools();

            this.showStatus(`Tool "${toolName}" erfolgreich hinzugefügt`, 'info');

        } catch (error) {
            console.error('Error adding tool:', error);
            this.showStatus('Fehler beim Hinzufügen des Tools', 'error');
        }
    }

    // Fix CSP issues in uploaded HTML content
    fixContentCSP(content) {
        // Update CSP header to allow blob/data URLs
        return content.replace(
            /Content-Security-Policy[^>]*>/i,
            'Content-Security-Policy" content="default-src \'self\' data: blob: https: \'unsafe-eval\' \'unsafe-inline\'; frame-src \'self\' blob: data:;">'
        );
    }

    // Remove a tool
    removeTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        if (confirm(`"${tool.name}" wirklich löschen?`)) {
            // Revoke blob URL to free memory
            if (tool.contentUrl && tool.contentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(tool.contentUrl);
            }

            this.tools = this.tools.filter(t => t.id !== toolId);
            this.saveTools();
            this.renderTools();
            this.showStatus(`Tool "${tool.name}" entfernt`, 'info');
        }
    }

    // Replace a tool
    replaceTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        // Store the tool to replace
        this.toolToReplace = tool;

        // Trigger file picker
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.setAttribute('data-replace-mode', 'true');
            fileInput.click();
        }
    }

    // Actually replace a tool with new file
    async doReplaceTool(oldTool, newFile) {
        try {
            const content = await this.readFileAsText(newFile);
            const titleMatch = content.match(/<title>(.*?)<\/title>/i);
            const toolName = titleMatch ? titleMatch[1] : newFile.name.replace('.html', '');

            // Fix CSP and create data URL
            const fixedContent = this.fixContentCSP(content);
            const dataUrl = 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(fixedContent)));

            // Update existing tool
            const toolIndex = this.tools.findIndex(t => t.id === oldTool.id);
            if (toolIndex !== -1) {
                // Revoke old blob URL
                if (this.tools[toolIndex].contentUrl && this.tools[toolIndex].contentUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(this.tools[toolIndex].contentUrl);
                }

                // Update tool data
                this.tools[toolIndex] = {
                    ...this.tools[toolIndex],
                    name: toolName,
                    path: newFile.name,
                    contentUrl: dataUrl,
                    content: fixedContent,
                    dateUpdated: new Date().toISOString()
                };

                this.saveTools();
                this.renderTools();
                this.showStatus(`Tool "${toolName}" erfolgreich ersetzt`, 'info');
            }
        } catch (error) {
            console.error('Error replacing tool:', error);
            this.showStatus('Fehler beim Ersetzen des Tools', 'error');
        }
    }

    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    // Generate unique ID
    generateId() {
        return 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    // Show status message
    showStatus(message, type = 'info') {
        const container = document.getElementById('status-container');
        if (!container) return;

        // Remove existing status
        container.innerHTML = '';

        // Create new status
        const status = document.createElement('div');
        status.className = `status-message status-${type}`;
        status.textContent = message;
        container.appendChild(status);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (container.contains(status)) {
                container.removeChild(status);
            }
        }, 3000);
    }

    // Remove a tool
    removeTool(toolId) {
        this.tools = this.tools.filter(tool => tool.id !== toolId);
        this.saveTools();
        this.renderTools();
        this.showStatus('Tool entfernt', 'info');
    }

    // Get tool statistics
    getStats() {
        return {
            totalTools: this.tools.length,
            customTools: this.tools.filter(t => !t.isDefault).length,
            defaultTools: this.tools.filter(t => t.isDefault).length
        };
    }
}

// Theme management
let currentTheme = localStorage.getItem('libraHubTheme') || 'light';

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');

    if (currentTheme === 'light') {
        currentTheme = 'dark';
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        currentTheme = 'light';
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
    }

    localStorage.setItem('libraHubTheme', currentTheme);
}

// Initialize theme
function initTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');

    if (currentTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌙';
    }
}

// Global functions for HTML event handlers
let toolManager;

function addNewTool() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.click();
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const isReplaceMode = event.target.getAttribute('data-replace-mode') === 'true';

    if (file && toolManager) {
        if (isReplaceMode && toolManager.toolToReplace) {
            toolManager.doReplaceTool(toolManager.toolToReplace, file);
            toolManager.toolToReplace = null;
            event.target.removeAttribute('data-replace-mode');
        } else {
            toolManager.addNewTool(file);
        }
    }
    // Reset the input
    event.target.value = '';
}

function showHub() {
    if (toolManager) {
        toolManager.showHub();
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');

    // Initialize theme
    initTheme();

    // Initialize tool manager
    toolManager = new ToolManager();

    // Make it globally accessible for debugging
    window.toolManager = toolManager;
});

// Handle back button on Android using Capacitor
document.addEventListener('DOMContentLoaded', async function() {
    // Set up back button handler for Capacitor
    if (window.Capacitor && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener('backButton', function() {
            if (toolManager && toolManager.currentTool) {
                showHub();
            }
        });
    }
});