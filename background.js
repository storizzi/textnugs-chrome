chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "update") {
        const currentVersion = getCurrentVersion();  // Your logic to get version
        const releaseUrl = `https://github.com/storizzi/textnugs-chrome/releases/release-${currentVersion}.md`;

        // Use fetch to check the URL before opening
        checkReleasePage(releaseUrl);
    }
});

function getCurrentVersion() {
    // Retrieve the current version from manifest
    return chrome.runtime.getManifest().version;
}

function checkReleasePage(url) {
    fetch(url, { method: 'HEAD' })  // Use HEAD to just check the status without downloading the page
        .then(response => {
            if (response.ok) {
                // If the page exists, open the tab
                chrome.tabs.create({ url: url });
            } else {
                console.log('Release notes page does not exist: ' + response.status);
            }
        })
        .catch(error => {
            console.error('Error checking release page:', error);
        });
}
