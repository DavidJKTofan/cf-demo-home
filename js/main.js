/**
 * Main application code
 */
let demoRenderer;
let filterManager;

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Initialize demo renderer
    demoRenderer = new DemoRenderer("demoGrid");

    // Initialize filter manager with callback
    filterManager = new FilterManager({
      onFilterChange: async (search, categories, labels) => {
        await demoRenderer.renderDemos(search, categories, labels);
      },
    });

    // Load data from JSON files
    const [demos, categories, labels] = await Promise.all([
      fetchData("data/demos.json"),
      fetchData("data/categories.json"),
      fetchData("data/labels.json"),
    ]);

    // Initialize components with data
    demoRenderer.init(demos);
    
    // Get initial URL parameters before setting up filters
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get("search") || "";
    const initialCategories = urlParams.getAll("category") || [];
    const initialLabels = urlParams.getAll("label") || [];

    // Initialize filter manager with data
    filterManager.init(categories, labels);

    // If we have URL parameters, apply them immediately
    if (initialSearch || initialCategories.length > 0 || initialLabels.length > 0) {
      // Initial render with filters
      await demoRenderer.renderDemos(
        decodeURIComponent(initialSearch),
        initialCategories.map(c => decodeURIComponent(c)),
        initialLabels.map(l => decodeURIComponent(l))
      );
    } else {
      // No filters, render all demos
      await demoRenderer.renderDemos();
    }

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

// Add support for direct linking with filters
window.addEventListener('popstate', async function(event) {
  const urlParams = new URLSearchParams(window.location.search);
  const search = urlParams.get("search") || "";
  const categories = urlParams.getAll("category") || [];
  const labels = urlParams.getAll("label") || [];

  // Update filter manager state
  filterManager.applyFiltersFromUrl();
  
  // Re-render with current URL parameters
  await demoRenderer.renderDemos(
    decodeURIComponent(search),
    categories.map(c => decodeURIComponent(c)),
    labels.map(l => decodeURIComponent(l))
  );
});
