# BigQuery Release Notes Dashboard

A premium, interactive web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that aggregates, filters, and formats official Google Cloud BigQuery release notes. The application includes a custom tweet composer to select and share specific updates directly to X / Twitter.

---

## 🌟 Features

*   **Real-time RSS/Atom Aggregation**: Automatically fetches the official BigQuery feed on the server side to keep you updated.
*   **Granular Update Slicing**: Splits daily release notes into individual update cards based on their category (e.g. *Features*, *Deprecations*, *Fixes*, *Changes*).
*   **Fast Search & Filters**: Search updates by keywords (like "Gemini") or filter cards instantly by their category type.
*   **Interactive Tweet Composer**: Select any card to open a custom composer modal where you can edit a draft tweet, view live character limits (280 max), and post to X / Twitter via Web Intents.
*   **Premium Sleek Design**: Modern dark theme utilizing Google Fonts (`Outfit` & `Inter`), responsive flex layouts, glassmorphic cards, and smooth CSS animations.
*   **Security Built-In**: Implements recursive client-side DOM sanitization (no `innerHTML`), safe XML parsing (no DTD resolution), and HTTP security headers (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`).

---

## 🛠️ Tech Stack

*   **Backend**: Python, Flask
*   **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6, Vanilla)
*   **Dependencies**: Flask (Minimal setup, feed parsing is done using built-in Python standard libraries `urllib.request` and `xml.etree.ElementTree`).

---

## 📂 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask backend server & feed parsing logic
├── requirements.txt        # Python dependency declarations
├── .gitignore              # Git ignore rules for virtual env & caches
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Semantic HTML structure & modal overlay
└── static/
    ├── app.js              # Client-side API fetch, safe render, and search controls
    └── style.css           # Custom CSS styles, theme tokens, and animations
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3.8+ installed on your system.

### Installation

1. Clone or download the repository into your workspace.
2. Initialize and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

Start the local Flask development server:
```bash
python app.py
```

Open your web browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🛡️ Security Implementation Details

*   **XSS Protection (Frontend)**: The application avoids `innerHTML` assignments when parsing external feed markup. It implements a recursive renderer in `static/app.js` using `DOMParser` to whitelist approved HTML tags and safely set `textContent` and attributes (validating safe `href` schemas).
*   **XXE Protection (Backend)**: The backend utilizes standard `xml.etree.ElementTree` to parse the Atom feed. The parser does not expand external DTD entities, protecting the host system from XML injection vectors.
*   **Local Host Binding**: Flask is explicitly configured to listen only on `127.0.0.1` to ensure local isolation.
*   **Response Headers**:
    *   `X-Content-Type-Options: nosniff` (Mitigates MIME sniffing attacks)
    *   `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking)
    *   `Content-Security-Policy (CSP)`: Strictly controls scripts, styles, connections, and asset loading to authorized origins only.
