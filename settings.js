// Get DOM elements
const importFileInput = document.getElementById('import-file');
const importUrlInput = document.getElementById('import-url');
const restoreButton = document.getElementById('restore-button');
const importButton = document.getElementById('import-button');

// Enable/Disable Restore and Import buttons based on file selection or URL
importFileInput.addEventListener('change', (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
        restoreButton.disabled = false;
        importButton.disabled = false;
    }
});

importUrlInput.addEventListener('input', (event) => {
    const url = event.target.value.trim();
    const isUrlValid = url.length > 0;
    
    // Disable the file input if there's text in the URL box, enable if empty
    importFileInput.disabled = isUrlValid;

    // Enable buttons only if there's a valid URL or a file is selected
    restoreButton.disabled = !isUrlValid && !importFileInput.files[0];
    importButton.disabled = !isUrlValid && !importFileInput.files[0];
});

document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('import-url');
    const dropdownArrow = document.getElementById('dropdown-arrow');
    const dropdownOptions = document.getElementById('dropdown-options');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            // Activate selected tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            // Show target content and hide others
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) content.classList.add('active');
            });
        });
    });

    // Populate About section with manifest info
    const manifest = chrome.runtime.getManifest();
    document.getElementById('app-name').textContent = manifest.name;
    document.getElementById('app-version').textContent = manifest.version;
    document.getElementById('app-description').textContent = manifest.description;
  
    // Toggle dropdown visibility when clicking the arrow only
    dropdownArrow.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent the click from propagating to the document
      dropdownOptions.style.display = dropdownOptions.style.display === 'none' ? 'block' : 'none';
    });
  
    // Populate input with the selected URL and hide the dropdown
    dropdownOptions.addEventListener('click', (event) => {
      if (event.target.classList.contains('dropdown-option')) {
        urlInput.value = event.target.getAttribute('data-url');
        dropdownOptions.style.display = 'none';

        // Manually trigger the input event to enable buttons
        urlInput.dispatchEvent(new Event('input'));
      }
    });
  
    // Hide dropdown if clicking outside
    document.addEventListener('click', (event) => {
      if (!dropdownOptions.contains(event.target) && event.target !== dropdownArrow) {
        dropdownOptions.style.display = 'none';
      }
    });
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
        a.download = `textnugs-${timestamp}.json`;
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

// Restore button logic (for URL or file)
restoreButton.addEventListener('click', () => {
    const url = importUrlInput.value.trim();
    if (url) {
        fetchFileFromUrl(url, 'restore');
    } else {
        processFile('restore');
    }
});

// Import button logic (for URL or file)
importButton.addEventListener('click', () => {
    const url = importUrlInput.value.trim();
    if (url) {
        fetchFileFromUrl(url, 'import');
    } else {
        processFile('import');
    }
});

// Fetch file from a URL and process it
function fetchFileFromUrl(url, actionType) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            validateAndProcessJson(data, actionType);
        })
        .catch(error => {
            alert('Failed to fetch file from URL: ' + error.message);
        });
}

// Validate JSON structure and process it
function validateAndProcessJson(data, actionType) {
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
}

// Process file for restore or import actions from file picker
function processFile(actionType) {
    const file = importFileInput.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            validateAndProcessJson(data, actionType);
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
