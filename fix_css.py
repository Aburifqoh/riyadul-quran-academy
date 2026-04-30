import glob

for filepath in glob.glob('*.html'):
    if filepath == 'site.html': continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = content.replace('.subject-card premium-shadow {', '.subject-card {')
    content = content.replace('.subject-card premium-shadow img', '.subject-card img')
    content = content.replace('.subject-card premium-shadow .label', '.subject-card .label')
    content = content.replace('class="subject-card"', 'class="subject-card premium-shadow"')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed CSS in {filepath}")
