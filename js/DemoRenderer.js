/**
 * Class to handle rendering demo cards with enhanced performance and accessibility
 */
class DemoRenderer {
  /**
   * Create a new DemoRenderer instance
   * @param {string} containerId - ID of the container element for demo cards
   */
  constructor(containerId = "demoGrid") {
    this.container = document.getElementById(containerId);
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.demos = [];
    this.observer = null;
    this.currentFilters = {
      search: "",
      categories: [],
      labels: [],
    };
    this.initIntersectionObserver();
    this.isLoading = false;

    // Add performance tracking
    this.performanceMetrics = {
      filterOperations: 0,
      averageFilterTime: 0,
      totalFilterTime: 0
    };
  }

  /**
   * Initialize with demo data
   * @param {Array} demos - Array of demo objects
   */
  init(demos) {
    if (!Array.isArray(demos)) {
      console.error("DemoRenderer: Invalid demos data provided");
      this.demos = [];
    } else {
      this.demos = demos;
    }

    // Hide loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = "none";
    }

  }

  /**
   * Initialize intersection observer for lazy loading
   */
  initIntersectionObserver() {
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const card = entry.target;

              // Animate card entrance
              card.style.opacity = "1";
              card.style.transform = "translateY(0)";

              // Unobserve after animation
              this.observer.unobserve(card);

              // Load any deferred resources in the card if needed
              const deferredElements = card.querySelectorAll("[data-src]");
              deferredElements.forEach((el) => {
                el.src = el.getAttribute("data-src");
                el.removeAttribute("data-src");
              });
            }
          });
        },
        {
          root: null,
          rootMargin: "20px",
          threshold: 0.1,
        }
      );
    }
  }

  /**
   * Create a demo card element
   * @param {Object} demo - Demo data object
   * @returns {HTMLElement} - The demo card element
   */
  createDemoCard(demo) {
    // Create labels HTML
    const labelsElements = demo.labels.map((label) =>
      createElement("span", {
        className: "demo-label",
        textContent: label,
      })
    );

    const labelsContainer = createElement(
      "div",
      { className: "demo-labels" },
      labelsElements
    );

    // Create category element
    const categoryElement = createElement("span", {
      className: "demo-category",
      textContent: demo.category,
    });

    // Create meta container
    const metaContainer = createElement("div", { className: "demo-meta" }, [
      categoryElement,
      labelsContainer,
    ]);

    // Create content elements
    const titleElement = createElement("h3", {
      className: "demo-title",
      textContent: demo.title,
    });

    const descriptionElement = createElement("p", {
      className: "demo-description",
      textContent: demo.description,
    });

    // Create copy link button
    const copyLinkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;

    const tooltipElement = createElement("span", {
      className: "tooltip",
      textContent: "Copy link",
      role: "tooltip",
      id: `tooltip-${demo.id}`,
    });

    const copyLinkBtn = createElement("button", {
      className: "copy-link-btn",
      type: "button",
      "aria-label": "Copy link to this demo",
      "data-url": demo.url,
      "aria-describedby": `tooltip-${demo.id}`,
    });

    copyLinkBtn.innerHTML = copyLinkSvg;
    copyLinkBtn.appendChild(tooltipElement);

    copyLinkBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const success = copyToClipboard(demo.url);
      tooltipElement.textContent = success ? "Copied!" : "Failed to copy";

      setTimeout(() => {
        tooltipElement.textContent = "Copy link";
      }, 3000);
    });

    // Create content container
    const contentContainer = createElement(
      "div",
      { className: "demo-content" },
      [titleElement, descriptionElement, metaContainer]
    );

    // Create card
    const card = createElement(
      "a",
      {
        className: "demo-card",
        href: demo.url,
        target: "_blank",
        rel: "noopener noreferrer",
        "data-id": demo.id,
        "data-category": demo.category,
        "data-labels": demo.labels.join(","),
        "aria-label": `${demo.title} - ${demo.description}`,
        style: "opacity: 0; transform: translateY(20px);", // Start with opacity 0 for animation
      },
      [contentContainer, copyLinkBtn]
    );

    // Add transition for animation
    card.style.transition = "opacity 0.3s ease, transform 0.3s ease";

    // Observe the card if we have an observer
    if (this.observer) {
      this.observer.observe(card);
    } else {
      // No observer support, just show the card
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 10);
    }

    return card;
  }

  /**
   * Show skeleton loading state
   * @param {number} count - Number of skeleton cards to show
   */
  showLoading(count = 6) {
    if (this.container) {
      addSkeletonCards(this.container.id, count);
    }
  }

  /**
   * Track performance of operations
   * @private
   * @param {Function} operation - Operation to measure
   * @returns {*} - Operation result
   */
  _trackPerformance(operation) {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;

      // Update metrics
      this.performanceMetrics.filterOperations++;
      this.performanceMetrics.totalFilterTime += duration;
      this.performanceMetrics.averageFilterTime = 
        this.performanceMetrics.totalFilterTime / this.performanceMetrics.filterOperations;

      // Log if operation takes too long
      if (duration > 100) {
        console.warn(`Slow operation (${duration.toFixed(2)}ms)`);
      }

      return result;
    } catch (error) {
      console.error('Performance tracking error:', error);
      throw error;
    }
  }

  /**
   * Render demos based on filters
   * @param {string} searchText - Text to search for
   * @param {Array} categories - Active category filters
   * @param {Array} labels - Active label filters
   */
  async renderDemos(searchText = "", categories = [], labels = []) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      
      // Show loading state
      this.container.innerHTML = "";
      this.showLoading();

      // Store current filters
      this.currentFilters = {
        search: searchText,
        categories: categories,
        labels: labels
      };

      // Filter demos synchronously
      const filteredDemos = this._trackPerformance(() => 
        this.filterDemos(searchText, categories, labels)
      );

      // Clear loading state
      this.container.innerHTML = "";

      if (!Array.isArray(filteredDemos) || filteredDemos.length === 0) {
        this._showNoResults(searchText);
        return;
      }

      // Create and append demo cards
      filteredDemos.forEach(demo => {
        const card = this.createDemoCard(demo);
        this.container.appendChild(card);
      });

    } catch (error) {
      console.error('Error rendering demos:', error);
      this._showError();
    } finally {
      this.isLoading = false;
    }
  }

  _showNoResults(searchText) {
    const searchTerms = searchText ? `"${searchText}"` : "";
    const noResultsElement = createElement(
      "div",
      {
        className: "no-results",
        "aria-live": "polite",
      },
      `<p>No demos match your filters ${searchTerms}.</p>
       <p>Try adjusting your search criteria or <button class="text-button" id="clearFiltersInline">clear all filters</button>.</p>`
    );

    this.container.appendChild(noResultsElement);

    // Add event listener to the inline clear filters button
    const clearFiltersBtn = document.getElementById("clearFiltersInline");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        document.getElementById("clearFilters").click();
      });
    }
  }

  _showError() {
    const errorElement = createElement(
      "div",
      {
        className: "error-message",
        "aria-live": "assertive",
      },
      `<p>There was an error loading the demos. Please try refreshing the page.</p>`
    );

    this.container.appendChild(errorElement);
  }

  /**
   * Filter demos based on criteria
   * @param {string} searchText - Text to search for
   * @param {Array} categories - Active category filters
   * @param {Array} labels - Active label filters
   * @returns {Array} - Filtered array of demos
   */
  filterDemos(searchText = "", categories = [], labels = []) {
    const normalizedSearch = searchText.toLowerCase().trim();

    return this.demos.filter((demo) => {
      // Apply search filter with improved matching
      const matchesSearch =
        normalizedSearch === "" ||
        demo.title.toLowerCase().includes(normalizedSearch) ||
        demo.description.toLowerCase().includes(normalizedSearch) ||
        demo.category.toLowerCase().includes(normalizedSearch) ||
        demo.labels.some((label) =>
          label.toLowerCase().includes(normalizedSearch)
        );

      // Apply category filter
      const matchesCategory =
        categories.length === 0 || categories.includes(demo.category);

      // Apply label filter with more flexible matching
      const matchesLabel =
        labels.length === 0 ||
        demo.labels.some((label) => labels.includes(label));

      return matchesSearch && matchesCategory && matchesLabel;
    });
  }

  /**
   * Sort demos by the specified criteria
   * @param {string} sortCriteria - Property to sort by ('title', 'category', etc.)
   * @param {boolean} ascending - Whether to sort in ascending order
   */
  sortDemos(sortCriteria = "title", ascending = true) {
    const sortedDemos = [...this.demos].sort((a, b) => {
      let valueA = a[sortCriteria];
      let valueB = b[sortCriteria];

      // Handle special cases
      if (sortCriteria === "labels") {
        valueA = a.labels[0] || "";
        valueB = b.labels[0] || "";
      }

      // String comparison
      if (typeof valueA === "string" && typeof valueB === "string") {
        return ascending
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Numeric comparison
      return ascending ? valueA - valueB : valueB - valueA;
    });

    this.demos = sortedDemos;

    // Re-render with current filters
    this.renderDemos(
      this.currentFilters.search,
      this.currentFilters.categories,
      this.currentFilters.labels
    );
  }

  /**
   * Refresh the demos data from the server
   * @param {string} url - URL to fetch the data from
   * @returns {Promise<void>}
   */
  async refreshData(url = "data/demos.json") {
    try {
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = "flex";
      }

      const demos = await fetchData(url);
      this.init(demos);

      // Re-render with existing filters
      this.renderDemos(
        this.currentFilters.search,
        this.currentFilters.categories,
        this.currentFilters.labels
      );

      return true;
    } catch (error) {
      console.error("Failed to refresh demo data:", error);
      return false;
    } finally {
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = "none";
      }
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Current performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
}
