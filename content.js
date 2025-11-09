/**
 * Content Script: Runs on Miniblox.io and Blockcraft.online.
 * It intercepts the custom background link, stores it, and applies it
 * to the correct image element on the page, then prompts for reload.
 */

const BG_STORAGE_KEY = 'minibloxCustomBG';
const RELOAD_BOX_ID = 'bg-switcher-reload-prompt';
// Selectors identified from the original UnverifiedV2 script:
const BACKGROUND_SELECTORS = [
    'img.chakra-image.css-rkihvp',
    'img.chakra-image.css-mohuzh',
    '.css-aznra0',
];

let currentBgLink = null;

/**
 * Applies the current background link to the target element.
 * @param {HTMLElement} element The image or container element to modify.
 */
function applyBackground(element) {
    if (element.tagName === 'IMG') {
        // If it's an image element, change the source
        element.src = currentBgLink;
    } else {
        // If it's a generic container, change the background-image style
        element.style.backgroundImage = `url(${currentBgLink})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
    }
}

/**
 * Clears the background, allowing the default site style to return.
 * @param {HTMLElement} element The image or container element to revert.
 */
function clearBackground(element) {
    if (element.tagName === 'IMG') {
        // Revert src to empty string or a known default if necessary.
        // For Miniblox, setting src=null might be enough for it to re-render default.
        element.src = ''; 
    } else {
        // Clear background styles
        element.style.backgroundImage = '';
        element.style.backgroundSize = '';
        element.style.backgroundPosition = '';
    }
}

/**
 * Searches the DOM and applies/clears the background on all matching elements.
 */
function applyAllBackgrounds() {
    BACKGROUND_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            if (currentBgLink) {
                applyBackground(element);
            } else {
                clearBackground(element);
            }
        });
    });
}

/**
 * Observes the DOM for newly added elements that match the background selectors
 * and applies the custom background immediately.
 */
function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Check if it's an element node
                    BACKGROUND_SELECTORS.forEach(selector => {
                        if (node.matches(selector)) {
                            if (currentBgLink) applyBackground(node);
                            else clearBackground(node);
                        }
                        node.querySelectorAll(selector).forEach(child => {
                            if (currentBgLink) applyBackground(child);
                            else clearBackground(child);
                        });
                    });
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}


/**
 * Creates and displays a floating, dismissible message with a Reload button.
 * @param {string | null} link The link that was set or null if cleared.
 */
function promptForReload(link) {
    if (document.getElementById(RELOAD_BOX_ID)) {
        document.getElementById(RELOAD_BOX_ID).remove();
    }

    const isClear = !link;
    const box = document.createElement('div');
    box.id = RELOAD_BOX_ID;
    box.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: ${isClear ? '#ef4444' : '#047857'}; /* Red or Dark Green */
        color: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 99999;
        max-width: 300px;
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    box.innerHTML = `
        <div style="font-weight: bold; font-size: 1.1em;">
            ${isClear ? 'Background Cleared!' : 'New Background Set!'}
        </div>
        <div>
            ${isClear ? 'The page needs to refresh to show the default background.' : 'Click reload to see the new image applied.'}
        </div>
        <button id="reload-btn" style="
            background-color: #fcd34d; /* Yellow Button */
            color: #1f2937;
            padding: 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        ">
            Click to RELOAD PAGE
        </button>
        <button id="dismiss-btn" style="
            background: none;
            color: #ccc;
            border: none;
            font-size: 0.9em;
            cursor: pointer;
        ">
            Dismiss
        </button>
    `;

    document.body.appendChild(box);

    document.getElementById('reload-btn').addEventListener('click', () => {
        window.location.reload();
    });
    
    document.getElementById('dismiss-btn').addEventListener('click', () => {
        box.remove();
    });
}

// Initial setup: Load the saved link and start the observer
chrome.storage.local.get(BG_STORAGE_KEY, (result) => {
    currentBgLink = result[BG_STORAGE_KEY];
    // Apply the background to elements already on the page
    applyAllBackgrounds(); 
    // Set up the observer for future elements
    setupMutationObserver();
});

// Listener for messages from the extension's popup.js
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "SET_CUSTOM_BACKGROUND") {
            const { link } = request.payload;
            currentBgLink = link;
            
            try {
                // Instantly try to apply the change (before reload)
                applyAllBackgrounds();
                
                console.log(
                    `%c[BG Switcher] SUCCESS: Background link set to: ${link || 'default'}`, 
                    "color: #34d399; font-weight: bold;"
                );
                
                promptForReload(link); 

                sendResponse({ success: true, message: "Background set and reload prompted." });
                
            } catch (e) {
                console.error("[BG Switcher] ERROR setting background:", e);
                sendResponse({ 
                    success: false, 
                    message: `Failed to apply background: ${e.message}.` 
                });
            }
            
            return true; // Indicates an asynchronous response
        }
    }
);