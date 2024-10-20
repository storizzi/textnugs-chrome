document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('addDialogData', (result) => {
      const data = result.addDialogData;
      if (data) {
        const { hostname, selectedText, selector } = data;
        document.getElementById('site').value = hostname || '';
        document.getElementById('script-text').value = selectedText || '';
        document.getElementById('selector').value = selector || '';
  
        // Clean up storage
        chrome.storage.local.remove('addDialogData');
      } else {
        // Fallback to clipboard data
        navigator.clipboard.readText().then(clipboardText => {
          document.getElementById('script-text').value = clipboardText || '';
        });
      }
  
      // Set focus to the Title input field
      document.getElementById('title').focus();
    });
  
    // Event listeners for star buttons
    document.getElementById('site-star-button').addEventListener('click', () => {
      document.getElementById('site').value = '*';
    });
  
    document.getElementById('selector-star-button').addEventListener('click', () => {
      document.getElementById('selector').value = '*';
    });
  });
  
  document.getElementById('add-form').addEventListener('submit', event => {
    event.preventDefault();
  
    const title = document.getElementById('title').value;
    const site = document.getElementById('site').value || '*';
    const selector = document.getElementById('selector').value || '*';
    const insertionMethod = document.getElementById('insertion-method').value || 'clipboard';
    const text = document.getElementById('script-text').value;
  
    // Save the script to storage
    chrome.storage.local.get(['scripts'], result => {
      const scripts = result.scripts || [];
      scripts.push({ title, site, selector, insertionMethod, text });
      chrome.storage.local.set({ scripts }, () => {
        window.close();
      });
    });
  });
  
  document.getElementById('cancel-button').addEventListener('click', () => {
    window.close();
  });
  