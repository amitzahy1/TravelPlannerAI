
import re

def check_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    stack = []
    
    # Regex for tags
    # <div ...> -> Open
    # </div> -> Close
    # <div ... /> -> Self-closing (ignore)
    # <Component ...> -> Open
    # </Component> -> Close
    # <Component ... /> -> Self-closing
    
    # Simplified regex for this specific case (divs)
    tag_re = re.compile(r'</?(\w+)[^>]*>')
    
    for i, line in enumerate(lines):
        # Remove comments
        line_content = line.split('//')[0]
        
        # Find all tags
        for match in tag_re.finditer(line_content):
            tag_str = match.group(0)
            tag_name = match.group(1)
            
            # Skip self-closing
            if tag_str.endswith('/>'):
                continue
                
            if tag_str.startswith('</'):
                # Closing tag
                if not stack:
                    print(f"Line {i+1}: Unexpected closing tag {tag_name}")
                    return
                
                last_tag = stack.pop()
                if last_tag['name'] != tag_name:
                    # Allow non-strict matching for components vs html? No, JSX is strict.
                    # But we only care about DIVs for this error.
                    if tag_name == 'div' or last_tag['name'] == 'div':
                         print(f"Line {i+1}: Mismatch! Expected closing {last_tag['name']} (opened at {last_tag['line']}), found {tag_name}")
            else:
                # Opening tag
                # Check if it is self-closing despite regex (e.g. <div /> matched by <div ...>)
                # My regex <[^>]*> matches attributes.
                # If it ends with /> it's self closing.
                if tag_str.endswith('/>'):
                    continue
                    
                # void tags
                if tag_name in ['input', 'img', 'br', 'hr']:
                    continue
                    
                stack.append({'name': tag_name, 'line': i+1})

    if stack:
        print("Unclosed tags:")
        for tag in stack:
            print(f"  {tag['name']} at line {tag['line']}")
    else:
        print("All tags balanced!")

check_balance('components/AdminView.tsx')
