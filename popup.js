// Shared function to execute a script in the tab to get the unique CSS selector
async function getUniqueSelectorFromTab() {
    const [tab] = await chrome.tabs.query({ active: true, windowType: 'normal' });

    // Check if the page is a chrome:// or chrome-extension:// page, return empty values
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return { hostname: '', selector: '*' };
    }

    const url = new URL(tab.url);
    const hostname = url.hostname;

    // Execute script in the tab context to get the selector
    const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // Function to generate a unique CSS selector for an element
            function getUniqueSelector(el) {
                if (!(el instanceof Element)) return '';
                const path = [];
                while (el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.nodeName.toLowerCase();
                    if (el.id) {
                        selector += '#' + el.id;
                        path.unshift(selector);
                        break;
                    } else {
                        let sib = el, nth = 1;
                        while ((sib = sib.previousElementSibling)) {
                            if (sib.nodeName.toLowerCase() == el.nodeName.toLowerCase())
                                nth++;
                        }
                        if (nth != 1)
                            selector += `:nth-of-type(${nth})`;
                    }
                    path.unshift(selector);
                    el = el.parentNode;
                }
                return path.join(' > ');
            }

            const activeElement = document.activeElement;
            let selector = '';
            if (activeElement && activeElement !== document.body) {
                selector = getUniqueSelector(activeElement);
            }

            return selector;
        }
    });

    const selector = result.result || '*';
    return { hostname, selector };
}

// Event listener for the "Add..." button
document.getElementById('add-button').addEventListener('click', async () => {
    const { hostname, selector } = await getUniqueSelectorFromTab();  // Use the centralized function

    // Get the clipboard text to set as the default selected text
    let clipboardText = '';
    try {
        clipboardText = await navigator.clipboard.readText();  // Get the clipboard text
    } catch (err) {
        console.error('Failed to read clipboard text:', err);
        clipboardText = '';  // Default to empty if an error occurs
    }

    // Store the data and open the add dialog
    chrome.storage.local.set({ addDialogData: { hostname, selectedText: clipboardText, selector } }, () => {
        openAddDialog();
    });
});

// Function to open the Add Dialog (reusable)
function openAddDialog() {
    const width = 420; // Adjusted to account for padding
    const height = 540;
    chrome.windows.getCurrent(windowInfo => {
        const left = Math.round(windowInfo.left + (windowInfo.width - width) / 2);
        const top = Math.round(windowInfo.top + (windowInfo.height - height) / 2);
        chrome.windows.create({
            url: chrome.runtime.getURL('add_dialog.html'),
            type: 'popup',
            width: width,
            height: height,
            left: left >= 0 ? left : 0,
            top: top >= 0 ? top : 0,
            focused: true
        });
        window.close();
    });
}

// Event listener for the "Edit All" button
document.getElementById('edit-button').addEventListener('click', async () => {
    const { hostname, selector } = await getUniqueSelectorFromTab();

    // Store hostname and selector for the edit page
    chrome.storage.local.set({ editDialogData: { hostname, selector } }, () => {
        // Calculate center position
        const width = 450;
        const height = 580;
        chrome.windows.getCurrent(windowInfo => {
            const left = Math.round(windowInfo.left + (windowInfo.width - width) / 2);
            const top = Math.round(windowInfo.top + (windowInfo.height - height) / 2);
            chrome.windows.create({
                url: chrome.runtime.getURL('edit_all.html'),
                type: 'popup',
                width: width,
                height: height,
                left: left >= 0 ? left : 0,
                top: top >= 0 ? top : 0,
                focused: true
            });
            window.close();
        });
    });
});

// Event listener for the "Settings" button
document.getElementById('settings-button').addEventListener('click', () => {
    // Get current window dimensions to center the popup
    chrome.windows.getCurrent((currentWindow) => {
        const width = 400;
        const height = 400;
        const left = Math.round((currentWindow.width - width) / 2 + currentWindow.left);
        const top = Math.round((currentWindow.height - height) / 2 + currentWindow.top);

        // Open the settings popup centered
        chrome.windows.create({
            url: 'settings_popup.html',
            type: 'popup',
            width: width,
            height: height,
            left: left >= 0 ? left : 0,  // Ensure left and top are non-negative
            top: top >= 0 ? top : 0
        });

        // Close the main options dialog
        window.close();
    });
});

// Function to handle the hover-over preview
function createHoverPreview(script, listItem) {
    const hoverPreview = document.createElement('div');
    hoverPreview.classList.add('hover-preview');
    hoverPreview.textContent = script.text.slice(0, 100) + '...';

    // When you hover over the list item
    listItem.addEventListener('mouseenter', () => {
        listItem.appendChild(hoverPreview);
    });

    // When you move the mouse away
    listItem.addEventListener('mouseleave', () => {
        if (hoverPreview.parentNode) {
            listItem.removeChild(hoverPreview);
        }
    });

    // Handle click to expand into a scrollable full view
    hoverPreview.addEventListener('click', () => {
        hoverPreview.classList.add('full-view');
        hoverPreview.textContent = script.text;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const scripts = await getMatchingScripts();
    const list = document.getElementById('script-list');

    // Create the hover preview div outside the list
    const hoverPreview = document.createElement('div');
    hoverPreview.classList.add('hover-preview');
    document.body.appendChild(hoverPreview);

    let isHoveredOverPreview = false;
    let isHoveredOverMenuItem = false;
    let hoverTimeout;
    interactionCount = 0;  // Reset interaction count
    let hideHoverTimeout;
    let isHoverBoxFocused = false;
    let isInteractionLocked = false; // New flag to disable other menu item events

// Function to show the hover preview
function showHoverPreview(text, rect) {
    if (isInteractionLocked) return; // Do nothing if interactions are locked

    hoverPreview.textContent = text;

    // Get the bounding client rect of the list item
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;

    // Adjust the hover preview's position relative to the document's scroll position
    hoverPreview.style.left = `${rect.left + scrollLeft + 30}px`; // Move to the right a bit more
    hoverPreview.style.top = `${rect.top + scrollTop - hoverPreview.offsetHeight + 5}px`; // Slightly overlap the menu item
    hoverPreview.classList.add('hover-visible');
    hoverPreview.style.border = 'none'; // Reset border when not focused

    clearTimeout(hoverTimeout); // Clear any existing timeout to prevent hiding immediately
}


    // Function to hide the hover preview
    function hideHoverPreview() {
        if (!isHoveredOverMenuItem && !isHoveredOverPreview && !isHoverBoxFocused) {
            hoverPreview.classList.remove('hover-visible');
        }
    }

    // Updated event listeners for hover behavior on menu items
scripts.forEach(script => {
    const listItem = document.createElement('li');
    listItem.textContent = script.title;

    listItem.addEventListener('click', () => {
        const insertionMethod = script.insertionMethod || 'direct';
        insertScript(script.text, script.selector, insertionMethod);
    });

    // Add hover event listeners to display the preview
    listItem.addEventListener('mouseenter', (event) => {
        if (isInteractionLocked) return; // Do nothing if interactions are locked

        isHoveredOverMenuItem = true;

        // Ensure only one hover box is shown at a time by clearing the previous hover
        hoverPreview.classList.remove('hover-visible');

        // Pass both the text and the rect of the item
        showHoverPreview(script.text, listItem.getBoundingClientRect());

        // Set a timeout to hide the hover box after 0.5 seconds if not clicked
        hoverTimeout = setTimeout(hideHoverPreview, 500);
    });

    listItem.addEventListener('mouseleave', () => {
        if (isInteractionLocked) return; // Do nothing if interactions are locked

        isHoveredOverMenuItem = false;
        setTimeout(hideHoverPreview, 100); // Delay to allow transition to hover box
    });

    list.appendChild(listItem);
});


    // Prevent hover box from disappearing when hovered, but hide after 0.5s if not clicked
    hoverPreview.addEventListener('mouseenter', () => {
        if (isInteractionLocked) return; // Do nothing if interactions are locked

        isHoveredOverPreview = true;
        clearTimeout(hoverTimeout); // Cancel the hide timeout when hovering over the box

        if (!isHoverBoxFocused) {
            // Set a timeout to hide the hover preview after 0.5s if the user doesn't click
            hideHoverTimeout = setTimeout(() => {
                isHoveredOverPreview = false;
                hideHoverPreview();
            }, 500);
        }
    });

    // Handle click on hover box to enable interaction (focus mode)
    hoverPreview.addEventListener('click', () => {
        isHoverBoxFocused = true;  // Set focus state
        isInteractionLocked = true;  // Disable all other menu item interactions
        interactionCount = 0;  // Reset interaction count

        hoverPreview.style.border = '2px solid orange';  // Add orange border to indicate focus
        hoverPreview.style.overflowY = 'scroll';  // Allow scrolling if content exceeds box size
        hoverPreview.style.pointerEvents = 'auto';  // Enable full interaction with hover box

        clearTimeout(hideHoverTimeout);  // Cancel hide timeout while focused
    });

    // Remove focus and hide after 0.5 seconds when leaving the hover box
    hoverPreview.addEventListener('mouseleave', () => {
        if (isHoverBoxFocused) {
            interactionCount++;  // Increment interaction count
            hideHoverTimeout = setTimeout(() => {
                if (!isHoveredOverPreview || (isInteractionLocked && interactionCount > 1)) {
                    isHoverBoxFocused = false;  // Remove focus state
                    hoverPreview.style.border = 'none';  // Reset border
                    hoverPreview.classList.remove('hover-visible');  // Hide hover box
                    isInteractionLocked = false;  // Re-enable other menu item interactions
                    interactionCount = 0;  // Reset interaction count
                }
            }, 500);
        }
    });

    // Allow clicking on the hover box to keep it visible
    hoverPreview.addEventListener('click', () => {
        hoverPreview.style.pointerEvents = 'none'; // Temporarily disable further interactions
        setTimeout(() => {
            hoverPreview.style.pointerEvents = 'auto'; // Re-enable interaction after a delay
        }, 300); // Small delay to allow for user interaction
    });
});


// Function to get scripts that match the current site and selector
async function getMatchingScripts() {
    const [tab] = await chrome.tabs.query({ active: true, windowType: 'normal' });
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const url = new URL(tab.url);
        const currentSite = url.hostname;
        const currentSelector = '*';  // Default selector

        return new Promise(resolve => {
            chrome.storage.local.get(['scripts'], result => {
                const scripts = result.scripts || [];
                const matchingScripts = scripts.filter(script => {
                    return matchesSite(script.site, currentSite) && matchesSelector(script.selector, currentSelector);
                });
                resolve(matchingScripts);
            });
        });
    } else {
        return [];
    }
}

// Function to check if the script's site matches the current site (supports wildcards)
function matchesSite(scriptSite, currentSite) {
    const regexString = '^' + scriptSite.replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexString);
    return regex.test(currentSite);
}

// Function to check if the script's selector matches the current selector
function matchesSelector(scriptSelector, currentSelector) {
    return true; // For simplicity, we'll assume it matches
}

// Function to insert the script text into the active element or copy to clipboard
function insertScript(text, selector, insertionMethod) {
    function processScriptText(scriptText, callback) {
        if (scriptText.includes('{{clipboard}}')) {
            navigator.clipboard.readText().then(clipboardText => {
                const processedText = scriptText.replace(/{{clipboard}}/g, clipboardText);
                callback(processedText);
            }).catch(err => {
                console.error('Failed to read text from clipboard:', err);
                alert('Failed to read text from clipboard.');
                window.close();
            });
        } else {
            callback(scriptText);
        }
    }

    processScriptText(text, (processedText) => {
        if (insertionMethod === 'clipboard') {
            navigator.clipboard.writeText(processedText).then(() => {
                setTimeout(() => {
                    window.close();  // Close the window after 200ms delay
                }, 200);
            }).catch(err => {
                console.error('Failed to copy text to clipboard:', err);
                alert('Failed to copy text to clipboard.');
                setTimeout(() => {
                    window.close();  // Close the window after 300ms even if there's an error
                }, 300);
            });
        } else if (insertionMethod === 'direct') {
            chrome.tabs.query({ active: true, windowType: 'normal' }, tabs => {
                if (tabs.length > 0) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (scriptText, elementSelector) => {
                            function insertTextAtCursor(element, text) {
                                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                                    const start = element.selectionStart !== null ? element.selectionStart : element.value.length;
                                    const end = element.selectionEnd !== null ? element.selectionEnd : element.value.length;
                                    element.setRangeText(text, start, end, 'end');
                                } else if (element.isContentEditable) {
                                    const sel = window.getSelection();
                                    if (sel.rangeCount > 0) {
                                        const range = sel.getRangeAt(0);
                                        range.deleteContents();
                                        const textNode = document.createTextNode(text);
                                        range.insertNode(textNode);
                                        range.setStartAfter(textNode);
                                        range.setEndAfter(textNode);
                                        sel.removeAllRanges();
                                        sel.addRange(range);
                                    } else {
                                        element.innerHTML += text;
                                    }
                                } else {
                                    alert('The selected element is not editable.');
                                }
                            }

                            let element = null;
                            if (elementSelector && elementSelector !== '*') {
                                element = document.querySelector(elementSelector);
                                if (element) {
                                    if (document.activeElement === element) {
                                        insertTextAtCursor(element, scriptText);
                                    } else {
                                        element.focus();
                                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                                            const length = element.value.length;
                                            element.setSelectionRange(length, length);
                                            insertTextAtCursor(element, scriptText);
                                        } else if (element.isContentEditable) {
                                            const range = document.createRange();
                                            range.selectNodeContents(element);
                                            range.collapse(false);
                                            const sel = window.getSelection();
                                            sel.removeAllRanges();
                                            sel.addRange(range);
                                            insertTextAtCursor(element, scriptText);
                                        } else {
                                            alert('The selected element is not editable.');
                                        }
                                    }
                                } else {
                                    alert('Element not found with the provided selector.');
                                }
                            } else {
                                element = document.activeElement;
                                if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable)) {
                                    insertTextAtCursor(element, scriptText);
                                } else {
                                    alert('Please focus on a text input or editable area to insert the script.');
                                }
                            }
                        },
                        args: [processedText, selector]
                    }, () => {
                        window.close();
                    });
                } else {
                    alert('No active tab found to insert the script.');
                    window.close();
                }
            });
        } else {
            alert('Unknown insertion method.');
            window.close();
        }
    });
}
