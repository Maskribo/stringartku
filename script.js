/* CSS Modern dengan CSS Variables untuk Dark Mode */
:root {
    --bg-color: #121212;
    --panel-bg: #1e1e1e;
    --text-main: #f5f5f5;
    --text-muted: #aaaaaa;
    --accent: #bb86fc;
    --accent-hover: #9965f4;
    --border: #333333;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
    background-color: var(--bg-color);
    color: var(--text-main);
    display: flex;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
}

.container {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 20px;
    max-width: 1200px;
    width: 100%;
}

/* Area Canvas */
.canvas-container {
    background-color: var(--panel-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

canvas {
    background-color: #ffffff;
    max-width: 100%;
    height: auto;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

/* Area Kontrol Panel */
.controls {
    background-color: var(--panel-bg);
    padding: 25px;
    border-radius: 12px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    height: fit-content;
}

h2 { font-size: 1.5rem; margin-bottom: 5px; color: var(--accent); }
.control-group { display: flex; flex-direction: column; gap: 8px; }

label { font-size: 0.9rem; font-weight: 600; }
.val-display { font-weight: normal; color: var(--accent); float: right; }

input[type="range"] {
    width: 100%;
    cursor: pointer;
    accent-color: var(--accent);
}

input[type="file"] {
    font-size: 0.9rem;
    color: var(--text-muted);
    file-selector-button: border: none;
    cursor: pointer;
}

input[type="file"]::file-selector-button {
    background-color: #333;
    color: #fff;
    padding: 8px 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: 0.3s;
}
input[type="file"]::file-selector-button:hover { background-color: #444; }

button {
    background-color: var(--accent);
    color: #000;
    border: none;
    padding: 12px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: center;
}

button:hover { background-color: var(--accent-hover); }
button:disabled { background-color: #555; color: #888; cursor: not-allowed; }

.export-group {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.export-group button {
    background-color: #333;
    color: #fff;
    font-size: 0.85rem;
}
.export-group button:hover { background-color: #444; }

.status {
    font-size: 0.9rem;
    color: var(--text-muted);
    text-align: center;
    margin-top: 10px;
}

/* Responsif */
@media (max-width: 850px) {
    .container { grid-template-columns: 1fr; }
    .canvas-container { min-height: 400px; }
}
