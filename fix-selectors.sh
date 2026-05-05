#!/bin/bash

# Fix selectors in -new components: cds-action-X → cds-action-X-new

set -e

TARGET_DIR="src/app/chatbot-design-studio/cds-dashboard/cds-canvas/actions/list-new"

echo "🔧 Fixing selectors in all -new components..."

# Find all *-new.component.ts files and update their selectors
find "$TARGET_DIR" -name "*-new.component.ts" | while read file; do
  echo "  Processing: $(basename $file)"

  # Extract the component filename (e.g., cds-action-reply-new)
  base=$(basename "$file" .component.ts)

  # Generate selector name from filename
  # cds-action-reply-new → cds-action-reply-new
  # (It's already -new, but we need to extract the part before -new)

  # Extract the selector from the original file
  selector=$(grep -h "selector:" "$file" | head -1 | sed -E "s/.*selector:\s*['\"]([^'\"]*)['\"].*/\1/")

  if [ -n "$selector" ]; then
    # Remove -new if it's already there, then add it back
    selector_base="${selector%-new}"
    selector_new="${selector_base}-new"

    if [ "$selector" != "$selector_new" ]; then
      sed -i "" "s/selector: '[^']*'/selector: '$selector_new'/g" "$file"
      sed -i "" "s/selector: \"[^\"]*\"/selector: \"$selector_new\"/g" "$file"
      echo "    ✓ Updated selector from '$selector' to '$selector_new'"
    fi
  fi
done

echo "✅ Selectors fixed!"
