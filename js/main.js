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
      onFilterChange: (search, categories, labels) => {
        demoRenderer.renderDemos(search, categories, labels);
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
    filterManager.init(categories, labels);

    // Initial render
    demoRenderer.renderDemos();

    console.log(
      "Cloudflare Product Demos application initialized successfully"
    );
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
    filterManager.init(categories, labels);
    filterManager.resetFilters();
    demoRenderer.renderDemos();

    console.log("Data reloaded successfully");
  } catch (error) {
    console.error("Error reloading data:", error);
  }
}
