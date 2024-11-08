document.addEventListener('DOMContentLoaded', () => {
    const scriptListContainer = document.getElementById('script-list');

    let scriptsData = [];
    let currentHostname = '*';  // Default value
    let currentSelector = '*';  // Default value
    let hasUnsavedChanges = false; // Track if there are unsaved changes

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
            scriptItem.setAttribute('data-id', index); // Unique identifier for ordering
        
            const scriptTitleContainer = document.createElement('div');
            scriptTitleContainer.classList.add('script-title-container');
            scriptTitleContainer.style.display = 'flex';
            scriptTitleContainer.style.alignItems = 'center';
        
            // Toggle arrow
            const toggleArrow = document.createElement('span');
            toggleArrow.textContent = '▶';
            toggleArrow.style.cursor = 'pointer';
            toggleArrow.style.marginRight = '8px';
            
            // Toggle arrow click to show/hide content
            toggleArrow.addEventListener('click', () => {
              if (scriptItem.classList.contains('open')) {
                toggleArrow.textContent = '▶';
                scriptItem.classList.remove('open');
              } else {
                toggleArrow.textContent = '▼';
                scriptItem.classList.add('open');
              }
            });

            const scriptTitle = document.createElement('h3');
            scriptTitle.textContent = script.title || 'Untitled Script';
            scriptTitle.classList.add('script-title');
            scriptTitle.style.flexGrow = '1';

            // Handle mousedown event to detect drag
            scriptTitle.addEventListener('mousedown', (event) => {
                isDragging = false;
                
                // Set a timeout to determine if the user is starting a drag
                dragTimeout = setTimeout(() => {
                isDragging = true;
                scriptItem.classList.remove('open'); // Close the section when starting drag
                scriptItem.setAttribute('draggable', 'true'); // Enable dragging
                }, 150); // Adjust delay as needed
            });

            // Handle mouseup to toggle open/close only if it was a click, not a drag
            scriptTitle.addEventListener('mouseup', (event) => {
                clearTimeout(dragTimeout); // Clear the drag detection timeout

                if (!isDragging) {
                // If it wasn't a drag, toggle the section open/close
                scriptItem.classList.toggle('open');
                }
                
                isDragging = false; // Reset dragging state
                scriptItem.setAttribute('draggable', 'false'); // Disable dragging
            });

            // Handle dragstart event to prevent section from opening
            scriptItem.addEventListener('dragstart', (event) => {
                isDragging = true;
            });

            scriptItem.addEventListener('dragend', (event) => {
                isDragging = false;
                scriptItem.setAttribute('draggable', 'false'); // Disable dragging after drag ends
            });

            scriptTitleContainer.appendChild(toggleArrow);
            scriptTitleContainer.appendChild(scriptTitle);
            scriptItem.appendChild(scriptTitleContainer);

            const scriptContent = document.createElement('div');
            scriptContent.classList.add('script-content');

            // Title field
            const titleLabel = document.createElement('label');
            titleLabel.textContent = 'Title (required):';
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.value = script.title;
            titleInput.required = true;
            titleInput.addEventListener('input', () => markAsUpdated(scriptItem));

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
                markAsUpdated(scriptItem)
            });

            const siteRefreshButton = document.createElement('button');
            siteRefreshButton.type = 'button';
            siteRefreshButton.classList.add('refresh-button');
            siteRefreshButton.innerHTML = '&#x1F504;'; // Correct HTML entity for the refresh symbol
            siteRefreshButton.addEventListener('click', () => {
                siteInput.value = currentHostname;  // Use stored hostname from popup.js
                markAsUpdated(scriptItem)
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
            selectorInput.addEventListener('change', () => markAsUpdated(scriptItem));

            const selectorStarButton = document.createElement('button');
            selectorStarButton.type = 'button';
            selectorStarButton.classList.add('star-button');
            selectorStarButton.innerHTML = '&#9733;';
            selectorStarButton.addEventListener('click', () => {
                selectorInput.value = '*';
                markAsUpdated(scriptItem)
            });

            const selectorRefreshButton = document.createElement('button');
            selectorRefreshButton.type = 'button';
            selectorRefreshButton.classList.add('refresh-button');
            selectorRefreshButton.innerHTML = '&#x1F504;'; // Correct HTML entity for the refresh symbol
            selectorRefreshButton.addEventListener('click', () => {
                selectorInput.value = currentSelector;  // Use stored selector from popup.js
                markAsUpdated(scriptItem)
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
            insertionMethodSelect.addEventListener('change', () => markAsUpdated(scriptItem));

            // Script Text field
            const scriptTextLabel = document.createElement('label');
            scriptTextLabel.textContent = 'Script Text:';
            const scriptTextArea = document.createElement('textarea');
            scriptTextArea.rows = 5;
            scriptTextArea.value = script.text;
            scriptTextArea.addEventListener('input', () => markAsUpdated(scriptItem));

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

            // Update button
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Update';
            updateButton.style.backgroundColor = '#4CAF50';
            updateButton.addEventListener('click', () => {
                script.title = titleInput.value;
                script.site = siteInput.value || '*';
                script.selector = selectorInput.value || '*';
                script.insertionMethod = insertionMethodSelect.value || 'direct';
                script.text = scriptTextArea.value;

                chrome.storage.local.set({ scripts: scriptsData }, () => {
                    alert('Script updated successfully.');
                    markAsSaved(scriptItem);
                });
            });

            buttonsContainer.appendChild(deleteButton);
            buttonsContainer.appendChild(cloneButton);
            buttonsContainer.appendChild(updateButton);

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
        initializeSortable();
    }

    // Function to add a thick red border to mark item as updated
    function markAsUpdated(scriptItem) {
      if (!scriptItem.classList.contains('updated')) {
          scriptItem.classList.add('updated');
          scriptItem.style.border = '3px solid red';
          hasUnsavedChanges = true;
      }
  }

  // Function to remove red border after update
  function markAsSaved(scriptItem) {
      scriptItem.classList.remove('updated');
      scriptItem.style.border = '1px solid #ffcc80';
      hasUnsavedChanges = Array.from(document.querySelectorAll('.script-item.updated')).length > 0;
  }

  // Warn user if trying to close with unsaved changes
  window.addEventListener('beforeunload', (event) => {
      if (hasUnsavedChanges) {
          event.preventDefault();
          event.returnValue = ''; // Necessary for displaying the prompt
      }
  });

  function initializeSortable() {
    new Sortable(scriptListContainer, {
        animation: 150,
        handle: 'h3', // Only the title (h3) is draggable
        onStart: (evt) => {
            const scriptItem = evt.item;

            // Check for unsaved changes before allowing drag
            const hasUnsavedChanges = Array.from(document.querySelectorAll('.script-item.updated')).length > 0;

            if (hasUnsavedChanges) {
                // Show warning to the user
                const confirmSave = confirm('Moving an item will save all changes immediately. Do you want to proceed?');
                if (!confirmSave) {
                    // Cancel the drag if user doesn't confirm
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                    return;
                } else {
                    // If confirmed, save all changes and clear indicators
                    saveAllScriptsAndClearIndicators();
                }
            }

            // Close the section if it's open and store the open state
            if (scriptItem.classList.contains('open')) {
                scriptItem.classList.remove('open');
                scriptItem.setAttribute('data-was-open', 'true');
            }
            
            scriptItem.setAttribute('draggable', 'true');
        },
        onEnd: (evt) => {
            const scriptItem = evt.item;

            // Restore open state if it was open before dragging
            if (scriptItem.getAttribute('data-was-open') === 'true') {
                scriptItem.classList.add('open');
                scriptItem.removeAttribute('data-was-open');
            }

            // Update the script order after dragging if there are no unsaved changes
            updateScriptOrder();
        }
    });
  }

  function updateScriptOrder() {
    const reorderedScripts = [];
    const scriptItems = document.querySelectorAll('.script-item');
  
    scriptItems.forEach((item) => {
      const index = item.getAttribute('data-id');
      reorderedScripts.push(scriptsData[index]);
    });
  
    scriptsData = reorderedScripts;
  
    // Save updated order to storage
    chrome.storage.local.set({ scripts: scriptsData }, () => {
      console.log('Scripts reordered and saved to storage.');
    });
  }

  function saveAllScriptsAndClearIndicators() {
    // Count elements with the 'updated' class
    const updatedElements = document.querySelectorAll('.script-item.updated');
    const updatedCount = updatedElements.length;

    // Save all scripts to storage
    chrome.storage.local.set({ scripts: scriptsData }, () => {
        // Clear red borders and indicators on all items
        updatedElements.forEach(scriptItem => {
            markAsSaved(scriptItem);
        });

        // Show alert with the count of updated elements
        alert(`${updatedCount} script${updatedCount === 1 ? '' : 's'} updated successfully.`);
    });
  }  

  // Global Update and Cancel button event listeners
  document.getElementById('update-button').addEventListener('click', () => {
    // Loop through each script and apply changes from _elements if any changes are pending
    scriptsData.forEach(script => {
        const { titleInput, siteInput, selectorInput, insertionMethodSelect, scriptTextArea } = script._elements;
        script.title = titleInput.value;
        script.site = siteInput.value || '*';
        script.selector = selectorInput.value || '*';
        script.insertionMethod = insertionMethodSelect.value || 'direct';
        script.text = scriptTextArea.value;
    });

    // Save all scripts at once to storage
    chrome.storage.local.set({ scripts: scriptsData }, () => {
        saveAllScriptsAndClearIndicators();
    });
  });
});
