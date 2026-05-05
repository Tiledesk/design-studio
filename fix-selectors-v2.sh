#!/bin/bash

# Fix: Update selectors properly in all -new components

TARGET_DIR="src/app/chatbot-design-studio/cds-dashboard/cds-canvas/actions/list-new"

echo "🔧 Fixing selectors (round 2)..."

find "$TARGET_DIR" -name "*-new.component.ts" -type f | while read file; do
  # Use perl for safer multi-line editing
  # Pattern: selector: 'cds-action-X' → selector: 'cds-action-X-new'

  perl -i -pe "s/selector:\s*['\"]([cds\-a-z]+[^'\"]*)['\"]/
    my \$sel = \$1;
    \$sel =~ s/-new\$//;  # Remove -new if exists
    \"selector: '\${sel}-new'\"
  /e" "$file"

  echo "  ✓ $(basename $file)"
done

echo "✅ Done!"

# Verify one
echo ""
echo "Verifying: cds-action-reply-new selector..."
grep "selector:" "$TARGET_DIR/cds-action-reply/cds-action-reply-v1/cds-action-reply-new.component.ts" | head -1
