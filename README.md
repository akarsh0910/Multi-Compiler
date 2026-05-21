# Multi-compiler 

A modern, high-performance online multi-language code playground and execution engine that allows users to write, compile, and run code directly in their browser. 

---

##  About

**Multi-compiler** is a web-based sandbox built to eliminate the friction of local software setups for beginners. It provides an instantaneous execution environment for multiple programming languages with a side-by-side live terminal experience. Designed with clean modular architecture, it isolates frontend UI states from heavy compilation operations on the backend.

---

##  Core Features

*Simultaneous Multi-Language Support:** Write and run execution-ready code for Java, Python, JavaScript, C, C++, and C#.
*Web Sandbox Platform:** Compiles full web-stack snippets (`HTML`, `CSS`, `JS`) in real-time right inside the app frame.
*Real-Time Stream Processing:** Fast, interactive handling of program execution logs and input/output parameters.
*Responsive IDE Interface:** Side-by-side text editor and terminal panel layout tailored for high scannability.
*Real-Time Performance Tracking:** Features an active workspace session timer to monitor debugging duration alongside a high-precision compilation speed tracker displaying exact code execution runtimes in milliseconds.
---

##  Upcoming Innovations (Roadmap)

We are actively engineering two revolutionary educational components to optimize the coding experience for beginners:

### 1. Live Dry Run (State Inspector) 
A visual runtime debugger that breaks down complex execution logic. As the code steps forward, it dynamically renders a visual **Symbol Table** mapping variables, data types, and current values held in system memory to eliminate tracing guesswork.

### 2. AI Code Diagnostic Agent 
An intelligent, context-aware chatbot helper integrated directly into the Live Terminal. Instead of traditional, confusing compiler errors (like raw `cannot find symbol` logs), the agent translates technical syntax breakages into intuitive, human-readable explanations with immediate debugging hints.

---

## Supported Compilation Environments

* **Java** (Requires JDK runtime setup)
* **Python** * **C / C++**
* **C#** (`.NET` runtime)
* **JavaScript & Web Technologies** (`Node.js`, standard HTML/CSS web frameworks)

---

## Technology Stack

### Frontend Architecture
* **React.js** (Component-driven UI)
* **Vite** (Next-gen frontend toolchain)
* **Tailwind CSS** (Modern utility styling)

### Backend Engine
* **Node.js** & **Express.js** (Server layer and child process allocation)
* **WebSockets** (Bi-directional pipelines for instant execution logs)

---

##  Project Structure


Multi-compiler/
 ├── backend/        # Node.js compiler microservice & child processes
 ├── frontend/       # React + Vite web user interface
 ├── package.json    # Global configuration manifest
 └── README.md       # Project documentation

 Created by- Akarsh Singh Sisoudia
