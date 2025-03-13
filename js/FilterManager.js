/**
 * Class to manage filters functionality for demo filtering
 * Handles category and label filtering, search functionality, and filter state
 */
class FilterManager {
  /**
   * Create a new FilterManager instance
   * @param {Object} config - Configuration object
   * @param {string} [config.searchInputId='searchInput'] - ID of search input element
   * @param {string} [config.categoryBtnId='categoryFilterBtn'] - ID of category filter button
   * @param {string} [config.categoryContentId='categoryFilterContent'] - ID of category filter content
   * @param {string} [config.labelBtnId='labelFilterBtn'] - ID of label filter button
   * @param {string} [config.labelContentId='labelFilterContent'] - ID of label filter content
   * @param {string} [config.clearBtnId='clearFilters'] - ID of clear filters button
   * @param {Function} [config.onFilterChange] - Callback when filters change
   */
  constructor(config) {
    // DOM elements
    this.searchInput = document.getElementById(
      config.searchInputId || "searchInput"
    );
    this.categoryBtn = document.getElementById(
      config.categoryBtnId || "categoryFilterBtn"
    );
    this.categoryContent = document.getElementById(
      config.categoryContentId || "categoryFilterContent"
    );
    this.labelBtn = document.getElementById(
      config.labelBtnId || "labelFilterBtn"
    );
    this.labelContent = document.getElementById(
      config.labelContentId || "labelFilterContent"
    );
    this.clearBtn = document.getElementById(
      config.clearBtnId || "clearFilters"
    );

    // Filter state
    this.activeSearch = "";
    this.activeCategories = [];
    this.activeLabels = [];

    // Callback function when filters change
    this.onFilterChange = config.onFilterChange || (() => {});

    // Data
    this.categories = [];
    this.labels = [];

    // Debounce search for performance
    this.debouncedSearch = debounce((value) => {
      this.activeSearch = value;
      this.notifyFilterChange();
    }, 300);

    // Ensure context is maintained for methods
    this._handleSearchInput = this._handleSearchInput.bind(this);
    this._handleCategoryToggle = this._handleCategoryToggle.bind(this);
    this._handleLabelToggle = this._handleLabelToggle.bind(this);
    this._handleCategoryChange = this._handleCategoryChange.bind(this);
    this._handleLabelChange = this._handleLabelChange.bind(this);
    this._handleClearFilters = this._handleClearFilters.bind(this);
    this._handleClickOutside = this._handleClickOutside.bind(this);
  }

  /**
   * Initialize with filter data
   * @param {Array} categories - Available categories
   * @param {Array} labels - Available labels
   */
  init(categories, labels) {
    this.categories = categories || [];
    this.labels = labels || [];

    // Check if DOM elements exist
    if (!this.validateDomElements()) {
      console.error("FilterManager: Required DOM elements not found");
      return;
    }

    this.setupFilters();
    this.setupEventListeners();

    // Apply filters from URL if present
    this.applyFiltersFromUrl();
  }

  /**
   * Validate that all required DOM elements exist
   * @returns {boolean} - Whether all elements exist
   */
  validateDomElements() {
    return (
      this.searchInput &&
      this.categoryBtn &&
      this.categoryContent &&
      this.labelBtn &&
      this.labelContent &&
      this.clearBtn
    );
  }

  /**
   * Setup filter dropdowns
   */
  setupFilters() {
    // Build category filter checkboxes
    this.categoryContent.innerHTML = "";
    this.categories.forEach((category) => {
      const categoryId = `category-${toKebabCase(category)}`;

      const checkboxItem = createElement(
        "div",
        {
          className: "checkbox-item",
          role: "menuitem",
          tabindex: "0",
        },
        `
        <input 
          type="checkbox" 
          id="${categoryId}" 
          value="${category}" 
          ${this.activeCategories.includes(category) ? "checked" : ""}
          aria-checked="${this.activeCategories.includes(category)}"
        >
        <label for="${categoryId}">${category}</label>
      `
      );

      // Add keyboard support
      checkboxItem.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const checkbox = checkboxItem.querySelector("input");
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      this.categoryContent.appendChild(checkboxItem);
    });

    // Build label filter checkboxes
    this.labelContent.innerHTML = "";
    this.labels.forEach((label) => {
      const labelId = `label-${toKebabCase(label)}`;

      const checkboxItem = createElement(
        "div",
        {
          className: "checkbox-item",
          role: "menuitem",
          tabindex: "0",
        },
        `
        <input 
          type="checkbox" 
          id="${labelId}" 
          value="${label}" 
          ${this.activeLabels.includes(label) ? "checked" : ""}
          aria-checked="${this.activeLabels.includes(label)}"
        >
        <label for="${labelId}">${label}</label>
      `
      );

      // Add keyboard support
      checkboxItem.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const checkbox = checkboxItem.querySelector("input");
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      this.labelContent.appendChild(checkboxItem);
    });

    // Update button text to reflect active filters
    this.updateCategoryFilterText();
    this.updateLabelFilterText();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search input
    this.searchInput.addEventListener("input", this._handleSearchInput);

    // Category filter dropdown toggle
    this.categoryBtn.addEventListener("click", this._handleCategoryToggle);

    // Label filter dropdown toggle
    this.labelBtn.addEventListener("click", this._handleLabelToggle);

    // Category filter changes
    this.categoryContent.addEventListener("change", this._handleCategoryChange);

    // Label filter changes
    this.labelContent.addEventListener("change", this._handleLabelChange);

    // Clear filters
    this.clearBtn.addEventListener("click", this._handleClearFilters);

    // Close dropdowns when clicking outside
    document.addEventListener("click", this._handleClickOutside);

    // Keyboard accessibility for dropdown buttons
    this.categoryBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._handleCategoryToggle();
      }
    });

    this.labelBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._handleLabelToggle();
      }
    });

    // Handle Escape key to close dropdowns
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.categoryContent.classList.remove("show");
        this.labelContent.classList.remove("show");

        // Update ARIA attributes
        this.categoryBtn.setAttribute("aria-expanded", "false");
        this.labelBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /**
   * Handle search input
   * @private
   * @param {Event} e - Input event
   */
  _handleSearchInput(e) {
    this.debouncedSearch(e.target.value);
  }

  /**
   * Handle category dropdown toggle
   * @private
   */
  _handleCategoryToggle() {
    const isExpanded = this.categoryContent.classList.toggle("show");
    this.categoryBtn.setAttribute(
      "aria-expanded",
      isExpanded ? "true" : "false"
    );

    // Close other dropdown if open
    this.labelContent.classList.remove("show");
    this.labelBtn.setAttribute("aria-expanded", "false");
  }

  /**
   * Handle label dropdown toggle
   * @private
   */
  _handleLabelToggle() {
    const isExpanded = this.labelContent.classList.toggle("show");
    this.labelBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");

    // Close other dropdown if open
    this.categoryContent.classList.remove("show");
    this.categoryBtn.setAttribute("aria-expanded", "false");
  }

  /**
   * Handle category filter changes
   * @private
   * @param {Event} e - Change event
   */
  _handleCategoryChange(e) {
    if (e.target.type === "checkbox") {
      if (e.target.checked) {
        this.activeCategories.push(e.target.value);
        e.target.setAttribute("aria-checked", "true");
      } else {
        this.activeCategories = this.activeCategories.filter(
          (cat) => cat !== e.target.value
        );
        e.target.setAttribute("aria-checked", "false");
      }
      this.updateCategoryFilterText();
      this.updateUrlParams();
      this.notifyFilterChange();
    }
  }

  /**
   * Handle label filter changes
   * @private
   * @param {Event} e - Change event
   */
  _handleLabelChange(e) {
    if (e.target.type === "checkbox") {
      if (e.target.checked) {
        this.activeLabels.push(e.target.value);
        e.target.setAttribute("aria-checked", "true");
      } else {
        this.activeLabels = this.activeLabels.filter(
          (label) => label !== e.target.value
        );
        e.target.setAttribute("aria-checked", "false");
      }
      this.updateLabelFilterText();
      this.updateUrlParams();
      this.notifyFilterChange();
    }
  }

  /**
   * Handle clear filters button
   * @private
   */
  _handleClearFilters() {
    this.activeSearch = "";
    this.activeCategories = [];
    this.activeLabels = [];
    this.searchInput.value = "";

    // Uncheck all filter checkboxes
    document
      .querySelectorAll('.dropdown-content input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.setAttribute("aria-checked", "false");
      });

    // Reset dropdown button text
    this.updateCategoryFilterText();
    this.updateLabelFilterText();

    // Update URL params
    this.updateUrlParams();
    this.notifyFilterChange();
  }

  /**
   * Handle clicks outside the dropdowns
   * @private
   * @param {Event} e - Click event
   */
  _handleClickOutside(e) {
    if (
      !this.categoryBtn.contains(e.target) &&
      !this.categoryContent.contains(e.target)
    ) {
      this.categoryContent.classList.remove("show");
      this.categoryBtn.setAttribute("aria-expanded", "false");
    }

    if (
      !this.labelBtn.contains(e.target) &&
      !this.labelContent.contains(e.target)
    ) {
      this.labelContent.classList.remove("show");
      this.labelBtn.setAttribute("aria-expanded", "false");
    }
  }

  /**
   * Update category filter button text
   */
  updateCategoryFilterText() {
    if (this.activeCategories.length === 0) {
      this.categoryBtn.textContent = "Filter by Category";
    } else if (this.activeCategories.length === 1) {
      this.categoryBtn.textContent = this.activeCategories[0];
    } else {
      this.categoryBtn.textContent = `${this.activeCategories.length} Categories`;
    }
  }

  /**
   * Update label filter button text
   */
  updateLabelFilterText() {
    if (this.activeLabels.length === 0) {
      this.labelBtn.textContent = "Filter by Label";
    } else if (this.activeLabels.length === 1) {
      this.labelBtn.textContent = this.activeLabels[0];
    } else {
      this.labelBtn.textContent = `${this.activeLabels.length} Labels`;
    }
  }

  /**
   * Update URL parameters based on active filters
   */
  updateUrlParams() {
    if (!window.history || !window.URLSearchParams) return;

    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);

    // Clear existing filter params
    params.delete("search");
    params.delete("category");
    params.delete("label");

    // Add current filter values
    if (this.activeSearch) {
      params.set("search", this.activeSearch);
    }

    this.activeCategories.forEach((category) => {
      params.append("category", category);
    });

    this.activeLabels.forEach((label) => {
      params.append("label", label);
    });

    // Update URL without reloading page
    window.history.replaceState({}, "", `${url.pathname}?${params}`);
  }

  /**
   * Apply filters from URL parameters
   */
  applyFiltersFromUrl() {
    if (!window.URLSearchParams) return;

    const params = new URLSearchParams(window.location.search);

    // Get search parameter
    const search = params.get("search");
    if (search) {
      this.activeSearch = search;
      this.searchInput.value = search;
    }

    // Get category parameters
    const categories = params.getAll("category");
    if (categories.length > 0) {
      this.activeCategories = categories;

      // Check corresponding checkboxes
      categories.forEach((category) => {
        const checkbox = document.getElementById(
          `category-${toKebabCase(category)}`
        );
        if (checkbox) {
          checkbox.checked = true;
          checkbox.setAttribute("aria-checked", "true");
        }
      });

      this.updateCategoryFilterText();
    }

    // Get label parameters
    const labels = params.getAll("label");
    if (labels.length > 0) {
      this.activeLabels = labels;

      // Check corresponding checkboxes
      labels.forEach((label) => {
        const checkbox = document.getElementById(`label-${toKebabCase(label)}`);
        if (checkbox) {
          checkbox.checked = true;
          checkbox.setAttribute("aria-checked", "true");
        }
      });

      this.updateLabelFilterText();
    }

    // If any filters are active, apply them
    if (search || categories.length > 0 || labels.length > 0) {
      this.notifyFilterChange();
    }
  }

  /**
   * Call the filter change callback
   */
  notifyFilterChange() {
    this.onFilterChange(
      this.activeSearch,
      this.activeCategories,
      this.activeLabels
    );
  }

  /**
   * Get current filter state
   * @returns {Object} - Current filter state
   */
  getFilterState() {
    return {
      search: this.activeSearch,
      categories: this.activeCategories,
      labels: this.activeLabels,
    };
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    this.activeSearch = "";
    this.activeCategories = [];
    this.activeLabels = [];
    this.searchInput.value = "";
    this.updateCategoryFilterText();
    this.updateLabelFilterText();
    this.setupFilters();
    this.updateUrlParams();
    this.notifyFilterChange();
  }
}
