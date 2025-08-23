import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { EditorView as EditorViewType } from "@codemirror/view";
import { EditorView, keymap } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useRef } from "react";
import { createVimKeyBindings } from "@/config/vimKeyBindings";
import type { VimEditorProps } from "@/types";

/**
 * Default sample code shown in editors
 * Simple fibonacci function for vim practice
 */
const SAMPLE_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

/**
 * Editor configuration constants
 */
const EDITOR_CONFIG = {
  height: "400px",
  fontSize: "14px",
  fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  borderRadius: "8px",
  padding: "16px",
} as const;

/**
 * Vim-enabled code editor component with motion capture
 * Provides a CodeMirror editor with vim keybindings and dark theme
 * Supports readonly mode and content synchronization
 */
export function VimEditor({
  onMotionCapture,
  onContentChange,
  onUserInteraction,
  resetTrigger,
  readonly = false,
  initialContent,
}: VimEditorProps) {
  const editorRef = useRef<{ view?: EditorViewType } | null>(null);

  /**
   * Handles content changes in the editor
   * Triggers user interaction callback for non-readonly editors
   */
  const handleContentChange = useCallback(
    (value: string) => {
      // Trigger user interaction on content change for writable editors
      if (!readonly && onUserInteraction) {
        onUserInteraction();
      }

      onContentChange?.(value);
    },
    [onContentChange, onUserInteraction, readonly],
  );

  /**
   * Initialize editor content based on props
   * Sets appropriate default content for readonly vs writable editors
   */
  useEffect(() => {
    const content = initialContent || (readonly ? SAMPLE_CODE : "");
    onContentChange?.(content);
  }, [onContentChange, readonly, initialContent]);

  /**
   * Reset editor content when resetTrigger changes
   * Useful for clearing editor state between challenges
   */
  useEffect(() => {
    if (editorRef.current?.view && resetTrigger > 0) {
      const view = editorRef.current.view;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: SAMPLE_CODE,
        },
      });
    }
  }, [resetTrigger]);

  /**
   * CodeMirror extensions configuration
   * Includes vim mode, syntax highlighting, theming, and key bindings
   */
  const extensions = [
    vim({ status: true }), // Enable vim with status bar
    javascript({ jsx: true }), // JavaScript syntax highlighting with JSX support
    oneDark, // Dark theme for better coding experience
    EditorView.lineWrapping, // Enable line wrapping for long lines
    EditorView.editable.of(!readonly), // Control editability based on readonly prop
    keymap.of(createVimKeyBindings(onMotionCapture)), // Custom vim key bindings
    EditorView.theme(createEditorTheme(readonly)), // Custom theme configuration
  ];

  /**
   * Creates custom theme configuration for the editor
   * Handles readonly state styling and responsive design
   */
  function createEditorTheme(isReadonly: boolean) {
    return {
      "&": {
        fontSize: EDITOR_CONFIG.fontSize,
        fontFamily: EDITOR_CONFIG.fontFamily,
      },
      ".cm-editor": {
        height: EDITOR_CONFIG.height,
        border: isReadonly
          ? "1px solid hsl(var(--muted-foreground))"
          : "1px solid hsl(var(--border))",
        borderRadius: EDITOR_CONFIG.borderRadius,
        overflow: "visible", // Allow vim status bar to be visible
        backgroundColor: isReadonly ? "hsl(var(--muted) / 0.3)" : null,
      },
      ".cm-vim-panel": {
        backgroundColor: "hsl(var(--background))",
        borderTop: "1px solid hsl(var(--border))",
        padding: "2px 8px",
        fontSize: "12px",
        fontFamily: EDITOR_CONFIG.fontFamily,
      },
      ".cm-scroller": {
        height: "100%",
      },
      ".cm-content": {
        padding: EDITOR_CONFIG.padding,
        minHeight: "100%",
        cursor: isReadonly ? "default" : "text",
        userSelect: isReadonly ? "none" : "text",
        WebkitUserSelect: isReadonly ? "none" : "text",
      },
      ".cm-focused": {
        outline: "none",
      },
    };
  }

  /**
   * Prevents copying content in readonly mode
   * Maintains challenge integrity by preventing content theft
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (readonly) {
        // Block copy/select all/cut shortcuts in readonly mode
        const isCopyShortcut =
          (event.ctrlKey || event.metaKey) &&
          ["c", "a", "x"].includes(event.key.toLowerCase());

        if (isCopyShortcut) {
          event.preventDefault();
        }
      }
    },
    [readonly],
  );

  /**
   * Prevents right-click context menu in readonly mode
   * Additional protection against content copying
   */
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (readonly) {
        event.preventDefault();
      }
    },
    [readonly],
  );

  return (
    <div
      className="w-[480px] relative overflow-visible"
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      <CodeMirror
        ref={editorRef}
        value={initialContent || (readonly ? SAMPLE_CODE : "")}
        height={EDITOR_CONFIG.height}
        extensions={extensions}
        onChange={handleContentChange}
        theme={oneDark}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
        }}
      />
      {readonly && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted/90 text-muted-foreground border border-muted-foreground/20">
            READ ONLY
          </span>
        </div>
      )}
    </div>
  );
}
