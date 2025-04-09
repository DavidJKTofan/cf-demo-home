import json
import os
from pathlib import Path
import re
from datetime import datetime
import hashlib

def get_file_hash(file_path):
    """Calculate MD5 hash of a file."""
    if not file_path.exists():
        return None
    
    with open(file_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def should_update_file(existing_path, new_content):
    """Determine if file should be updated based on content comparison."""
    if not existing_path.exists():
        return True
    
    # Calculate hash of existing and new content
    existing_hash = get_file_hash(existing_path)
    new_hash = hashlib.md5(new_content.encode()).hexdigest()
    
    return existing_hash != new_hash

def backup_file(file_path):
    """Create a backup of an existing file."""
    if not file_path.exists():
        return
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = Path('backups')
    backup_dir.mkdir(exist_ok=True)
    
    # Create category-specific backup directory
    category_backup_dir = backup_dir / file_path.parent.name
    category_backup_dir.mkdir(exist_ok=True)
    
    backup_path = category_backup_dir / f"{file_path.stem}_{timestamp}{file_path.suffix}"
    import shutil
    shutil.copy2(file_path, backup_path)
    return backup_path

def create_demo_page(demo, template, output_dir):
    """Create a single demo page."""
    # Create a slug from the title for the filename
    slug = demo["title"].lower().replace(" ", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    
    # Replace the page title
    demo_page = re.sub(
        r'<title>.*?</title>',
        f'<title>{demo["title"]} - Demo</title>',
        template
    )
    
    # Add meta tags for SEO
    meta_tags = f'''
    <meta name="description" content="{demo['description']}">
    <meta name="keywords" content="Cloudflare, {demo['category']}, {', '.join(demo['labels'])}">
    <meta property="og:title" content="{demo['title']} - Demo">
    <meta property="og:description" content="{demo['description']}">
    '''
    demo_page = re.sub(r'</title>\s*', f'</title>{meta_tags}', demo_page)
    
    # Replace the main heading placeholder
    demo_page = demo_page.replace("{{ LABEL_NAME_HERE }}", demo["title"])
    
    # Improve demo content with more structured information
    demo_content_placeholder = '<p>\n        This is a simple landing page designed with a clean and responsive\n        layout.\n      </p>'
    
    # Create a more visually appealing demo content section
    demo_content = f'''
      <div class="demo-card" style="border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; background-color: var(--card-color); border: 1px solid var(--border-color);">
        <div class="demo-meta">
          <span class="demo-category" style="margin-bottom: 1rem; display: inline-block;">{demo["category"]}</span>
          <div class="demo-labels" style="margin: 1rem 0;">
            {' '.join([f'<span class="demo-label" style="margin-right: 0.5rem;">{label}</span>' for label in demo["labels"]])}
          </div>
        </div>
        
        <h3 style="margin: 1rem 0; color: var(--secondary-color);">Description</h3>
        <p style="margin-bottom: 1.5rem;">{demo["description"]}</p>
        
        <div style="margin-top: 1.5rem;">
          <a href="{demo["url"]}" target="_blank" style="display: inline-block; padding: 0.6rem 1.2rem; background-color: var(--secondary-color); color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Visit Demo
          </a>
        </div>
      </div>
    '''
    
    demo_page = demo_page.replace(demo_content_placeholder, demo_content)
    
    # Enhance the code snippet section with demo-specific example
    code_snippet = f'''function load{demo["title"].replace(" ", "")}Demo() {{
    console.log("Loading {demo["title"]} demo...");
    // Initialize demo components
    const demoContainer = document.getElementById("demo-container");
    demoContainer.innerHTML = "Demo is loading...";
    
    // Connect to demo API
    fetch("{demo["url"]}")
        .then(response => {{
            console.log("Demo loaded successfully");
            demoContainer.innerHTML = "Demo is ready!";
        }})
        .catch(error => {{
            console.error("Error loading demo:", error);
        }});
}}

// Call the function when page loads
document.addEventListener("DOMContentLoaded", load{demo["title"].replace(" ", "")}Demo);'''
    
    # Replace the code sample
    demo_page = re.sub(
        r'<code>\nfunction greet.*?greet\(\);\n</code>',
        f'<code>\n{code_snippet}\n</code>',
        demo_page,
        flags=re.DOTALL
    )
    
    # Add a demo container div
    demo_page = re.sub(
        r'<h2>Sample Image</h2>',
        '<div id="demo-container" style="padding: 1rem; background-color: var(--background-color); border-radius: 6px; margin-bottom: 2rem; min-height: 100px; display: flex; align-items: center; justify-content: center; font-weight: bold;">Demo will appear here when loaded</div>\n\n      <h2>Sample Image</h2>',
        demo_page
    )
    
    output_path = output_dir / f"{slug}.html"
    
    # Check if file should be updated
    if should_update_file(output_path, demo_page):
        # Create backup if file exists
        if output_path.exists():
            backup_path = backup_file(output_path)
            print(f"Created backup of existing file: {backup_path}")
        
        # Write the new page
        with open(output_path, "w") as file:
            file.write(demo_page)
        print(f"Created/Updated landing page for: {demo['title']} in {output_dir.name}")
    else:
        print(f"Skipped {demo['title']} - Content unchanged")
    
    return slug

def main():
    # Create logs directory
    logs_dir = Path('logs')
    logs_dir.mkdir(exist_ok=True)
    
    # Setup logging
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = logs_dir / f"generation_log_{timestamp}.txt"
    
    try:
        # Read the template file
        with open("template.html", "r") as file:
            template = file.read()

        # Read the demos data
        with open("../data/demos.json", "r") as file:
            demos = json.load(file)

        # Track processed demos for index page
        processed_demos = {}

        # Process each demo
        for demo in demos:
            try:
                category = demo["category"]
                folder_name = CATEGORY_FOLDERS.get(category, "other")
                output_dir = Path(folder_name)
                output_dir.mkdir(exist_ok=True)
                
                slug = create_demo_page(demo, template, output_dir)
                
                if category not in processed_demos:
                    processed_demos[category] = []
                processed_demos[category].append({
                    "slug": slug,
                    "folder": folder_name,
                    "demo": demo
                })
                
            except Exception as e:
                error_msg = f"Error processing demo {demo.get('title', 'Unknown')}: {str(e)}"
                print(error_msg)
                with open(log_file, 'a') as log:
                    log.write(f"{error_msg}\n")

        # Create index.html only if there are changes
        index_path = Path("index.html")
        new_index_content = generate_index_content(processed_demos)
        
        if should_update_file(index_path, new_index_content):
            if index_path.exists():
                backup_file(index_path)
            
            with open(index_path, "w") as index_file:
                index_file.write(new_index_content)
            print("Created/Updated index.html with links to all demos")
        else:
            print("Skipped index.html - Content unchanged")

    except Exception as e:
        error_msg = f"Fatal error: {str(e)}"
        print(error_msg)
        with open(log_file, 'a') as log:
            log.write(f"{error_msg}\n")
        raise

def generate_index_content(processed_demos):
    """Generate the content for index.html."""
    index_content = '''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Demo Gallery</title>
    <meta name="description" content="Explore Cloudflare solution demos and features">
    <meta name="keywords" content="Cloudflare, demos, solutions, features">
    <link rel="stylesheet" href="../css/styles.css">
    <style>
      .category-section {
        margin-bottom: 2rem;
      }
      
      .category-title {
        color: var(--primary-color);
        margin-bottom: 1rem;
        padding-left: 0.5rem;
        border-left: 4px solid var(--primary-color);
      }
      
      .demo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Demo Gallery</h1>
'''
    
    # Add each category section
    for category, demos in processed_demos.items():
        index_content += f'''
      <div class="category-section">
        <h2 class="category-title">{category}</h2>
        <div class="demo-grid">
'''
        
        # Add each demo card
        for demo_info in demos:
            demo = demo_info["demo"]
            folder = demo_info["folder"]
            slug = demo_info["slug"]
            
            index_content += f'''
          <div class="demo-card">
            <div class="demo-content">
              <span class="demo-category">{demo["category"]}</span>
              <h3 class="demo-title">{demo["title"]}</h3>
              <p class="demo-description">{demo["description"]}</p>
              <div class="demo-labels">
                {' '.join([f'<span class="demo-label">{label}</span>' for label in demo["labels"]])}
              </div>
              <a href="{folder}/{slug}.html" class="demo-link">View Demo</a>
            </div>
          </div>
'''
        
        index_content += '''
        </div>
      </div>
'''
    
    # Close the HTML
    index_content += '''
    </div>
    <footer>
      <div class="container">
        <p>&copy; 2025 Demo Gallery. All rights reserved.</p>
        <p class="disclaimer">
          This is an unofficial demonstration website. Not affiliated with or
          endorsed by Cloudflare. All product names, logos, and brands are
          property of Cloudflare.
        </p>
      </div>
    </footer>
  </body>
</html>
'''
    
    return index_content

if __name__ == "__main__":
    # Category to folder mapping
    CATEGORY_FOLDERS = {
        "Developer Platform": "serverless",
        "Application Security": "security",
        "Application Performance": "performance",
        "Cloudflare One (SASE & Zero Trust)": "sase",
        "Artificial Intelligence (AI)": "ai",
        "Network Services": "sase",
        "Platform": "platform"
    }
    
    main()
    print("\nGeneration process completed. Check logs directory for details.")