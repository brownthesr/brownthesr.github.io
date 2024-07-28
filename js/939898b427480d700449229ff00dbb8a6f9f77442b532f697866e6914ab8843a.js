(function() {
    "use strict";

    // Get all image elements on the page
    const images = Array.from(document.getElementsByTagName("img"));

    // Function to stop animation on the parent of a given image
    const stopParentAnimation = (img) => {
        const parent = img.parentElement;
        if (parent) {
            parent.style.animation = "none";
        }
    };

    // Loop through each image element
    images.forEach((img) => {
        if (img.complete) {
            // If the image is already loaded, stop the parent's animation
            stopParentAnimation(img);
        } else {
            // Otherwise, add a load event listener to stop the animation once loaded
            img.addEventListener("load", () => {
                stopParentAnimation(img);
            });
        }
    });
})();
