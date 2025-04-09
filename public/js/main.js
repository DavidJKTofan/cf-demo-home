/**
 * Main application code
 */
import { DemoRenderer } from './DemoRenderer.js';
import { FilterManager } from './FilterManager.js';
import { fetchData } from './utils.js';

let demoRenderer;
let filterManager;

// Use dynamic imports for better code splitting
async function initializeApp() {
  try {
    // Load data in parallel
    const [demos, categories, labels] = await Promise.all([
      fetchData("data/demos.json"),
      fetchData("data/categories.json"),
      fetchData("data/labels.json"),
    ]);

    // Initialize components
    const demoRenderer = new DemoRenderer("demoGrid");
    demoRenderer.init(demos);

    // Get initial URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const initialState = {
      search: urlParams.get("search") ? decodeURIComponent(urlParams.get("search")) : "",
      categories: urlParams.getAll("category").map(c => decodeURIComponent(c)),
      labels: urlParams.getAll("label").map(l => decodeURIComponent(l))
    };

    const filterManager = new FilterManager({
      onFilterChange: async (search, categories, labels) => {
        await demoRenderer.renderDemos(search, categories, labels);
      },
      initialState
    });

    await filterManager.init(categories, labels);
    
    // Initial render
    await demoRenderer.renderDemos(
      filterManager.activeSearch,
      filterManager.activeCategories,
      filterManager.activeLabels
    );

    console.log("Cloudflare Product Demos application initialized successfully");
  } catch (error) {
    console.error("Error initializing application:", error);
    document.getElementById("demoGrid").innerHTML = `
      <div class="error-message">
        <p>There was an error loading the application. Please try again later.</p>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Handle browser navigation
window.addEventListener('popstate', async function(event) {
  if (!filterManager) return;

  // Update filters from URL without triggering URL update
  await filterManager.applyFiltersFromUrl(false);
  
  // Re-render with current URL parameters
  await demoRenderer.renderDemos(
    filterManager.activeSearch,
    filterManager.activeCategories,
    filterManager.activeLabels
  );
});

// Add a method to reload data (useful for future enhancements)
async function reloadData() {
  try {
    const [demos, categories, labels] = await Promise.all([
      fetchData("data/demos.json"),
      fetchData("data/categories.json"),
      fetchData("data/labels.json"),
    ]);

    demoRenderer.init(demos);
    
    // Preserve current URL parameters when reloading
    const urlParams = new URLSearchParams(window.location.search);
    const currentSearch = urlParams.get("search") || "";
    const currentCategories = urlParams.getAll("category") || [];
    const currentLabels = urlParams.getAll("label") || [];

    filterManager.init(categories, labels);

    // Apply current filters after reload
    if (currentSearch || currentCategories.length > 0 || currentLabels.length > 0) {
      await demoRenderer.renderDemos(
        decodeURIComponent(currentSearch),
        currentCategories.map(c => decodeURIComponent(c)),
        currentLabels.map(l => decodeURIComponent(l))
      );
    } else {
      await demoRenderer.renderDemos();
    }

    console.log("Data reloaded successfully");
  } catch (error) {
    console.error("Error reloading data:", error);
  }
}
