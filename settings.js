// Enable/Disable Restore and Import buttons based on file selection
document.getElementById('import-file').addEventListener('change', (event) => {
    const selectedFile = event.target.files[0];
    document.getElementById('restore-button').disabled = !selectedFile;
    document.getElementById('import-button').disabled = !selectedFile;
});

// Backup functionality - Exports current scripts to a JSON file
document.getElementById('backup-button').addEventListener('click', () => {
    chrome.storage.local.get(['scripts'], (result) => {
        const scripts = (result.scripts || []).map(script => {
            const { _elements, ...cleanedScript } = script;
            return cleanedScript;
        });

        const metadata = {
            browser_type: navigator.userAgentData?.brands[0]?.brand || navigator.userAgent,
            browser_version: navigator.userAgentData?.brands[0]?.version || navigator.appVersion,
            date_exported: new Date().toISOString(),
            app: {
                name: chrome.runtime.getManifest().name,
                version: chrome.runtime.getManifest().version,
                description: chrome.runtime.getManifest().description,
                permissions: chrome.runtime.getManifest().permissions,
                host_permissions: chrome.runtime.getManifest().host_permissions,
            }
        };

        const data = {
            metadata: metadata,
            settings: {},  // Empty settings section for future use
            scripts: scripts  // Use the cleaned scripts without _elements
        };

        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paste-hoarder-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});

// Clear all scripts - Prompts user before clearing scripts
document.getElementById('clear-scripts-button').addEventListener('click', () => {
    const confirmation = confirm('Are you sure you want to clear all scripts? This cannot be undone.');
    if (confirmation) {
        chrome.storage.local.set({ scripts: [] }, () => {
            alert('All scripts have been cleared.');
            updateStatistics(); // Update statistics after clearing
        });
    }
});

// Restore button logic
document.getElementById('restore-button').addEventListener('click', () => {
    const file = document.getElementById('import-file').files[0];
    if (file) {
        showConfirmationDialog('restore');
    }
});

// Import button logic
document.getElementById('import-button').addEventListener('click', () => {
    const file = document.getElementById('import-file').files[0];
    if (file) {
        showConfirmationDialog('import');
    }
});

// Confirmation dialog for restore and import actions
function showConfirmationDialog(actionType) {
    const confirmationMessage = actionType === 'restore'
        ? 'Are you sure you want to restore and replace all scripts? This action will overwrite all existing data.'
        : 'Are you sure you want to import and merge the scripts with your existing ones?';

    if (confirm(confirmationMessage)) {
        processFile(actionType);
    }
}

// Process file for restore or import actions
function processFile(actionType) {
    const file = document.getElementById('import-file').files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.metadata && data.settings && data.scripts) {
                if (actionType === 'restore') {
                    chrome.storage.local.set({ scripts: data.scripts }, () => {
                        alert('Scripts restored successfully.');
                        updateStatistics(); // Update statistics after restore
                    });
                } else if (actionType === 'import') {
                    chrome.storage.local.get(['scripts'], (result) => {
                        const existingScripts = result.scripts || [];
                        const mergedScripts = [...existingScripts, ...data.scripts];
                        chrome.storage.local.set({ scripts: mergedScripts }, () => {
                            alert('Scripts imported successfully.');
                            updateStatistics(); // Update statistics after import
                        });
                    });
                }
            } else {
                alert('Invalid file structure.');
            }
        } catch (err) {
            alert('Error reading file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// Statistics update
function updateStatistics() {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        const totalQuota = 5 * 1024 * 1024; // 5MB limit
        const remainingQuota = totalQuota - bytesInUse;

        chrome.storage.local.get(['scripts'], (result) => {
            const scripts = result.scripts || [];
            const scriptCount = scripts.length;
            const averageScriptSize = scriptCount > 0 ? (bytesInUse / scriptCount) : 0;
            const scriptsRemaining = averageScriptSize > 0 ? Math.floor(remainingQuota / averageScriptSize) : '10k-20k';

            document.getElementById('script-count').innerText = scriptCount;
            document.getElementById('storage-size').innerText = (bytesInUse / 1024).toFixed(2) + ' KB';
            document.getElementById('space-left').innerText = (remainingQuota / 1024).toFixed(2) + ' KB';
            document.getElementById('scripts-remaining').innerText = scriptsRemaining;
        });
    });
}

// Initial call to update statistics on page load
updateStatistics();
