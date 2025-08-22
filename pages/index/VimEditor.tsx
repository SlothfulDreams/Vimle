import { useCallback, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vim } from "@replit/codemirror-vim";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sampleText = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

interface VimEditorProps {
  onMotionCapture: (motion: any) => void;
  onContentChange?: (content: string) => void;
  onUserInteraction?: () => void;
  resetTrigger: number;
  readonly?: boolean;
  initialContent?: string;
}

export function VimEditor({
  onMotionCapture,
  onContentChange,
  onUserInteraction,
  resetTrigger,
  readonly = false,
  initialContent,
}: VimEditorProps) {
  const editorRef = useRef<any>(null);

  const onChange = useCallback(
    (value: string, transaction: any) => {
      // Here we could capture and parse motions
      console.log("Editor value changed:", value.length);

      // Call user interaction for left editor (non-readonly) on any content change
      if (!readonly && onUserInteraction) {
        console.log("Triggering user interaction from onChange");
        onUserInteraction();
      }

      onContentChange?.(value);
    },
    [onContentChange, onUserInteraction, readonly],
  );

  // Set initial content - use provided initialContent, fallback to sampleText for readonly, empty for writable
  useEffect(() => {
    const content = initialContent || (readonly ? sampleText : "");
    onContentChange?.(content);
  }, [onContentChange, readonly, initialContent]);

  // Reset editor content when resetTrigger changes
  useEffect(() => {
    if (editorRef.current && resetTrigger > 0) {
      const view = editorRef.current.view;
      if (view) {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: sampleText,
          },
        });
      }
    }
  }, [resetTrigger]);

  const extensions = [
    vim({ status: false }), // Disable vim status bar to prevent UI overlap
    javascript({ jsx: true }),
    oneDark, // Dark theme for terminal feel
    EditorView.lineWrapping,
    EditorView.editable.of(!readonly), // Make editor readonly if readonly prop is true
    keymap.of([
      {
        key: "h",
        run: () => {
          onMotionCapture("h");
          return false; // Let vim handle the motion
        },
      },
      {
        key: "j",
        run: () => {
          onMotionCapture("j");
          return false;
        },
      },
      {
        key: "k",
        run: () => {
          onMotionCapture("k");
          return false;
        },
      },
      {
        key: "l",
        run: () => {
          onMotionCapture("l");
          return false;
        },
      },
      {
        key: "w",
        run: () => {
          onMotionCapture("w");
          return false;
        },
      },
      {
        key: "b",
        run: () => {
          onMotionCapture("b");
          return false;
        },
      },
    ]),
    EditorView.theme({
      "&": {
        fontSize: "14px",
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      },
      ".cm-editor": {
        height: "400px",
        border: readonly
          ? "1px solid hsl(var(--muted-foreground))"
          : "1px solid hsl(var(--border))",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: readonly ? "hsl(var(--muted) / 0.3)" : null,
      },
      ".cm-scroller": {
        height: "100%",
      },
      ".cm-content": {
        padding: "16px",
        minHeight: "100%",
        cursor: readonly ? "default" : "text",
        userSelect: readonly ? "none" : "text",
        WebkitUserSelect: readonly ? "none" : "text",
      },
      ".cm-focused": {
        outline: "none",
      },
    }),
  ];

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (readonly) {
        // Prevent copy shortcuts in readonly mode
        if (
          (event.ctrlKey || event.metaKey) &&
          (event.key === "c" || event.key === "a" || event.key === "x")
        ) {
          event.preventDefault();
        }
      }
    },
    [readonly],
  );

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
      className="w-[480px] relative"
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      <CodeMirror
        ref={editorRef}
        value={initialContent || (readonly ? sampleText : "")}
        height="400px"
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
        }}
        theme={oneDark}
      />
      {readonly && (
        <Badge
          variant="secondary"
          className={cn(
            "absolute top-2 right-2 z-10",
            "text-xs font-medium",
            "bg-muted/90 text-muted-foreground",
            "border border-muted-foreground/20",
          )}
        >
          READ ONLY
        </Badge>
      )}
    </div>
  );
}
