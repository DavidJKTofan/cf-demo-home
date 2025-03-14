/**
 * Main application code
 */
let demoRenderer;
let filterManager;

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Load data from JSON files first
    const [demos, categories, labels] = await Promise.all([
      fetchData("data/demos.json"),
      fetchData("data/categories.json"),
      fetchData("data/labels.json"),
    ]);

    // Initialize demo renderer
    demoRenderer = new DemoRenderer("demoGrid");
    demoRenderer.init(demos);

    // Get initial URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get("search");
    const initialCategories = urlParams.getAll("category");
    const initialLabels = urlParams.getAll("label");

    // Initialize filter manager with callback and initial state
    filterManager = new FilterManager({
      onFilterChange: async (search, categories, labels) => {
        await demoRenderer.renderDemos(search, categories, labels);
      },
      initialState: {
        search: initialSearch ? decodeURIComponent(initialSearch) : "",
        categories: initialCategories.map(c => decodeURIComponent(c)),
        labels: initialLabels.map(l => decodeURIComponent(l))
      }
    });

    // Initialize filter manager with data
    await filterManager.init(categories, labels);

    // Initial render based on URL parameters
    await demoRenderer.renderDemos(
      filterManager.activeSearch,
      filterManager.activeCategories,
      filterManager.activeLabels
    );

    console.log("Cloudflare Product Demos application initialized successfully");
  } catch (error) {
    console.error("Error initializing application:", error);
    document.getElementById("demoGrid").innerHTML = `
      <div class="no-results">
        <p>There was an error loading the application. Please try again later.</p>
      </div>
    `;
  }
});

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
