// This IIFE (Immediately Invoked Function Expression) initializes an animation manager for elements
// that become visible within the viewport, loading necessary resources like images, videos, and fonts.
(function() {
    "use strict"; // Enforce strict mode for cleaner and more secure JavaScript code.

    // Class to manage callbacks that need to run once the DOM is fully loaded.
    class DOMContentLoadedManager {
        constructor() {
            // Array to store callback objects with callback functions and priority.
            this.callbacks = [];

            // Event listener for the 'DOMContentLoaded' event to trigger the callback execution.
            window.addEventListener("DOMContentLoaded", () => this.onDOMContentLoaded());
        }

        // Method to execute registered callbacks in order of priority when the DOM is loaded.
        onDOMContentLoaded() {
            // Sort callbacks based on priority and execute each callback.
            this.callbacks.sort((firstCallback, secondCallback) => firstCallback.priority - secondCallback.priority)
                .forEach(({ callback }) => callback());
        }

        // Method to run callbacks immediately or store them for later execution based on the document state.
        runOnLoad(callbackObject) {
            if (document.readyState === "loading") {
                // If the document is still loading, push the callbackObject to the callbacks array.
                this.callbacks.push(callbackObject);
            } else {
                // If the document is already loaded, execute the callback immediately.
                callbackObject.callback();
            }
        }
    }

    // Function to prepare and start animations for a given HTML element.
    const startAnimationForElement = async (element) => {
        const isAnimated = element.classList.contains("animated"); // Check if the element has the "animated" class.
        
        // Function to request an animation frame and set the animation state to "running".
        const requestAnimationFrameAndStart = () => window.requestAnimationFrame(() => {
            element.style.animationPlayState = "running";
        });

        // Determine if the element has dependencies (images, videos, etc.) and start animations accordingly.
        if (isAnimated && hasDependencies(element)) {
            await loadElementResources(element); // Load all required resources before starting animation.
            requestAnimationFrameAndStart(); // Start the animation.
        } else if (isAnimated) {
            requestAnimationFrameAndStart(); // Start the animation immediately.
        } else if (element.firstElementChild != null) {
            startAnimationForElement(element.firstElementChild); // Recursively check the first child element.
        }
    };

    // Function to check if the element requires loading of images, videos, or has text content.
    const hasDependencies = (element) => {
        const hasImages = element.getElementsByTagName("img").length > 0; // Check for <img> tags.
        const hasVideos = element.getElementsByTagName("video").length > 0; // Check for <video> tags.
        return hasTextContent(element) || hasImages || hasVideos; // Return true if any dependencies are found.
    };

    // Function to check if the element has any non-empty text content.
    const hasTextContent = (element) => {
        let textContent = element.textContent;
        return !!(textContent !== null && textContent !== undefined && textContent.trim().length);
    };

    // Function to load all resources (images, videos, fonts) required by an element before animation.
    const loadElementResources = async (element) => {
        const loadingPromises = []; // Array to store promises for resource loading.

        // Load all <img> elements within the element and store promises.
        const images = element.getElementsByTagName("img");
        for (let i = 0; i < images.length; i++) {
            const img = images.item(i);
            loadingPromises.push(loadImage(img));
        }

        // Load all <video> elements within the element and store promises.
        const videos = element.getElementsByTagName("video");
        for (let i = 0; i < videos.length; i++) {
            const video = videos.item(i);
            loadingPromises.push(loadVideo(video));
        }

        // Prepare font loading promises for all <span> elements with specific fonts.
        const loadedFonts = new Map(); // Map to store loaded fonts.
        document.fonts.forEach((font) => {
            loadedFonts.set(`${font.family}_${font.style}_${font.weight}`, font);
        });

        const spans = element.getElementsByTagName("span");
        for (let i = 0; i < spans.length; i++) {
            const span = spans.item(i);
            loadingPromises.push(loadFonts(span, loadedFonts));
        }

        return Promise.all(loadingPromises); // Wait for all resources to be loaded.
    };

    // Function to create a promise that resolves when an image is loaded or rejects on error.
    const loadImage = (image) => new Promise((resolve, reject) => {
        if (image.complete) {
            resolve(); // If the image is already loaded, resolve the promise immediately.
        } else {
            image.loading = "eager"; // Set image loading to eager for faster loading.
            image.addEventListener("load", () => resolve()); // Resolve when image is loaded.
            image.addEventListener("error", () => reject()); // Reject on error.
        }
    });

    // Function to create a promise that resolves when a video is ready or rejects on error.
    const loadVideo = (video) => new Promise((resolve, reject) => {
        if (video.readyState >= 2 || video.poster) {
            resolve(); // If video is already ready or has a poster, resolve immediately.
        } else {
            video.addEventListener("loadeddata", () => resolve()); // Resolve when video data is loaded.
            video.addEventListener("error", () => reject()); // Reject on error.
        }
    });

    // Function to check if a specific font is loaded for a given span element.
    const loadFonts = (span, loadedFontsMap) => {
        const { fontFamily, fontStyle, fontWeight } = getComputedStyle(span); // Get the computed styles of the span.
        const fontKey = `${fontFamily}_${fontStyle}_${fontWeight}`; // Create a unique key for the font.
        const font = loadedFontsMap.get(fontKey); // Get the font from the map.

        // Return a promise that resolves when the font is loaded.
        return (font?.loaded || document.fonts.ready);
    };

    // Function to initialize the animation setup on DOM load.
    (function(registerCallback, priority = Number.MAX_VALUE) {
        let existingScriptExecutor;

        // Retrieve or initialize the global script executor for managing animations.
        window.canva_scriptExecutor = (existingScriptExecutor = window.canva_scriptExecutor ?? new DOMContentLoadedManager());

        // Register the callback with priority for execution when the DOM is loaded.
        existingScriptExecutor.runOnLoad({
            callback: registerCallback,
            priority: priority
        });

    })(() => {
        // This anonymous function is executed when the DOM is fully loaded.

        // Function to observe and animate elements as they enter the viewport.
        const observeAndAnimate = () => {
            const animationContainers = document.querySelectorAll(".animation_container");

            if (animationContainers.length === 0) return; // Exit if no animation containers are found.

            // Create an IntersectionObserver to track when elements become visible in the viewport.
            const intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return; // Skip elements that are not intersecting the viewport.

                    const targetElement = entry.target;
                    startAnimationForElement(targetElement); // Start animation for the visible element.
                    intersectionObserver.unobserve(targetElement); // Stop observing the element after animation.
                });
            }, {
                threshold: 0.01 // Threshold for the observer to trigger when 1% of the element is visible.
            });

            // Observe each animation container element.
            animationContainers.forEach((container) => intersectionObserver.observe(container));
        };

        observeAndAnimate(); // Execute the observe and animate function.
    });
})();
