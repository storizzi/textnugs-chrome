document.addEventListener('DOMContentLoaded', () => {
    const scriptListContainer = document.getElementById('script-list');

    let scriptsData = [];
    let currentHostname = '*';  // Default value
    let currentSelector = '*';  // Default value

    // Retrieve stored hostname and selector from popup.js
    chrome.storage.local.get(['editDialogData'], result => {
        if (result.editDialogData) {
            currentHostname = result.editDialogData.hostname || '*';
            currentSelector = result.editDialogData.selector || '*';
        }

        // Load scripts from storage
        chrome.storage.local.get(['scripts'], result => {
            scriptsData = result.scripts || [];
            displayScripts();
        });
    });

    function displayScripts() {
        scriptListContainer.innerHTML = ''; // Clear the list

        scriptsData.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.classList.add('script-item');

            const scriptTitle = document.createElement('h3');
            scriptTitle.textContent = script.title || 'Untitled Script';
            scriptTitle.addEventListener('click', () => {
                scriptItem.classList.toggle('open');
            });

            const scriptContent = document.createElement('div');
            scriptContent.classList.add('script-content');

            // Title field
            const titleLabel = document.createElement('label');
            titleLabel.textContent = 'Title (required):';
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.value = script.title;
            titleInput.required = true;

            // Site field with star button and refresh button
            const siteLabel = document.createElement('label');
            siteLabel.textContent = 'Site (optional):';
            const siteInputGroup = document.createElement('div');
            siteInputGroup.classList.add('input-group');

            const siteInput = document.createElement('input');
            siteInput.type = 'text';
            siteInput.value = script.site;

            const siteStarButton = document.createElement('button');
            siteStarButton.type = 'button';
            siteStarButton.classList.add('star-button');
            siteStarButton.innerHTML = '&#9733;';
            siteStarButton.addEventListener('click', () => {
                siteInput.value = '*';
            });

            const siteRefreshButton = document.createElement('button');
            siteRefreshButton.type = 'button';
            siteRefreshButton.classList.add('refresh-button');
            siteRefreshButton.innerHTML = '&#x1F504;'; // Correct HTML entity for the refresh symbol
            siteRefreshButton.addEventListener('click', () => {
                siteInput.value = currentHostname;  // Use stored hostname from popup.js
            });

            siteInputGroup.appendChild(siteInput);
            siteInputGroup.appendChild(siteStarButton);
            siteInputGroup.appendChild(siteRefreshButton);

            // Selector field with star button and refresh button
            const selectorLabel = document.createElement('label');
            selectorLabel.textContent = 'Selector (optional):';
            const selectorInputGroup = document.createElement('div');
            selectorInputGroup.classList.add('input-group');

            const selectorInput = document.createElement('input');
            selectorInput.type = 'text';
            selectorInput.value = script.selector;

            const selectorStarButton = document.createElement('button');
            selectorStarButton.type = 'button';
            selectorStarButton.classList.add('star-button');
            selectorStarButton.innerHTML = '&#9733;';
            selectorStarButton.addEventListener('click', () => {
                selectorInput.value = '*';
            });

            const selectorRefreshButton = document.createElement('button');
            selectorRefreshButton.type = 'button';
            selectorRefreshButton.classList.add('refresh-button');
            selectorRefreshButton.innerHTML = '&#x1F504;'; // Correct HTML entity for the refresh symbol
            selectorRefreshButton.addEventListener('click', () => {
                selectorInput.value = currentSelector;  // Use stored selector from popup.js
            });

            selectorInputGroup.appendChild(selectorInput);
            selectorInputGroup.appendChild(selectorStarButton);
            selectorInputGroup.appendChild(selectorRefreshButton);

            // Insertion Method field
            const insertionMethodLabel = document.createElement('label');
            insertionMethodLabel.textContent = 'Insertion Method:';
            const insertionMethodSelect = document.createElement('select');
            const directOption = document.createElement('option');
            directOption.value = 'direct';
            directOption.textContent = 'Direct Insertion';
            const clipboardOption = document.createElement('option');
            clipboardOption.value = 'clipboard';
            clipboardOption.textContent = 'Copy to Clipboard';
            insertionMethodSelect.appendChild(directOption);
            insertionMethodSelect.appendChild(clipboardOption);
            insertionMethodSelect.value = script.insertionMethod || 'direct';

            // Script Text field
            const scriptTextLabel = document.createElement('label');
            scriptTextLabel.textContent = 'Script Text:';
            const scriptTextArea = document.createElement('textarea');
            scriptTextArea.rows = 5;
            scriptTextArea.value = script.text;

            // Buttons container (for Clone and Delete)
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.marginTop = '10px';

            // Delete Button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.backgroundColor = '#f44336';
            deleteButton.style.marginRight = '10px';
            deleteButton.addEventListener('click', () => {
                scriptsData.splice(index, 1);  // Remove script from the array
                displayScripts();  // Refresh the display
            });

            // Clone Button
            const cloneButton = document.createElement('button');
            cloneButton.textContent = 'Clone';
            cloneButton.style.backgroundColor = '#ff9800';
            cloneButton.addEventListener('click', () => {
                const newScript = JSON.parse(JSON.stringify(script));  // Clone the script
                scriptsData.splice(index + 1, 0, newScript);
                displayScripts();  // Refresh the display
            });

            buttonsContainer.appendChild(deleteButton);
            buttonsContainer.appendChild(cloneButton);

            // Append fields to scriptContent
            scriptContent.appendChild(titleLabel);
            scriptContent.appendChild(titleInput);
            scriptContent.appendChild(siteLabel);
            scriptContent.appendChild(siteInputGroup);
            scriptContent.appendChild(selectorLabel);
            scriptContent.appendChild(selectorInputGroup);
            scriptContent.appendChild(insertionMethodLabel);
            scriptContent.appendChild(insertionMethodSelect);
            scriptContent.appendChild(scriptTextLabel);
            scriptContent.appendChild(scriptTextArea);
            scriptContent.appendChild(buttonsContainer);

            scriptItem.appendChild(scriptTitle);
            scriptItem.appendChild(scriptContent);

            // Store references for updating
            script._elements = {
                titleInput,
                siteInput,
                selectorInput,
                insertionMethodSelect,
                scriptTextArea
            };

            scriptListContainer.appendChild(scriptItem);
        });
    }

    // Global Update and Cancel button event listeners
    document.getElementById('update-button').addEventListener('click', () => {
        // Collect updated data
        scriptsData.forEach(script => {
            const { titleInput, siteInput, selectorInput, insertionMethodSelect, scriptTextArea } = script._elements;
            script.title = titleInput.value;
            script.site = siteInput.value || '*';
            script.selector = selectorInput.value || '*';
            script.insertionMethod = insertionMethodSelect.value || 'direct';
            script.text = scriptTextArea.value;
        });

        // Save updated scripts to storage
        chrome.storage.local.set({ scripts: scriptsData }, () => {
            alert('Scripts updated successfully.');
            window.close();
        });
    });

    document.getElementById('cancel-button').addEventListener('click', () => {
        window.close();
    });
});
