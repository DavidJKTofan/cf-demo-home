import { createElement, toKebabCase, debounce } from './utils.js';

/**
 * Class to manage filters functionality for demo filtering
 * Handles category and label filtering, search functionality, and filter state
 */
export class FilterManager {
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

    // Add new state tracking for active dropdowns
    this.activeDropdown = null;
    
    // Add keyboard navigation state
    this.currentFocusIndex = -1;

    // Initialize filters from URL immediately
    this.initialFiltersApplied = false;

    // Add initial state support
    if (config.initialState) {
      this.activeSearch = config.initialState.search || "";
      this.activeCategories = config.initialState.categories || [];
      this.activeLabels = config.initialState.labels || [];
    }

    // Add state tracking
    this.isInitialized = false;
  }

  /**
   * Initialize with filter data
   * @param {Array} categories - Available categories
   * @param {Array} labels - Available labels
   */
  async init(categories, labels) {
    this.categories = categories || [];
    this.labels = labels || [];

    if (!this.validateDomElements()) {
      console.error("FilterManager: Required DOM elements not found");
      return;
    }

    // Setup UI with current state
    await this.setupFilters();
    this.setupEventListeners();
    
    // Mark as initialized
    this.isInitialized = true;

    // Update UI to reflect current state
    this.updateCategoryFilterText();
    this.updateLabelFilterText();
    if (this.activeSearch) {
      this.searchInput.value = this.activeSearch;
    }
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
    // Sort categories and labels alphabetically
    const sortedCategories = [...this.categories].sort((a, b) => a.localeCompare(b));
    const sortedLabels = [...this.labels].sort((a, b) => a.localeCompare(b));

    // Build category filter checkboxes
    this.categoryContent.innerHTML = "";
    sortedCategories.forEach((category) => {
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
    sortedLabels.forEach((label) => {
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

    // Add menu container with improved scrolling and positioning
    this.categoryContent.classList.add('dropdown-menu');
    this.labelContent.classList.add('dropdown-menu');

    // Enhance checkbox items with better interaction
    const checkboxItems = this.categoryContent.querySelectorAll('.checkbox-item');
    checkboxItems.forEach((item, index) => {
      item.setAttribute('data-index', index);
      
      // Add hover effect class
      item.addEventListener('mouseenter', () => {
        item.classList.add('checkbox-item-hover');
      });
      
      item.addEventListener('mouseleave', () => {
        item.classList.remove('checkbox-item-hover');
      });
    });

    // Add scroll indicators if content overflows
    this._addScrollIndicators(this.categoryContent);
    this._addScrollIndicators(this.labelContent);

    // Check corresponding checkboxes based on active filters
    this.activeCategories.forEach(category => {
      const checkbox = this.categoryContent.querySelector(`input[value="${category}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.setAttribute('aria-checked', 'true');
      }
    });

    this.activeLabels.forEach(label => {
      const checkbox = this.labelContent.querySelector(`input[value="${label}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.setAttribute('aria-checked', 'true');
      }
    });
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

    // Add popstate event listener for browser navigation
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.filters) {
        // Restore filters from state
        const { search, categories, labels } = event.state.filters;
        this.activeSearch = search;
        this.activeCategories = categories;
        this.activeLabels = labels;
        
        // Update UI
        this.searchInput.value = search;
        this.setupFilters();
        this.updateCategoryFilterText();
        this.updateLabelFilterText();
        
        // Apply filters
        this.notifyFilterChange();
      } else {
        // No state, reset filters
        this.resetFilters();
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
    // Close other dropdown if open
    if (this.labelContent.classList.contains('show')) {
      this.labelContent.classList.remove('show');
      this.labelBtn.setAttribute('aria-expanded', 'false');
    }

    const isExpanded = !this.categoryContent.classList.contains('show');
    this.categoryContent.classList.toggle('show');
    this.categoryBtn.setAttribute('aria-expanded', isExpanded);

    if (isExpanded) {
      // Position the dropdown
      const buttonRect = this.categoryBtn.getBoundingClientRect();
      this.categoryContent.style.top = `${buttonRect.bottom + window.scrollY}px`;
      this.categoryContent.style.left = `${buttonRect.left + window.scrollX}px`;
      this.categoryContent.style.width = `${buttonRect.width}px`;
    }
  }

  /**
   * Handle label dropdown toggle
   * @private
   */
  _handleLabelToggle() {
    // Close other dropdown if open
    if (this.categoryContent.classList.contains('show')) {
      this.categoryContent.classList.remove('show');
      this.categoryBtn.setAttribute('aria-expanded', 'false');
    }

    const isExpanded = !this.labelContent.classList.contains('show');
    this.labelContent.classList.toggle('show');
    this.labelBtn.setAttribute('aria-expanded', isExpanded);

    if (isExpanded) {
      // Position the dropdown
      const buttonRect = this.labelBtn.getBoundingClientRect();
      this.labelContent.style.top = `${buttonRect.bottom + window.scrollY}px`;
      this.labelContent.style.left = `${buttonRect.left + window.scrollX}px`;
      this.labelContent.style.width = `${buttonRect.width}px`;
    }
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
    if (!e.target.closest('.filter-dropdown')) {
      this.categoryContent.classList.remove('show');
      this.labelContent.classList.remove('show');
      this.categoryBtn.setAttribute('aria-expanded', 'false');
      this.labelBtn.setAttribute('aria-expanded', 'false');
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
      this.labelBtn.textContent = "Filter by Product";
    } else if (this.activeLabels.length === 1) {
      this.labelBtn.textContent = this.activeLabels[0];
    } else {
      this.labelBtn.textContent = `${this.activeLabels.length} Products`;
    }
  }

  /**
   * Update URL parameters based on active filters
   */
  updateUrlParams() {
    if (!window.history || !window.URLSearchParams || !this.isInitialized) return;

    const url = new URL(window.location);
    const params = new URLSearchParams();

    // Add current filter values
    if (this.activeSearch) {
      params.set("search", encodeURIComponent(this.activeSearch));
    }

    this.activeCategories.forEach((category) => {
      params.append("category", encodeURIComponent(category));
    });

    this.activeLabels.forEach((label) => {
      params.append("label", encodeURIComponent(label));
    });

    // Update URL without reloading page
    const queryString = params.toString();
    const newUrl = queryString ? `${url.pathname}?${queryString}` : url.pathname;
    
    window.history.pushState(
      { filters: this.getFilterState() },
      '',
      newUrl
    );
  }

  /**
   * Apply filters from URL parameters
   * @param {boolean} updateUrl - Whether to update the URL after applying filters
   */
  async applyFiltersFromUrl(updateUrl = true) {
    if (!window.URLSearchParams) return;

    const params = new URLSearchParams(window.location.search);

    // Get search parameter
    const search = params.get("search");
    this.activeSearch = search ? decodeURIComponent(search) : "";
    this.searchInput.value = this.activeSearch;

    // Get category parameters
    const categories = params.getAll("category");
    this.activeCategories = categories
      .map(cat => decodeURIComponent(cat))
      .filter(cat => this.categories.includes(cat));

    // Get label parameters
    const labels = params.getAll("label");
    this.activeLabels = labels
      .map(label => decodeURIComponent(label))
      .filter(label => this.labels.includes(label));

    // Update UI
    this.setupFilters();
    this.updateCategoryFilterText();
    this.updateLabelFilterText();

    // Update URL if needed
    if (updateUrl) {
      this.updateUrlParams();
    }
  }

  /**
   * Handle filter changes
   */
  async notifyFilterChange() {
    if (!this.isInitialized) return;

    // Update URL first
    this.updateUrlParams();

    // Then notify callback
    await this.onFilterChange(
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

  // Add helper methods for keyboard navigation
  _focusNextItem(items, currentIndex) {
    const nextIndex = (currentIndex + 1) % items.length;
    items[nextIndex].focus();
  }

  _focusPreviousItem(items, currentIndex) {
    const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    items[prevIndex].focus();
  }

  // Add method to handle dropdown animations
  _animateDropdown(dropdown, show) {
    dropdown.style.height = show ? `${dropdown.scrollHeight}px` : '0';
    dropdown.addEventListener('transitionend', () => {
      if (show) dropdown.style.height = 'auto';
    }, { once: true });
  }

  /**
   * Add scroll indicators to dropdown menus
   * @private
   * @param {HTMLElement} dropdown - Dropdown element
   */
  _addScrollIndicators(dropdown) {
    const scrollIndicatorTop = createElement('div', {
      className: 'scroll-indicator scroll-indicator-top',
      innerHTML: '▲'
    });
    
    const scrollIndicatorBottom = createElement('div', {
      className: 'scroll-indicator scroll-indicator-bottom',
      innerHTML: '▼'
    });

    dropdown.insertBefore(scrollIndicatorTop, dropdown.firstChild);
    dropdown.appendChild(scrollIndicatorBottom);

    // Show/hide indicators based on scroll position
    dropdown.addEventListener('scroll', () => {
      const {scrollTop, scrollHeight, clientHeight} = dropdown;
      
      scrollIndicatorTop.classList.toggle('visible', scrollTop > 10);
      scrollIndicatorBottom.classList.toggle('visible', 
        scrollTop < scrollHeight - clientHeight - 10);
    });
  }

  /**
   * Check if there are any active filters
   * @returns {boolean}
   */
  hasActiveFilters() {
    return this.activeSearch !== '' || 
           this.activeCategories.length > 0 || 
           this.activeLabels.length > 0;
  }
}
