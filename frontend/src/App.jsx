import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { jsPDF } from 'jspdf';
import 'xterm/css/xterm.css';

// Defaults for languages
const DEFAULT_CODE = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body {
      background-color: var(--bg-dark, #1e1e2e);
      color: var(--text-main, #cdd6f4);
      font-family: system-ui, sans-serif;
      text-align: center;
      margin-top: 50px;
    }
    h1 { color: #89b4fa; }
  </style>
</head>
<body>
  <h1>Hello World!</h1>
</body>
</html>`,
  python: 'print("Hello World!")',
  javascript: 'console.log("Hello World!");',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}',
  'c++': '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!\\n";\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello World!");\n    }\n}'
};

// Monaco language identifiers mapped to ours
const MONACO_LANGS = {
  html: 'html',
  python: 'python',
  javascript: 'javascript',
  c: 'c',
  'c++': 'cpp',
  java: 'java',
  csharp: 'csharp'
};

const LANGUAGES = [
  { id: 'html', name: 'HTML / CSS / JS', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg' },
  { id: 'python', name: 'Python', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' },
  { id: 'javascript', name: 'JavaScript (Node)', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg' },
  { id: 'c', name: 'C', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg' },
  { id: 'c++', name: 'C++', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg' },
  { id: 'java', name: 'Java', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg' },
  { id: 'csharp', name: 'C#', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg' }
];

function App() {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('html');
  const [sourceCode, setSourceCode] = useState('');
  
  // Specific sections for frontend web preview mode
  const [htmlCode, setHtmlCode] = useState('<h1>Hello World!</h1>');
  const [cssCode, setCssCode] = useState('body {\n  background-color: transparent;\n  font-family: system-ui, sans-serif;\n  text-align: center;\n  margin-top: 50px;\n}\n\nh1 {\n  color: #6366f1;\n}');
  const [jsCode, setJsCode] = useState('console.log("Hello World!");');

  const [activePane, setActivePane] = useState(null);

  const [previewContent, setPreviewContent] = useState('');
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [lastExecutionTime, setLastExecutionTime] = useState(null);

  const editorRef = useRef(null);
  const terminalRef = useRef(null);
  const termInstance = useRef(null);
  const activeWsRef = useRef(null);
  const pendingPdfExportRef = useRef(false);
  const dropdownRef = useRef(null);
  const executionStartRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Session timer - track workspace active time
  useEffect(() => {
    const sessionInterval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(sessionInterval);
  }, []);

  // Sync theme to document body for global CSS variables
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Helper to format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Sync theme to xterm.js instance
  useEffect(() => {
      if (termInstance.current) {
          termInstance.current.options.theme = theme === 'light' ? {
              background: '#ffffff',
              foreground: '#0f172a',
              cursor: '#6366f1'
          } : {
              background: '#0f111a',
              foreground: '#e2e8f0',
              cursor: '#6366f1'
          };
      }
  }, [theme]);

  // Initial xterm setup
  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: theme === 'light' ? '#ffffff' : '#0f111a',
        foreground: theme === 'light' ? '#0f172a' : '#e2e8f0',
        cursor: '#6366f1'
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 14,
      cursorBlink: true
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    term.writeln('\x1b[36mWelcome to Multi Compiler Interactive Terminal!\x1b[0m');
    term.writeln('Click "Run Code" to start your program.');

    termInstance.current = term;

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []); // Run once, then tracked via theme effect

  const stopCode = () => {
    let wasRunning = isRunning;
    if (activeWsRef.current) {
        if (activeWsRef.current.readyState === WebSocket.OPEN || activeWsRef.current.readyState === WebSocket.CONNECTING) {
            activeWsRef.current.close();
            wasRunning = true;
        }
        activeWsRef.current = null;
    }
    setIsRunning(false);
    if (wasRunning && termInstance.current) {
        termInstance.current.writeln('\r\n\x1b[31m[Execution manually stopped]\x1b[0m\r\n');
    }
  };

  const handleLanguageChange = (e) => {
    // Forcefully and unconditionally kill any running streams before switching environments
    stopCode();

    const newLang = e.target.value;
    setLanguage(newLang);
    setGeneratedImages([]);
    if (newLang !== 'html') {
        setSourceCode(DEFAULT_CODE[newLang]);
    }
    setIsError(false);
    setPreviewContent('');
    setActivePane(null);
    
    if (termInstance.current) {
        termInstance.current.reset();
        termInstance.current.writeln(`\x1b[35mSwitched to ${newLang}.\x1b[0m`);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleClearOutput = () => {
    if (termInstance.current) {
        termInstance.current.reset();
    }
    // Also explicitly wipe out preview content regardless of the current selected language in case it's lingering
    setPreviewContent('');
  };

  const runCode = () => {
    if (language !== 'html' && !sourceCode.trim()) return;
    setGeneratedImages([]);
    
    if (activeWsRef.current) {
        activeWsRef.current.close();
    }

    // Capture high-resolution start time for execution tracking
    executionStartRef.current = performance.now();

    if (language === 'html') {
        // Run completely fully on the browser rendering engine statically instead of WebSockets
        const combinedPreview = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { color: ${theme === 'light' ? '#000' : '#fff'}; }
${cssCode}
  </style>
</head>
<body>
${htmlCode}
  <script>
${jsCode}
  <\/script>
</body>
</html>`;
        setPreviewContent(combinedPreview);
        return;
    }

    setIsRunning(true);
    setIsError(false);
    
    const term = termInstance.current;
    term.reset();
    term.writeln('\x1b[33mConnecting to backend...\x1b[0m\r\n');

    // WebSocket connection to backend
    const API_URL = 'ws://localhost:5000/'; 
    const ws = new WebSocket(API_URL);
    activeWsRef.current = ws;

    let inputBuffer = '';

    // Canonical Mode Local Echo: We buffer user input entirely in the frontend
    // and only send a completed line to the backend upon hitting Enter.
    // This perfectly emulates a kernel TTY driver for Dumb Pipes!
    const inputDisposable = term.onData(data => {
        if (ws.readyState === WebSocket.OPEN) {
            for (let i = 0; i < data.length; i++) {
                const char = data[i];
                if (char === '\r' || char === '\n') {
                    term.write('\r\n');
                    ws.send(inputBuffer + '\n');
                    inputBuffer = '';
                } else if (char === '\x7F' || char === '\b') {
                    // Handle Backspace natively
                    if (inputBuffer.length > 0) {
                        inputBuffer = inputBuffer.slice(0, -1);
                        term.write('\b \b');
                    }
                } else if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E) || char >= '\u00a0') {
                    // Accumulate printable characters
                    inputBuffer += char;
                    term.write(char);
                }
            }
        }
    });

    ws.onopen = () => {
      term.clear();
      ws.send(JSON.stringify({
        type: 'init',
        language,
        sourceCode
      }));
    };

    ws.onmessage = (event) => {
        if (typeof event.data === 'string' && event.data.startsWith('__CODEXA_IMAGE__:')) {
            const parts = event.data.split(':');
            const filename = parts[1];
            const mimeType = parts[2];
            const base64 = parts.slice(3).join(':');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            setGeneratedImages(prev => [...prev, { filename, dataUrl }]);
            term.writeln(`\r\n\x1b[35m[Graphical Output Generated: ${filename} (See below)]\x1b[0m\r\n`);
            return;
        }
        term.write(event.data);
    };

    ws.onerror = () => {
        term.writeln('\r\n\x1b[31mTerminal WebSocket connection error! Is the backend running?\x1b[0m\r\n');
        setIsError(true);
        setIsRunning(false);
    };

    ws.onclose = () => {
        inputDisposable.dispose();
        // Calculate execution time
        if (executionStartRef.current) {
            const executionMs = performance.now() - executionStartRef.current;
            setLastExecutionTime(executionMs);
            executionStartRef.current = null;
        }
        setIsRunning(false);
        if (activeWsRef.current === ws) {
            activeWsRef.current = null;
        }

        if (pendingPdfExportRef.current) {
            pendingPdfExportRef.current = false;
            setTimeout(() => {
                generatePdf(true);
            }, 200);
        }
    };
  };

  const handleExportPdf = (includeOutput) => {
    setShowPdfModal(false);
    
    if (includeOutput && termInstance.current) {
        const buffer = termInstance.current.buffer.active;
        let text = '';
        for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i);
            if (line) text += line.translateToString(true).trim();
        }
        
        // Automatically compile and run code first if the terminal is essentially empty / untouched
        if (text.length < 5 || (text.includes('Switched to') && text.length < 50) || buffer.length <= 2) {
            if (sourceCode.trim() !== '') {
                pendingPdfExportRef.current = true;
                runCode();
                return;
            }
        }
    }
    
    generatePdf(includeOutput);
  };

  const generatePdf = (includeOutput) => {
    const doc = new jsPDF();
    let yPos = 15;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Source Code (${language.toUpperCase()})`, 10, yPos);
    yPos += 10;
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    
    const codeLines = doc.splitTextToSize(sourceCode || '/* No code */', 190);
    for (let i = 0; i < codeLines.length; i++) {
        if (yPos > 280) {
            doc.addPage();
            yPos = 15;
        }
        doc.text(codeLines[i], 10, yPos);
        yPos += 5;
    }
    
    if (includeOutput && termInstance.current) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 15;
        } else {
            yPos += 10;
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Terminal Output:", 10, yPos);
        yPos += 10;
        
        doc.setFont("courier", "normal");
        doc.setFontSize(10);
        
        let outputText = '';
        const buffer = termInstance.current.buffer.active;
        for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i);
            if (line) {
                outputText += line.translateToString(true) + '\n';
            }
        }
        outputText = outputText.replace(/\n+$/, '');
        
        const outLines = doc.splitTextToSize(outputText || "No output generated.", 190);
        for (let i = 0; i < outLines.length; i++) {
            if (yPos > 280) {
                doc.addPage();
                yPos = 15;
            }
            doc.text(outLines[i], 10, yPos);
            yPos += 5;
        }
    }
    
    doc.save(`CompileX_${language}_Export.pdf`);
  };

  const getPaneClassName = (paneName) => {
      if (activePane === null) return "web-pane default";
      return activePane === paneName ? "web-pane active" : "web-pane inactive";
  };

  const getActiveHeaderColor = (paneName) => {
      if (activePane === paneName) return theme === 'light' ? '#e2e8f0' : '#1e1e2e';
      return 'transparent';
  };

  return (
    <div className="app-container">
      {/* Navbar Section */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">&lt;/&gt;</div>
          <h1>Multi Compiler</h1>
        </div>
        
        <div className="controls">
          <div className="custom-dropdown" ref={dropdownRef}>
            <div className="dropdown-selected" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={LANGUAGES.find(l => l.id === language)?.logo} alt="" className="dropdown-logo" />
                <span>{LANGUAGES.find(l => l.id === language)?.name}</span>
              </div>
              <span className="dropdown-arrow">▼</span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {LANGUAGES.map((lang) => (
                  <div 
                    key={lang.id} 
                    className={`dropdown-item ${language === lang.id ? 'active' : ''}`}
                    onClick={(e) => {
                      setDropdownOpen(false);
                      handleLanguageChange({ target: { value: lang.id } });
                    }}
                  >
                    <img src={lang.logo} alt={lang.name} className="dropdown-logo" />
                    <span>{lang.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            className="theme-toggle-btn" 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          <button 
            className={isRunning ? "run-btn stop-btn" : "run-btn"} 
            onClick={isRunning ? stopCode : runCode} 
          >
            {isRunning ? (
              <>
                <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Stop
              </>
            ) : (
              "Run Code"
            )}
          </button>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginLeft: '1.5rem', paddingLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-main)', fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(sessionTime)}</span>
            </div>
            {lastExecutionTime !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Run</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{lastExecutionTime.toFixed(0)}ms</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Ide Area */}
      <main className="main-content">
        {/* Editor Pane */}
        <div className="pane editor-pane">
          {language === 'html' ? (
            <div className="web-pane-container">
              <div className={getPaneClassName('html')}>
                <div 
                  className="pane-header"
                  style={{ cursor: 'pointer', userSelect: 'none', background: getActiveHeaderColor('html'), transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  onClick={() => setActivePane(activePane === 'html' ? null : 'html')}
                  title="Click to expand/collapse"
                >
                  <div className="pane-header-icon"></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.8px' }}>index.html</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }} onClickCapture={() => setActivePane('html')}>
                  <Editor
                    height="100%"
                    language="html"
                    theme={theme === 'light' ? 'light' : 'vs-dark'}
                    value={htmlCode}
                    onChange={(val) => setHtmlCode(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineNumbersMinChars: 3, padding: { top: 16 } }}
                  />
                </div>
              </div>
              <div className={getPaneClassName('css')}>
                <div 
                  className="pane-header"
                  style={{ cursor: 'pointer', userSelect: 'none', background: getActiveHeaderColor('css'), transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  onClick={() => setActivePane(activePane === 'css' ? null : 'css')}
                  title="Click to expand/collapse"
                >
                  <div className="pane-header-icon"></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.8px' }}>style.css</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }} onClickCapture={() => setActivePane('css')}>
                  <Editor
                    height="100%"
                    language="css"
                    theme={theme === 'light' ? 'light' : 'vs-dark'}
                    value={cssCode}
                    onChange={(val) => setCssCode(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineNumbersMinChars: 3, padding: { top: 16 } }}
                  />
                </div>
              </div>
              <div className={getPaneClassName('js')}>
                <div 
                  className="pane-header"
                  style={{ cursor: 'pointer', userSelect: 'none', background: getActiveHeaderColor('js'), transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  onClick={() => setActivePane(activePane === 'js' ? null : 'js')}
                  title="Click to expand/collapse"
                >
                  <div className="pane-header-icon"></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.8px' }}>script.js</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }} onClickCapture={() => setActivePane('js')}>
                  <Editor
                    height="100%"
                    language="javascript"
                    theme={theme === 'light' ? 'light' : 'vs-dark'}
                    value={jsCode}
                    onChange={(val) => setJsCode(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineNumbersMinChars: 3, padding: { top: 16 } }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="pane-header-icon"></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.8px' }}>
                    {`source_code.${MONACO_LANGS[language] === 'python' ? 'py' : MONACO_LANGS[language] === 'javascript' ? 'js' : MONACO_LANGS[language] === 'c' ? 'c' : MONACO_LANGS[language] === 'java' ? 'java' : MONACO_LANGS[language] === 'csharp' ? 'cs' : 'cpp'}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <button 
                    className="clear-output-btn"
                    style={{ marginLeft: 0, padding: '0.5rem 0.9rem', fontSize: '0.75rem' }}
                    onClick={() => setSourceCode('')}
                    title="Clear Code"
                  >
                    Clear
                  </button>
                  <button 
                    className="clear-output-btn"
                    style={{ marginLeft: 0, padding: '0.5rem 0.9rem', fontSize: '0.75rem' }}
                    onClick={() => setShowPdfModal(true)}
                    title="Export Code to PDF"
                  >
                    Export PDF
                  </button>
                  <button 
                    className="clear-output-btn"
                    style={{ marginLeft: 0, padding: '0.5rem 0.9rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sourceCode);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    title="Copy code to clipboard"
                  >
                    {isCopied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="editor-container">
                <Editor
                  height="100%"
                  language={MONACO_LANGS[language]}
                  theme={theme === 'light' ? 'light' : 'vs-dark'}
                  value={sourceCode}
                  onChange={(val) => setSourceCode(val)}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16 }
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Terminal Pane */}
        <div className="side-pane">
          <div className="pane io-pane">
            <div className="pane-header output-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="pane-header-icon"></div>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.8px' }}>
                  {language === 'html' ? '🌐 Web Preview' : '⌨️ Terminal'}
                </span>
              </div>
              <button 
                className="clear-output-btn" 
                onClick={handleClearOutput}
                title="Clear Output"
                style={{ marginLeft: 'auto', padding: '0.5rem 0.9rem', fontSize: '0.75rem' }}
              >
                Clear
              </button>
            </div>
            
            {/* Live Terminal */}
            <div 
              ref={terminalRef} 
              style={{ 
                  flex: 1, 
                  padding: '1.2rem', 
                  overflow: 'hidden', 
                  background: theme === 'light' ? '#ffffff' : '#050810',
                  display: language === 'html' ? 'none' : 'block',
                  transition: 'background 0.3s ease'
              }}
            ></div>

            {/* Genarated Graphical Outputs */}
            {generatedImages.length > 0 && language !== 'html' && (
                <div style={{
                    padding: '1.2rem',
                    background: theme === 'light' ? '#f3f5f9' : '#161b26',
                    borderTop: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex',
                    gap: '1rem',
                    overflowX: 'auto',
                    minHeight: '200px',
                    scrollBehavior: 'smooth'
                }}>
                    {generatedImages.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', minWidth: 'fit-content', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                            <img 
                                src={img.dataUrl} 
                                alt={img.filename} 
                                style={{ 
                                    height: '240px', 
                                    borderRadius: '10px', 
                                    border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
                                    background: '#fff',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.target.style.boxShadow = '0 12px 36px rgba(99, 102, 241, 0.25), 0 0 1px rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'}
                            />
                            <a 
                                href={img.dataUrl} 
                                download={img.filename} 
                                className="run-btn" 
                                style={{ 
                                    padding: '0.6rem 1.2rem',
                                    fontSize: '0.85rem',
                                    textDecoration: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                ⬇️ Download
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {/* Browser Preview IFrame */}
            {language === 'html' && (
              <div style={{ flex: 1, backgroundColor: theme === 'light' ? '#ffffff' : '#050810', overflow: 'hidden', borderRadius: '0 0 12px 12px' }}>
                <iframe
                  title="Web Preview"
                  sandbox="allow-scripts allow-modals allow-popups"
                  srcDoc={previewContent}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                    background: theme === 'light' ? '#ffffff' : '#050810'
                  }}
                />
              </div>
            )}
            
          </div>
        </div>
      </main>

      {/* PDF Export Modal */}
      {showPdfModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{
            background: theme === 'light' ? '#ffffff' : '#0f1419',
            color: theme === 'light' ? '#0f172a' : '#f0f4f9',
            padding: '2rem', 
            borderRadius: '14px', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.1)',
            width: '100%',
            maxWidth: '380px', 
            textAlign: 'center',
            border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.2rem',
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <h3 style={{ margin: '0', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px' }}>Export as PDF</h3>
            <p style={{ margin: '0', fontSize: '0.95rem', opacity: 0.8, lineHeight: '1.6' }}>
              Include terminal output with your source code?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8px', alignItems: 'stretch' }}>
              <button 
                className="run-btn" 
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem', justifyContent: 'center', borderRadius: '8px' }}
                onClick={() => handleExportPdf(true)}
              >
                ✓ With Output
              </button>
              <button 
                className="clear-output-btn" 
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem', justifyContent: 'center', textAlign: 'center', borderRadius: '8px' }}
                onClick={() => handleExportPdf(false)}
              >
                ✕ Without Output
              </button>
              <button 
                style={{ 
                  marginTop: '4px', background: 'transparent', border: 'none', 
                  color: theme === 'light' ? '#64748b' : '#8b94a8', cursor: 'pointer',
                  padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500',
                  width: '100%', boxSizing: 'border-box', textAlign: 'center',
                  transition: 'all 0.2s ease',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => e.target.style.background = theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => setShowPdfModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            transform: translateY(20px);
            opacity: 0;
          }
          to { 
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
