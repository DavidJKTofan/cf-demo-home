// Theme switcher functionality
function initTheme() {
  const themeToggle = document.querySelector(".theme-toggle");
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  // Get saved theme or default to dark
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.documentElement.dataset.theme = savedTheme;
  } else {
    document.documentElement.dataset.theme = "dark";
  }

  // Add theme toggle functionality if the button exists
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.dataset.theme;
      const newTheme = currentTheme === "light" ? "dark" : "light";

      document.documentElement.dataset.theme = newTheme;
      localStorage.setItem("theme", newTheme);
    });
  }

  // Listen for system theme changes
  prefersDarkScheme.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      document.documentElement.dataset.theme = "dark";
    }
  });
}

// Initialize theme when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}
