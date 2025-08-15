import { useCallback, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vim } from "@replit/codemirror-vim";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";

const sampleText = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

interface VimEditorProps {
  onMotionCapture: (motion: any) => void;
  resetTrigger: number;
}

export function VimEditor({ onMotionCapture, resetTrigger }: VimEditorProps) {
  const editorRef = useRef<any>(null);

  const onChange = useCallback((value: string) => {
    // Here we could capture and parse motions
    console.log("Editor value changed:", value.length);
  }, []);

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
    vim({ status: true }), // Enable vim with status bar
    javascript({ jsx: true }),
    oneDark, // Dark theme for terminal feel
    EditorView.lineWrapping,
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
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        overflow: "hidden",
      },
      ".cm-scroller": {
        height: "100%",
      },
      ".cm-content": {
        padding: "16px",
        minHeight: "100%",
      },
      ".cm-focused": {
        outline: "none",
      },
    }),
  ];

  return (
    <div className="w-[480px]">
      <CodeMirror
        ref={editorRef}
        value={sampleText}
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
    </div>
  );
}
