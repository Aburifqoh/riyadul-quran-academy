import os
import re
import glob

# Premium Unsplash Images (Non-human, Islamic/Academic aesthetic)
PREMIUM_IMAGES = [
    "https://images.unsplash.com/photo-1585079542156-2755d9c8a094?q=80&w=600", # Quran
    "https://images.unsplash.com/photo-1565552309831-7e87ab00b1ea?q=80&w=600", # Mosque interior
    "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=600", # Architecture
    "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=600", # Islamic details
    "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?q=80&w=600", # Lanterns
    "https://images.unsplash.com/photo-1519817914152-2b3eb2586562?q=80&w=600", # Books
    "https://images.unsplash.com/photo-1608681284562-b25121eb7984?q=80&w=600", # Beautiful mosque
    "https://images.unsplash.com/photo-1584267425124-b153b890d9a6?q=80&w=600", # Geometric patterns
    "https://images.unsplash.com/photo-1623517454845-a906cb525547?q=80&w=600"  # Arabic text/art
]

NEW_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">'

NEW_TAILWIND = """<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          teal: { DEFAULT: '#0d5c75', dark: '#083f4e', light: '#12799a' },
          gold: { DEFAULT: '#d4af37', light: '#f3e5ab' },
          offwhite: '#faf9f6',
          dark: '#111827'
        },
        fontFamily: {
          body: ['Inter', 'sans-serif'],
          heading: ['Playfair Display', 'serif']
        }
      }
    }
  }
</script>"""

NEW_STYLE_ADDITIONS = """
  body { font-family: 'Inter', sans-serif; background-color: #faf9f6; }
  h1, h2, h3, h4, h5, h6, .font-heading { font-family: 'Playfair Display', serif; }
  .premium-shadow { box-shadow: 0 10px 30px -10px rgba(13, 92, 117, 0.15); }
  .glassmorphism { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); }
"""

files = glob.glob("*.html")
if "site.html" in files:
    files.remove("site.html")

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace Font Link
    content = re.sub(
        r'<link href="https://fonts\.googleapis\.com/css2\?family=Roboto:.*?rel="stylesheet">',
        NEW_FONTS,
        content,
        flags=re.DOTALL
    )

    # Replace old fonts if already updated to Playfair in index.html
    content = re.sub(
        r'<link href="https://fonts\.googleapis\.com/css2\?family=Roboto:.*?Playfair.*?rel="stylesheet">',
        NEW_FONTS,
        content,
        flags=re.DOTALL
    )

    # 2. Replace Tailwind Config
    content = re.sub(
        r'<script>\s*tailwind\.config\s*=\s*\{.*?</script>',
        NEW_TAILWIND,
        content,
        flags=re.DOTALL
    )

    # 3. Add global premium styles to <style> block
    # Remove existing body font-family inside <style>
    content = re.sub(r'body\s*\{\s*font-family:\s*\'Roboto\',\s*sans-serif;\s*\}', '', content)
    # Check if we already added premium styles
    if "font-family: 'Inter'" not in content:
        content = content.replace('<style>', '<style>' + NEW_STYLE_ADDITIONS)

    # 4. Replace Images (Unsplash only)
    img_urls = re.findall(r'https://images\.unsplash\.com/photo-[^"\'\s]+', content)
    img_urls = list(set(img_urls)) # unique
    
    img_idx = 0
    for old_url in img_urls:
        if '1585079542156' not in old_url and '1974' not in old_url: # skip the hero bg in index if possible, but actually let's just replace all except the quran hero
            # replace with premium image
            content = content.replace(old_url, PREMIUM_IMAGES[img_idx % len(PREMIUM_IMAGES)])
            img_idx += 1

    # 5. Add premium shadow to cards
    content = content.replace('course-card aos', 'course-card aos premium-shadow')
    content = content.replace('subject-card', 'subject-card premium-shadow')

    # 6. Navbar glassmorphism
    if 'bg-white shadow-sm' in content and 'glassmorphism' not in content:
        content = content.replace('bg-white shadow-sm', 'glassmorphism shadow-sm')

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Updated {filepath}")
