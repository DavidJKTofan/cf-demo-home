/**
 * Utility functions for the demo page
 */

/**
 * Fetch JSON data from a file with retry mechanism
 * @param {string} url - Path to the JSON file
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Promise<any>} - Promise containing the parsed JSON data
 */
async function fetchData(url, retries = 3) {
  let currentRetry = 0;

  while (currentRetry < retries) {
    try {
      // For local development, handle file:// protocol
      if (window.location.protocol === "file:") {
        // Adjust path for local file access
        const adjustedUrl = url;//.replace(/^data\//, "");
        console.log(`Adjusting URL for local development: ${adjustedUrl}`);
        const response = await fetch(adjustedUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
      } else {
        // Normal fetch for http/https
        const response = await fetch(url, {
          cache: "no-cache", // Prevent caching during development
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
      }
    } catch (error) {
      currentRetry++;
      console.warn(
        `Attempt ${currentRetry}/${retries} failed for ${url}:`,
        error
      );

      if (currentRetry === retries) {
        console.error(
          `Failed to fetch ${url} after ${retries} attempts:`,
          error
        );
        // Show user-friendly error
        showError(`Unable to load data from ${url.split("/").pop()}`);
        return [];
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * Math.pow(2, currentRetry))
      );
    }
  }
}

/**
 * Display user-friendly error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const errorElement = createElement(
    "div",
    {
      className: "no-results",
    },
    `<p>Error: ${message}</p><p>Try refreshing the page or check your connection.</p>`
  );

  const demoGrid = document.getElementById("demoGrid");
  if (demoGrid) {
    demoGrid.innerHTML = "";
    demoGrid.appendChild(errorElement);
  }

  // Hide loading indicator if visible
  const loadingIndicator = document.getElementById("loadingIndicator");
  if (loadingIndicator) {
    loadingIndicator.style.display = "none";
  }
}

/**
 * Create a DOM element with optional attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Object containing attributes to set
 * @param {string|HTMLElement|Array<HTMLElement>} content - Content to append
 * @returns {HTMLElement} - The created element
 */
function createElement(tag, attributes = {}, content = null) {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "textContent") {
      element.textContent = value;
    } else if (key.startsWith("data-")) {
      // Handle data attributes properly
      element.setAttribute(key, value);
    } else if (key.startsWith("aria-") || key === "role") {
      // Handle ARIA attributes
      element.setAttribute(key, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Add content
  if (content) {
    if (typeof content === "string") {
      element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach((item) => {
        if (item instanceof HTMLElement) {
          element.appendChild(item);
        }
      });
    }
  }

  return element;
}

/**
 * Convert a string to kebab-case (for IDs)
 * @param {string} str - The string to convert
 * @returns {string} - The kebab-cased string
 */
function toKebabCase(str) {
  return str
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait between calls
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Add skeleton loading cards to the demo grid
 * @param {string} containerId - ID of the container element
 * @param {number} count - Number of skeleton cards to add
 */
function addSkeletonCards(containerId = "demoGrid", count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const labelElements = [];
    for (let j = 0; j < 2; j++) {
      labelElements.push(createElement("div", { className: "skeleton-label" }));
    }

    const labelsContainer = createElement(
      "div",
      { className: "skeleton-labels" },
      labelElements
    );

    const cardContent = createElement(
      "div",
      { className: "skeleton-content" },
      [
        createElement("div", { className: "skeleton-title" }),
        createElement("div", { className: "skeleton-description" }),
        createElement("div", { className: "skeleton-category" }),
        labelsContainer,
      ]
    );

    const card = createElement(
      "div",
      { className: "skeleton-card" },
      cardContent
    );
    container.appendChild(card);
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback method
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error("Failed to copy text:", error);
    return false;
  }
}
