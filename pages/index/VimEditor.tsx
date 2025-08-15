import { useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vim } from "@replit/codemirror-vim";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

const sampleText = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);

// Practice motions here:
// h j k l - basic movement
// w b e - word motions  
// dd yy - line operations

class Calculator {
  constructor() {
    this.result = 0;
  }
  
  add(value) {
    this.result += value;
    return this;
  }
  
  getResult() {
    return this.result;
  }
}

const calc = new Calculator();
console.log("Result:", calc.add(5).getResult());`;

export function VimEditor() {
  const editorRef = useRef<any>();

  const onChange = useCallback((value: string) => {
    // Here we could capture and parse motions
    console.log("Editor value changed:", value.length);
  }, []);

  const extensions = [
    vim({ status: true }), // Enable vim with status bar
    javascript({ jsx: true }),
    oneDark, // Dark theme for terminal feel
    EditorView.lineWrapping,
    EditorView.theme({
      '&': {
        fontSize: '14px',
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      },
      '.cm-editor': {
        height: '400px',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        overflow: 'hidden',
      },
      '.cm-scroller': {
        height: '100%',
      },
      '.cm-content': {
        padding: '16px',
        minHeight: '100%',
      },
      '.cm-focused': {
        outline: 'none',
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