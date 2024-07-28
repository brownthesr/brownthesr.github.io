(function() {
    "use strict";

    // Debounce function to limit the rate at which a function is called
    function debounce(callbackFunction, delayInMilliseconds) {
        let timeoutId;
        return (...args) => {
            // Clear the timeout for any previously scheduled function
            clearTimeout(timeoutId);
            // Set a new timeout to call the function after the specified delay
            timeoutId = setTimeout(() => {
                callbackFunction(...args);
            }, delayInMilliseconds);
        };
    }

    // Class to handle executing functions when the DOM is fully loaded
    class DOMContentLoadedHandler {
        constructor() {
            // Array to store callback functions with priorities
            this.callbacks = [];
            // Listen for the DOMContentLoaded event
            window.addEventListener("DOMContentLoaded", () => this.onDOMContentLoaded());
        }

        // Execute callbacks when DOM is loaded
        onDOMContentLoaded() {
            // Sort callbacks by priority and execute them in order
            this.callbacks.sort((a, b) => a.priority - b.priority).forEach(({ callback }) => callback());
        }

        // Add a function to be run once the document is loaded
        runOnLoad(callbackWithPriority) {
            if (document.readyState === "loading") {
                // If the document is still loading, add the callback to the queue
                this.callbacks.push(callbackWithPriority);
            } else {
                // Otherwise, execute the callback immediately
                callbackWithPriority.callback();
            }
        }
    }

    // Function to manage the execution of scripts, ensuring they run once the DOM is loaded
    function executeWhenReady(callback, priority = Number.MAX_VALUE) {
        // Ensure there's a script executor on the window object
        window.canva_scriptExecutor = window.canva_scriptExecutor || new DOMContentLoadedHandler();
        // Schedule the callback to run with a specific priority
        window.canva_scriptExecutor.runOnLoad({
            callback: callback,
            priority: priority
        });
    }

    // Class to handle window resize events and execute callbacks based on size changes
    class ResizeHandler {
        constructor(debounceFunction) {
            // Array to store callbacks with their execution options
            this.resizeCallbacks = [];
            this.previousWindowWidth = document.documentElement.clientWidth;
            this.previousWindowHeight = window.innerHeight;
            // Create a debounced resize handler
            const debouncedResizeEvent = debounceFunction(() => this.onWindowResize(), 100);
            // Add the debounced event listener for window resizing
            window.addEventListener("resize", debouncedResizeEvent);
        }

        // Execute callbacks when window size changes
        onWindowResize() {
            const currentWindowWidth = document.documentElement.clientWidth;
            const currentWindowHeight = window.innerHeight;
            const hasWidthChanged = this.previousWindowWidth !== currentWindowWidth;
            const hasHeightChanged = this.previousWindowHeight !== currentWindowHeight;

            // Execute callbacks based on whether width or height has changed
            this.resizeCallbacks.forEach((resizeCallback) => {
                const executeCallback = () => {
                    resizeCallback.callback();
                    resizeCallback.executed = true; // Mark callback as executed
                };

                // Execute callback if conditions are met
                if (
                    !resizeCallback.executed ||
                    (hasWidthChanged && resizeCallback.options.runOnWidthChange) ||
                    (hasHeightChanged && resizeCallback.options.runOnHeightChange)
                ) {
                    executeCallback();
                }
            });

            // Update the previous width and height to the current values
            this.previousWindowWidth = currentWindowWidth;
            this.previousWindowHeight = currentWindowHeight;
        }

        // Add a callback to be run on window resize with specified options
        runOnResize(callback, options) {
            // Add the callback with its options to the list of resizeCallbacks
            this.resizeCallbacks.push({
                callback: callback,
                options: options,
                executed: options.runOnLoad // Initial execution state
            });
            // Sort callbacks by priority
            this.resizeCallbacks.sort((a, b) => a.options.priority - b.options.priority);
            // Execute the callback immediately if runOnLoad is true
            if (options.runOnLoad) {
                executeWhenReady(callback, options.priority);
            }
        }
    }

    // Function to set up a debounced resize callback handler
    function setupDebouncedResizeHandler(resizeCallback, options, debounceFunc = debounce) {
        // Ensure there's a debounced resize handler on the window object
        window.canva_debounceResize = window.canva_debounceResize || new ResizeHandler(debounceFunc);
        // Add the callback to the resize handler with specified options
        window.canva_debounceResize.runOnResize(resizeCallback, {
            runOnLoad: false,
            runOnWidthChange: true,
            runOnHeightChange: false,
            priority: Number.MAX_VALUE,
            ...options // Merge options
        });
    }

    // Class to manage the menu display between horizontal and hamburger styles
    class MenuManager {
        constructor() {
            // Cache the relevant DOM elements for the menu
            this.menuButton = document.getElementById("menuButton");
            this.verticalMenu = document.getElementById("verticalMenu");
            this.horizontalMenu = document.getElementById("horizontalMenu");
            this.menuToggleCheckbox = document.getElementById("menuToggle");
            this.horizontalMenuWidth = this.horizontalMenu.clientWidth;
        }

        // Show the hamburger menu (vertical)
        showHamburgerMenu() {
            this.menuButton.style.display = "flex";
            this.verticalMenu.style.display = "block";
            this.horizontalMenu.style.display = "none";
            this.horizontalMenu.style.visibility = "hidden";
        }

        // Show the horizontal menu
        showHorizontalMenu() {
            this.menuButton.style.display = "none";
            this.verticalMenu.style.display = "none";
            this.horizontalMenu.style.display = "flex";
            this.horizontalMenu.style.visibility = "visible";
        }
    }

    // Main logic to control menu visibility based on window width
    executeWhenReady(() => {
        // Check if the horizontal menu is present in the DOM
        if (document.getElementById("horizontalMenu") == null) return;
        
        // Instantiate the MenuManager
        const menuManager = new MenuManager();

        // Add a hashchange event listener to reset menu toggle state
        window.addEventListener("hashchange", () => {
            menuManager.menuToggleCheckbox.checked = false;
        });

        // Setup a debounced resize handler for adjusting menu visibility
        setupDebouncedResizeHandler(() => {
            function adjustMenuDisplay(menuManager) {
                const currentBodyWidth = document.body.clientWidth;
                // Toggle menu styles based on available width
                if (menuManager.horizontalMenuWidth > currentBodyWidth) {
                    menuManager.showHamburgerMenu();
                } else {
                    menuManager.showHorizontalMenu();
                }
            }
            adjustMenuDisplay(menuManager);
        }, {
            runOnLoad: true // Run immediately on page load
        });
    });

})();
