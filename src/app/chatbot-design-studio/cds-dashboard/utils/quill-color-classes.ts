import Quill from 'quill';

/**
 * Quill default palette (hex) converted into "tokens" safe for CSS class names.
 * We use these tokens as format values, producing classes like:
 * - `ql-color-e60000`
 * - `ql-bg-e60000`
 *
 * This avoids inline styles like `style="color: #e60000"`.
 */
export const QUILL_COLOR_TOKENS: string[] = [
  '000000', 'e60000', 'ff9900', 'ffff00', '008a00', '0066cc', '9933ff',
  'ffffff', 'facccc', 'ffebcc', 'ffffcc', 'cce8cc', 'cce0f5', 'ebd6ff',
  'bbbbbb', 'f06666', 'ffc266', 'ffff66', '66b966', '66a3e0', 'c285ff',
  '888888', 'a10000', 'b26b00', 'b2b200', '006100', '0047b2', '6b24b2',
  '444444', '5c0000', '663d00', '666600', '003700', '002966', '3d1466'
];

let initialized = false;

export function initQuillColorClasses(): void {
  if (initialized) return;
  initialized = true;

  // Register class-based attributors so Quill uses classes instead of inline styles.
  const ColorClass = Quill.import('attributors/class/color');
  const BackgroundClass = Quill.import('attributors/class/background');

  // Limit values to our tokens (safe for class names).
  (ColorClass as any).whitelist = QUILL_COLOR_TOKENS;
  (BackgroundClass as any).whitelist = QUILL_COLOR_TOKENS;

  Quill.register(ColorClass, true);
  Quill.register(BackgroundClass, true);
}


