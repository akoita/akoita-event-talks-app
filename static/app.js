/**
 * BigQuery Release Notes Dashboard - Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let state = {
        releases: [],
        filter: 'all',
        searchQuery: ''
    };

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const btnExport = document.getElementById('btn-export');
    const iconRefreshSvg = document.getElementById('icon-refresh-svg');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const statusContainer = document.getElementById('status-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const btnRetry = document.getElementById('btn-retry');
    const releasesTimeline = document.getElementById('releases-timeline');

    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelTweet = document.getElementById('btn-cancel-tweet');
    const btnSubmitTweet = document.getElementById('btn-submit-tweet');
    const charCount = document.getElementById('char-count');

    // Safe HTML Renderer (No innerHTML, strictly custom DOM nodes mapping)
    function renderHtmlSafely(htmlString, parentElement) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        const SAFE_TAGS = new Set([
            'P', 'CODE', 'PRE', 'UL', 'OL', 'LI', 'A', 'STRONG', 
            'EM', 'SPAN', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
            'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV'
        ]);
        
        function buildSafeDom(node, parent) {
            // Text node
            if (node.nodeType === Node.TEXT_NODE) {
                parent.appendChild(document.createTextNode(node.nodeValue));
                return;
            }
            
            // Element node
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toUpperCase();
                if (SAFE_TAGS.has(tagName)) {
                    const safeElement = document.createElement(tagName.toLowerCase());
                    
                    // Specific safe attribute copying
                    if (tagName === 'A') {
                        const href = node.getAttribute('href');
                        // Validate href to prevent javascript: pseudo-protocol XSS
                        if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/') || href.startsWith('#'))) {
                            safeElement.setAttribute('href', href);
                            safeElement.setAttribute('target', '_blank');
                            safeElement.setAttribute('rel', 'noopener noreferrer');
                        }
                    }
                    
                    // Process children
                    for (let i = 0; i < node.childNodes.length; i++) {
                        buildSafeDom(node.childNodes[i], safeElement);
                    }
                    
                    parent.appendChild(safeElement);
                } else {
                    // Skip tag but parse children
                    for (let i = 0; i < node.childNodes.length; i++) {
                        buildSafeDom(node.childNodes[i], parent);
                    }
                }
            }
        }
        
        // Clear previous content
        parentElement.textContent = '';
        const body = doc.body;
        for (let i = 0; i < body.childNodes.length; i++) {
            buildSafeDom(body.childNodes[i], parentElement);
        }
    }

    // Fetch Release Notes from backend BFF
    async function fetchReleases() {
        showLoading();
        btnRefresh.disabled = true;
        iconRefreshSvg.classList.add('spinning');
        
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.status === 'success') {
                state.releases = data.releases;
                renderTimeline();
            } else {
                throw new Error(data.message || 'Failed to retrieve release data.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(error.message || 'An error occurred while fetching the release notes. Please check your server or connection.');
        } finally {
            iconRefreshSvg.classList.remove('spinning');
            btnRefresh.disabled = false;
        }
    }

    // UI Loading State Controls
    function showLoading() {
        statusContainer.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        releasesTimeline.classList.add('hidden');
        if (btnExport) btnExport.disabled = true;
    }

    // UI Status Helpers
    function hideStatus() {
        statusContainer.classList.add('hidden');
        releasesTimeline.classList.remove('hidden');
    }

    function showError(msg) {
        statusContainer.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        errorMessage.classList.remove('hidden');
        errorText.textContent = msg;
        releasesTimeline.classList.add('hidden');
        if (btnExport) btnExport.disabled = true;
    }

    // Render Timeline with Filters & Search query applied
    function renderTimeline() {
        // Clear timeline
        releasesTimeline.textContent = '';
        
        let hasAnyVisibleRelease = false;

        state.releases.forEach(day => {
            // Filter sub-updates
            const filteredUpdates = day.updates.filter(update => {
                // Apply Category Filter
                const categoryMatches = state.filter === 'all' || 
                    update.type.toLowerCase() === state.filter.toLowerCase();
                
                // Apply Text Search Filter
                const textMatches = state.searchQuery === '' || 
                    update.plain_text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                    update.type.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                    day.date.toLowerCase().includes(state.searchQuery.toLowerCase());
                
                return categoryMatches && textMatches;
            });

            // If day has matching updates, render it
            if (filteredUpdates.length > 0) {
                hasAnyVisibleRelease = true;

                // Create day group container
                const dayGroup = document.createElement('article');
                dayGroup.classList.add('day-group');

                // Day header elements
                const dayHeader = document.createElement('div');
                dayHeader.classList.add('day-header');

                const dayMarker = document.createElement('div');
                dayMarker.classList.add('day-marker');
                
                const dayDate = document.createElement('time');
                dayDate.classList.add('day-date');
                dayDate.textContent = day.date;
                dayDate.setAttribute('datetime', day.updated || '');

                dayHeader.appendChild(dayMarker);
                dayHeader.appendChild(dayDate);
                dayGroup.appendChild(dayHeader);

                // Add updates as cards
                filteredUpdates.forEach(update => {
                    const card = document.createElement('div');
                    card.classList.add('update-card');
                    card.setAttribute('id', `card-${update.id}`);

                    // Top row
                    const cardTop = document.createElement('div');
                    cardTop.classList.add('card-top');

                    const badge = document.createElement('span');
                    badge.classList.add('badge', `badge-${update.type.toLowerCase()}`);
                    badge.textContent = update.type;

                    cardTop.appendChild(badge);

                    // Add external anchor link if available
                    if (day.link) {
                        const extLink = document.createElement('a');
                        extLink.classList.add('btn-external-link');
                        extLink.setAttribute('href', day.link);
                        extLink.setAttribute('target', '_blank');
                        extLink.setAttribute('rel', 'noopener noreferrer');
                        extLink.setAttribute('aria-label', `View original release note page for ${day.date}`);
                        
                        // External Link SVG icon
                        const extSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        extSvg.setAttribute('viewBox', '0 0 24 24');
                        extSvg.setAttribute('width', '18');
                        extSvg.setAttribute('height', '18');
                        extSvg.setAttribute('fill', 'none');
                        extSvg.setAttribute('stroke', 'currentColor');
                        extSvg.setAttribute('stroke-width', '2');
                        extSvg.setAttribute('stroke-linecap', 'round');
                        extSvg.setAttribute('stroke-linejoin', 'round');
                        
                        const extPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        extPath1.setAttribute('d', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6');
                        const extPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                        extPoly.setAttribute('points', '15 3 21 3 21 9');
                        const extLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        extLine.setAttribute('x1', '10');
                        extLine.setAttribute('y1', '14');
                        extLine.setAttribute('x2', '21');
                        extLine.setAttribute('y2', '3');

                        extSvg.appendChild(extPath1);
                        extSvg.appendChild(extPoly);
                        extSvg.appendChild(extLine);
                        extLink.appendChild(extSvg);
                        
                        cardTop.appendChild(extLink);
                    }

                    card.appendChild(cardTop);

                    // Content
                    const cardContent = document.createElement('div');
                    cardContent.classList.add('card-content');
                    renderHtmlSafely(update.content_html, cardContent);
                    card.appendChild(cardContent);

                    // Actions
                    const cardActions = document.createElement('div');
                    cardActions.classList.add('card-actions');

                    // Copy Button
                    const btnCopyTrigger = document.createElement('button');
                    btnCopyTrigger.classList.add('btn', 'btn-copy-trigger');

                    const copySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    copySvg.setAttribute('viewBox', '0 0 24 24');
                    copySvg.setAttribute('width', '14');
                    copySvg.setAttribute('height', '14');
                    copySvg.setAttribute('fill', 'none');
                    copySvg.setAttribute('stroke', 'currentColor');
                    copySvg.setAttribute('stroke-width', '2');
                    copySvg.setAttribute('stroke-linecap', 'round');
                    copySvg.setAttribute('stroke-linejoin', 'round');

                    const copyRect = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    copyRect.setAttribute('x', '9');
                    copyRect.setAttribute('y', '9');
                    copyRect.setAttribute('width', '13');
                    copyRect.setAttribute('height', '13');
                    copyRect.setAttribute('rx', '2');
                    copyRect.setAttribute('ry', '2');

                    const copyPath = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    copyPath.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

                    copySvg.appendChild(copyRect);
                    copySvg.appendChild(copyPath);

                    const copyTextSpan = document.createElement('span');
                    copyTextSpan.textContent = 'Copy';

                    btnCopyTrigger.appendChild(copySvg);
                    btnCopyTrigger.appendChild(copyTextSpan);

                    btnCopyTrigger.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            await navigator.clipboard.writeText(update.plain_text);
                            
                            // Visual feedback
                            btnCopyTrigger.classList.add('copied');
                            copyTextSpan.textContent = 'Copied!';
                            
                            setTimeout(() => {
                                btnCopyTrigger.classList.remove('copied');
                                copyTextSpan.textContent = 'Copy';
                            }, 2000);
                        } catch (err) {
                            console.error('Failed to copy to clipboard:', err);
                        }
                    });

                    // Tweet Button
                    const btnTweetTrigger = document.createElement('button');
                    btnTweetTrigger.classList.add('btn', 'btn-tweet-trigger');
                    
                    // Share icon svg
                    const shareSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    shareSvg.setAttribute('viewBox', '0 0 24 24');
                    shareSvg.setAttribute('width', '14');
                    shareSvg.setAttribute('height', '14');
                    shareSvg.setAttribute('fill', 'currentColor');
                    
                    const sharePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    sharePath.setAttribute('d', 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z');
                    shareSvg.appendChild(sharePath);

                    const btnTextSpan = document.createElement('span');
                    btnTextSpan.textContent = 'Tweet';

                    btnTweetTrigger.appendChild(shareSvg);
                    btnTweetTrigger.appendChild(btnTextSpan);
                    
                    btnTweetTrigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // Apply active select border visual to card
                        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        
                        openTweetComposer(update, day.date, day.link);
                    });

                    cardActions.appendChild(btnCopyTrigger);
                    cardActions.appendChild(btnTweetTrigger);
                    card.appendChild(cardActions);

                    // Support card click select visual
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                    });

                    dayGroup.appendChild(card);
                });

                releasesTimeline.appendChild(dayGroup);
            }
        });

        // Handle empty results
        if (!hasAnyVisibleRelease) {
            const noResultsCard = document.createElement('div');
            noResultsCard.classList.add('no-results');
            
            const noResultsTitle = document.createElement('h3');
            noResultsTitle.textContent = 'No Release Notes Found';
            
            const noResultsText = document.createElement('p');
            noResultsText.textContent = 'Try adjusting your search filter or key terms.';
            
            noResultsCard.appendChild(noResultsTitle);
            noResultsCard.appendChild(noResultsText);
            releasesTimeline.appendChild(noResultsCard);
        }

        if (btnExport) btnExport.disabled = state.releases.length === 0;
        hideStatus();
    }

    // Compose default tweet and open modal overlay
    function openTweetComposer(update, date, link) {
        // Construct tweet snippet
        const maxSnippetLength = 160;
        let snippet = update.plain_text;
        
        if (snippet.length > maxSnippetLength) {
            snippet = snippet.substring(0, maxSnippetLength).trim() + '...';
        }

        // Format templates: "BigQuery [Type] Update ([Date]): [Snippet] [Link] #BigQuery"
        const defaultTweet = `Google BigQuery ${update.type} Update (${date}):\n"${snippet}"\n\nDetails: ${link || 'https://cloud.google.com/bigquery'}\n\n#BigQuery #GoogleCloud`;
        
        tweetTextarea.value = defaultTweet;
        updateCharCount();
        
        // Show Modal
        tweetModal.classList.remove('hidden');
        tweetModal.setAttribute('aria-hidden', 'false');
        tweetTextarea.focus();
    }

    // Modal Closing Controls
    function closeTweetModal() {
        tweetModal.classList.add('hidden');
        tweetModal.setAttribute('aria-hidden', 'true');
        // Remove active select card border
        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    }

    // Tweet character counter
    function updateCharCount() {
        const length = tweetTextarea.value.length;
        charCount.textContent = length;
        
        // Color indicators
        if (length > 280) {
            charCount.className = 'char-counter danger';
            btnSubmitTweet.disabled = true;
        } else if (length > 250) {
            charCount.className = 'char-counter warning';
            btnSubmitTweet.disabled = false;
        } else {
            charCount.className = 'char-counter';
            btnSubmitTweet.disabled = false;
        }
    }

    // Launch Twitter Web Intent URL
    function publishTweet() {
        const text = tweetTextarea.value;
        if (text.length > 280) return;
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    }

    // Export Currently Filtered/Searched Release Notes to CSV
    function exportToCsv() {
        if (state.releases.length === 0) return;

        const csvRows = [];
        
        // CSV Headers (Escaped)
        csvRows.push(['Date', 'Type', 'Description', 'Link'].map(val => `"${val.replace(/"/g, '""')}"`).join(','));

        state.releases.forEach(day => {
            day.updates.forEach(update => {
                // Apply active filters to exported dataset
                const categoryMatches = state.filter === 'all' || 
                    update.type.toLowerCase() === state.filter.toLowerCase();
                
                const textMatches = state.searchQuery === '' || 
                    update.plain_text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                    update.type.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                    day.date.toLowerCase().includes(state.searchQuery.toLowerCase());
                
                if (categoryMatches && textMatches) {
                    const row = [
                        day.date,
                        update.type,
                        update.plain_text.replace(/\r?\n|\r/g, ' '), // replace line breaks with spaces for clean CSV formatting
                        day.link
                    ];
                    csvRows.push(row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','));
                }
            });
        });

        if (csvRows.length <= 1) {
            alert('No release notes match the current filters to export.');
            return;
        }

        // Generate download Blob to support arbitrary file sizes securely
        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_releases_${state.filter}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Event Listeners Configuration
    btnRefresh.addEventListener('click', fetchReleases);
    btnRetry.addEventListener('click', fetchReleases);
    if (btnExport) btnExport.addEventListener('click', exportToCsv);
    
    // Search input throttling
    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        state.searchQuery = e.target.value;
        searchTimeout = setTimeout(renderTimeline, 200);
    });

    // Category button filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.getAttribute('data-filter');
            renderTimeline();
        });
    });

    // Tweet Modal closures
    btnCloseModal.addEventListener('click', closeTweetModal);
    btnCancelTweet.addEventListener('click', closeTweetModal);
    btnSubmitTweet.addEventListener('click', publishTweet);
    tweetTextarea.addEventListener('input', updateCharCount);

    // Escape Key closure support
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Close on overlay click
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Initial Load execution
    fetchReleases();
});
