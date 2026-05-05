#!/bin/bash

# Clone actions/list/ → actions/list-new/ + rename all selectors/classes/files with "-new" suffix

set -e

ACTIONS_DIR="src/app/chatbot-design-studio/cds-dashboard/cds-canvas/actions"
SOURCE_DIR="$ACTIONS_DIR/list"
TARGET_DIR="$ACTIONS_DIR/list-new"

echo "🔄 Cloning $SOURCE_DIR → $TARGET_DIR..."

# 1. Copy entire list/ directory
if [ -d "$TARGET_DIR" ]; then
  echo "⚠️  $TARGET_DIR already exists. Removing..."
  rm -rf "$TARGET_DIR"
fi

cp -r "$SOURCE_DIR" "$TARGET_DIR"
echo "✅ Directory cloned"

# 2. Find all .component.ts files and update them
echo "🔧 Renaming component files and updating selectors..."

find "$TARGET_DIR" -name "*.component.ts" | while read file; do
  dir=$(dirname "$file")
  base=$(basename "$file" .component.ts)
  newbase="${base}-new"
  newfile="$dir/${newbase}.component.ts"

  # Rename file
  mv "$file" "$newfile"

  # Extract component class name pattern: cds-action-* → CdsAction*Component
  # Example: cds-action-reply → CdsActionReplyComponent → CdsActionReplyNewComponent

  selector_old=$(grep "selector:" "$newfile" | head -1 | sed -E "s/.*selector:\s*['\"]([^'\"]*)['\"].*/\1/")
  if [ -n "$selector_old" ]; then
    selector_new="${selector_old}-new"
    sed -i "" "s|selector: '$selector_old'|selector: '$selector_new'|g" "$newfile"
    sed -i "" "s|selector: \"$selector_old\"|selector: \"$selector_new\"|g" "$newfile"
  fi

  # Update templateUrl and styleUrls
  sed -i "" "s|templateUrl: '[^']*\.component\.html'|templateUrl: './${newbase}.component.html'|g" "$newfile"
  sed -i "" "s|templateUrl: \"[^\"]*\.component\.html\"|templateUrl: \"./${newbase}.component.html\"|g" "$newfile"
  sed -i "" "s|styleUrls: \['[^']*\.component\.scss'|styleUrls: ['./${newbase}.component.scss'|g" "$newfile"
  sed -i "" "s|styleUrls: \[\"[^\"]*\.component\.scss\"|styleUrls: [\"./${newbase}.component.scss\"|g" "$newfile"

  echo "  ✓ $newfile"
done

# 3. Rename .html and .scss files
echo "🔧 Renaming .html and .scss files..."

find "$TARGET_DIR" -name "*.component.html" -o -name "*.component.scss" | while read file; do
  dir=$(dirname "$file")
  base=$(basename "$file" .component.html)
  base=$(basename "$base" .component.scss)
  ext="${file##*.}"
  newfile="$dir/${base}-new.component.${ext}"

  if [ "$file" != "$newfile" ]; then
    mv "$file" "$newfile"
    echo "  ✓ $newfile"
  fi
done

# 4. Update all class names in .ts files (CdsActionXComponent → CdsActionXNewComponent)
echo "🔧 Updating TypeScript class names..."

find "$TARGET_DIR" -name "*-new.component.ts" | while read file; do
  # Extract old class name from file path: cds-action-reply-new → CdsActionReplyNew
  # Pattern: kebab-case to PascalCase

  # Read file and update class declarations
  # Example: export class CdsActionReplyComponent → export class CdsActionReplyNewComponent

  sed -i "" 's/export class \(CdsAction[A-Za-z]*\)Component/export class \1NewComponent/g' "$file"
  sed -i "" 's/export class \(CdsOption[A-Za-z]*\)Component/export class \1NewComponent/g' "$file"
  sed -i "" 's/implements \(CdsAction[A-Za-z]*Component\)/implements \1New/g' "$file"

  echo "  ✓ $(basename $file)"
done

# 5. Update .html files: replace selector references like <cds-action-reply-text> → <cds-action-reply-text-new>
echo "🔧 Updating HTML selector references..."

find "$TARGET_DIR" -name "*-new.component.html" | while read file; do
  # Replace all cds-action-* selectors with cds-action-*-new
  # But be careful: <cds-action-reply-v1> should NOT become <cds-action-reply-v1-new>
  # Only direct selectors should be updated

  sed -i "" 's/<cds-action-\([a-z-]*\)>/<cds-action-\1-new>/g' "$file"
  sed -i "" 's/<\/cds-action-\([a-z-]*\)>/<\/cds-action-\1-new>/g' "$file"
  sed -i "" 's/\[\(cds-action-[a-z-]*\)\]/[\1-new]/g' "$file"
  sed -i "" 's/"cds-action-\([a-z-]*\)"/"cds-action-\1-new"/g' "$file"

  echo "  ✓ $(basename $file)"
done

# 6. Create cds-actions-new.module.ts
echo "🔧 Creating cds-actions-new.module.ts..."

# Copy original module and rename it
cp "$TARGET_DIR/cds-actions.module.ts" "$TARGET_DIR/cds-actions-new.module.ts"

# Update class name: CdsActionsModule → CdsActionsNewModule
sed -i "" 's/export class CdsActionsModule/export class CdsActionsNewModule/g' "$TARGET_DIR/cds-actions-new.module.ts"

# Update all component declarations to use -new versions
sed -i "" 's/CdsAction\([A-Za-z]*\)Component/CdsAction\1NewComponent/g' "$TARGET_DIR/cds-actions-new.module.ts"
sed -i "" 's/CdsOption\([A-Za-z]*\)Component/CdsOption\1NewComponent/g' "$TARGET_DIR/cds-actions-new.module.ts"

echo "  ✓ cds-actions-new.module.ts created"

# 7. Clean up: remove old cds-actions.module.ts from list-new
rm "$TARGET_DIR/cds-actions.module.ts"

echo ""
echo "✅ Clone complete! Summary:"
echo "   • Source: $SOURCE_DIR (unchanged)"
echo "   • Target: $TARGET_DIR (renamed with -new suffix)"
echo "   • Module: $TARGET_DIR/cds-actions-new.module.ts"
echo ""
echo "Next steps:"
echo "  1. Import CdsActionsNewModule in parent module"
echo "  2. Update templates to use new selectors where needed"
echo "  3. Refactor SCSS files incrementally"
