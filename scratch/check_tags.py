import re

def check_tags(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Simple tag balancer
    # This is naive but can find common mismatches
    stack = []
    # Match <Tag ...> or </Tag>
    # Ignore self-closing <Tag ... />
    # Also ignore React fragments <> and </>
    tags = re.findall(r'<(/?[\w\.]+|/?>)', content)
    
    for tag in tags:
        if tag.startswith('//') or tag.startswith('/*'): continue
        if tag == '<' or tag == '>': continue
        
        if tag == '<>':
            stack.append('<>')
        elif tag == '</>':
            if not stack:
                print("Error: Closing fragment </> found with no opening")
                continue
            last = stack.pop()
            if last != '<>':
                print(f"Error: Mismatched tag: {last} closed by </>")
        elif tag.startswith('</'):
            tag_name = tag[2:]
            if not stack:
                print(f"Error: Closing tag {tag} found with no opening")
                continue
            last = stack.pop()
            if last != '<' + tag_name:
                print(f"Error: Mismatched tag: {last} closed by {tag}")
        elif tag.endswith('/>'):
            continue # self-closing
        else:
            # Check if it's self-closing in the original content (naive)
            # Re-searching the actual tag string
            full_tag = re.search(r'<' + re.escape(tag[1:]) + r'[^>]*>', content[content.find(tag):])
            if full_tag and full_tag.group(0).endswith('/>'):
                continue
            stack.append(tag)
            
    if stack:
        print("Unclosed tags:", stack)
    else:
        print("All tags balanced (naive check)")

check_tags('/Users/stevefreshblendz/Desktop/Holly-AI-main/src/components/holly-chat-interface.tsx')
