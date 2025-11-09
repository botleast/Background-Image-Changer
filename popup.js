// Key used for storage and messaging
const BG_STORAGE_KEY = 'minibloxCustomBG';
const MESSAGE_BOX_ID = 'message-box';
const INPUT_ID = 'bg-link-input';

const messageBox = document.getElementById(MESSAGE_BOX_ID);
const inputElement = document.getElementById(INPUT_ID);

/** Utility function to show temporary messages in the popup */
function showMessage(text, isError = false) {
    messageBox.textContent = text;
    messageBox.style.backgroundColor = isError ? '#ef4444' : '#34d399';
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

/** Loads the saved background link on popup open */
async function loadAndDisplayLink() {
    chrome.storage.local.get(BG_STORAGE_KEY, (result) => {
        if (result[BG_STORAGE_KEY]) {
            inputElement.value = result[BG_STORAGE_KEY];
        }
    });
}

/**
 * Sends a message to the content script to set the background and reload.
 * @param {string | null} bgLink The new background image URL or null to clear.
 */
async function sendBackgroundCommand(bgLink) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
        showMessage('Error: No active tab found.', true);
        return;
    }
    
    // Save the new link to storage first
    await new Promise(resolve => {
        chrome.storage.local.set({ [BG_STORAGE_KEY]: bgLink }, resolve);
    });

    // Send the link to the content script for injection and reload prompt
    chrome.tabs.sendMessage(tab.id, {
        action: "SET_CUSTOM_BACKGROUND",
        payload: { link: bgLink }
    }, (response) => {
        if (chrome.runtime.lastError) {
             showMessage(`Error: Could not communicate with page script. Make sure you are on Miniblox.io and try refreshing.`, true);
             console.error("Messaging error:", chrome.runtime.lastError.message);
        } else if (response && response.success) {
            // The content script displays the reload prompt, the popup can just close.
            window.close(); 
        } else {
            showMessage(`Switch failed: ${response?.message || 'Script execution failed.'}`, true);
        }
    });
}


document.getElementById('save-bg-link').addEventListener('click', () => {
    const link = inputElement.value.trim();
    if (!link) {
        showMessage('Please paste a valid image URL.', true);
        return;
    }
    sendBackgroundCommand(link);
});

document.getElementById('clear-bg-link').addEventListener('click', () => {
    inputElement.value = '';
    sendBackgroundCommand(null); // Send null to clear the background
});


document.addEventListener('DOMContentLoaded', loadAndDisplayLink);