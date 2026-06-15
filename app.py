import os
import re
import urllib.request
import xml.etree.ElementTree as ET
import logging
from flask import Flask, jsonify, render_template, make_response

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Security configuration
# Note: Since this is a local utility without persistent sessions or accounts,
# we generate a secure ephemeral secret key.
app.config['SECRET_KEY'] = os.urandom(32)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_tags(text):
    """Remove HTML tags for plain text representations (like tweets)."""
    if not text:
        return ""
    # Remove tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Unescape common HTML entities
    clean = clean.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return clean.strip()

def split_content_into_updates(content_html, date_str):
    """Split the daily release content HTML by h3 headers to isolate individual updates."""
    if not content_html:
        return []
    
    parts = re.split(r'(<h3>.*?</h3>)', content_html)
    updates = []
    
    # If no <h3> elements are found, treat the whole content as one update
    if len(parts) == 1:
        text_content = clean_html_tags(content_html)
        updates.append({
            'id': f"{date_str.replace(' ', '_').replace(',', '')}_0",
            'type': 'Update',
            'content_html': content_html.strip(),
            'plain_text': text_content
        })
        return updates

    # parts[0] is text before first h3 (typically empty)
    i = 1
    index = 0
    while i < len(parts):
        header_html = parts[i]
        match_type = re.search(r'<h3>(.*?)</h3>', header_html)
        update_type = match_type.group(1) if match_type else 'Update'
        
        content = parts[i+1] if i + 1 < len(parts) else ''
        content = content.strip()
        
        text_content = clean_html_tags(content)
        
        updates.append({
            'id': f"{date_str.replace(' ', '_').replace(',', '')}_{index}",
            'type': update_type,
            'content_html': content,
            'plain_text': text_content
        })
        index += 1
        i += 2
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Fetch the feed server-side (BFF Pattern)
        logger.info("Fetching BigQuery release notes feed...")
        req = urllib.request.Request(
            FEED_URL,
            headers={'User-Agent': 'BigQueryReleaseNotesViewer/1.0'}
        )
        # Timeout after 10 seconds to prevent hanging requests
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        # Parse XML safely. ET.fromstring does not resolve external entities in python 3.
        # This mitigates XXE vulnerabilities.
        root = ET.fromstring(xml_data)
        
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        releases = []
        for entry in root.findall('atom:entry', ns):
            title_elem = entry.find('atom:title', ns)
            updated_elem = entry.find('atom:updated', ns)
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry.find("atom:link", ns)
            link = link_elem.attrib.get('href', '') if link_elem is not None else ''
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ''
            
            date_str = title_elem.text if title_elem is not None else 'Unknown Date'
            updated_str = updated_elem.text if updated_elem is not None else ''
            
            # Split the daily content HTML into individual update cards
            updates = split_content_into_updates(content_html, date_str)
            
            releases.append({
                'date': date_str,
                'updated': updated_str,
                'link': link,
                'updates': updates
            })
            
        return jsonify({
            'status': 'success',
            'releases': releases
        })
        
    except urllib.error.URLError as e:
        logger.error(f"Network error fetching feed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Unable to connect to Google Cloud documentation feed. Please check your internet connection.'
        }), 503
    except ET.ParseError as e:
        logger.error(f"XML parsing error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to parse the release notes feed data.'
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected server error occurred.'
        }), 500

# Apply security headers to all HTTP responses
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "script-src 'self'; "
        "connect-src 'self';"
    )
    return response

if __name__ == '__main__':
    # Listen only on localhost/127.0.0.1 for local security testing/development
    # Port 5000 is default for Flask
    logger.info("Starting Flask application on 127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
