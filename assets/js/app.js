// The Inkwell — SPA Application with GitHub API Auto-Discovery
// CRITICAL FIXES APPLIED

const BASE_URL = '/the-inkwell';
const GITHUB_OWNER = 'writerjoshua';
const GITHUB_REPO = 'the-inkwell';
const GITHUB_API = 'https://api.github.com/repos';
const POSTS_PATH = 'assets/posts';
const GITHUB_TOKEN = ''; // Set to your token to avoid rate limiting

// Post cache to avoid re-fetching
const postCache = {};
let currentSourcePage = 'home';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupSideNav();
    loadPage('home');
    updateMetaTags('The Inkwell', 'Poetry and Prose by American Romance Writer, Beau Holliday', '/assets/media/beauholliday.jpg');
});

// Setup Side Navigation
function setupSideNav() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeNav = document.getElementById('close-nav');
    const sideNav = document.getElementById('side-nav');
    const navLinks = document.querySelectorAll('.nav-link');
    const sectionBtns = document.querySelectorAll('.nav-section-btn');

    menuToggle.addEventListener('click', () => {
        sideNav.classList.toggle('open');
    });

    closeNav.addEventListener('click', () => {
        sideNav.classList.remove('open');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            loadPage(page);
            sideNav.classList.remove('open');
        });
    });

    sectionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            const menu = document.getElementById(`${section}-menu`);
            btn.classList.toggle('open');
            menu.classList.toggle('open');
        });
    });
}

// Setup Bottom Navigation
function setupNavigation() {
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            loadPage(page);
        });
    });
}

// Load Page
function loadPage(page) {
    // FIX #2: Clear active state from both navs separately
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    
    // Set active on ALL matching elements
    document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.classList.add('active'));

    // Store current source page for back navigation (FIX #5)
    currentSourcePage = page;

    const contentEl = document.getElementById('content');
    contentEl.innerHTML = '<div class="loading">Loading...</div>';
    
    if (page === 'home') {
        renderHome().then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            handleError(contentEl, err, 'Error loading home');
        });
    } else if (page === 'everything') {
        renderFeed().then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            handleError(contentEl, err, 'Error loading posts');
        });
    } else if (page === 'about-beau' || page === 'library') {
        renderMarkdownPage(page === 'about-beau' ? 'about' : 'library').then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            handleError(contentEl, err, 'Error loading page');
        });
    } else {
        renderCollection(page).then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            handleError(contentEl, err, 'Error loading posts');
        });
    }
}

// Error handling with more specific messages
function handleError(contentEl, err, defaultMsg) {
    console.error(defaultMsg, err);
    let msg = defaultMsg + '. 💌';
    
    if (err.message?.includes('rate limit') || err.status === 403) {
        msg = 'Too many requests. Please try again in a moment. 💌';
    } else if (err.message?.includes('network') || err.message?.includes('Failed to fetch')) {
        msg = 'Network connection error. Please check your connection. 💌';
    }
    
    contentEl.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
}

// Fetch files from GitHub API
async function fetchFilesFromGitHub(path) {
    try {
        const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {};
        const url = `${GITHUB_API}/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}/${path}`;
        const response = await fetch(url, { headers });
        
        // FIX #3: Check for rate limiting
        if (response.status === 403) {
            console.error('GitHub API rate limit exceeded');
            const error = new Error('GitHub API rate limit exceeded');
            error.status = 403;
            throw error;
        }

        if (!response.ok) {
            console.debug(`GitHub API: ${path} not found (${response.status})`); // FIX #13: Use debug instead of log
            return [];
        }

        const files = await response.json();
        
        return Array.isArray(files) 
            ? files.filter(f => f.name.endsWith('.md') && f.type === 'file')
            : [];
    } catch (err) {
        console.error(`Error fetching from GitHub API for ${path}:`, err);
        throw err;
    }
}

// Fetch markdown files with caching
async function fetchMarkdownFiles(type) {
    // FIX #4: Check cache first
    if (postCache[type]) {
        return postCache[type];
    }

    try {
        const mdFiles = await fetchFilesFromGitHub(type);

        if (mdFiles.length === 0) {
            console.log(`No markdown files found in ${POSTS_PATH}/${type}`);
            postCache[type] = [];
            return [];
        }

        const posts = [];

        for (const file of mdFiles) {
            try {
                const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/assets/posts/${type}/${file.name}`);
                if (response.ok) {
                    const markdown = await response.text();
                    const post = parseMarkdown(markdown, type, file.name);
                    if (post) posts.push(post);
                }
            } catch (err) {
                console.log(`Error loading ${type}/${file.name}:`, err);
            }
        }

        // Store in cache
        postCache[type] = posts;
        return posts;
    } catch (err) {
        console.log(`Error in fetchMarkdownFiles for ${type}:`, err);
        throw err;
    }
}

// Fetch markdown page
async function fetchMarkdownPage(filename) {
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/assets/posts/${filename}/${filename}.md`);
        if (!response.ok) {
            return `<div class="empty-state"><p>Page not found. 💌</p></div>`;
        }

        const markdown = await response.text();
        const { metadata, content } = parsePageMarkdown(markdown);

        return `
            <div style="max-width: 900px; margin: 0 auto;">
                ${metadata.title ? `<h1 class="page-title">${escapeHtml(metadata.title)}</h1>` : ''}
                <div class="page-content">
                    <div class="page-body">
                        ${parseContentMarkdown(content)}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error loading page:', err);
        return `<div class="empty-state"><p>Error loading page. 💌</p></div>`;
    }
}

// Render Markdown Page
async function renderMarkdownPage(filename) {
    return fetchMarkdownPage(filename);
}

// Parse Markdown with YAML
function parseMarkdown(markdown, type, filename) {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

    const metadata = {};
    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
            metadata[key.trim().toLowerCase()] = value;
        }
    });

    const id = filename.replace('.md', '');

    return {
        id,
        type,
        title: metadata.title || '',
        date: metadata.date || new Date().toISOString().split('T')[0],
        author: metadata.author || 'Beau Holliday',
        image: metadata.image || '/assets/media/beauholliday.jpg',
        cover: metadata.cover || metadata.image || '/assets/media/beauholliday.jpg',
        excerpt: metadata.excerpt || content.substring(0, 150),
        content
    };
}

// Parse Page Markdown
function parsePageMarkdown(markdown) {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    
    let metadata = {};
    let content = markdown;

    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

        frontmatter.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
                metadata[key.trim().toLowerCase()] = value;
            }
        });
    }

    return { metadata, content };
}

// Parse content markdown to HTML
function parseContentMarkdown(markdown) {
    let html = escapeHtml(markdown);

    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');

    return html;
}

// Render Home Page
async function renderHome() {
    try {
        const [allPoetry, allSentiment, allStories, allPrompts] = await Promise.all([
            fetchMarkdownFiles('poetry'),
            fetchMarkdownFiles('sentiment'),
            fetchMarkdownFiles('stories'),
            fetchMarkdownFiles('prompts')
        ]);

        const allPosts = [
            ...allPoetry,
            ...allSentiment,
            ...allStories,
            ...allPrompts
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const latestPosts = allPosts.slice(0, 3);

        return `
            ${renderHero()}

            <div class="latest-section">
                <h2 class="section-title">Latest Writings</h2>
                <div class="feed">
                    ${latestPosts.length > 0 ? latestPosts.map(post => renderPostCard(post)).join('') : '<div class="empty-state"><p>No posts yet. 💌</p></div>'}
                </div>
            </div>

            ${await renderLibraryPreview()}
        `;
    } catch (err) {
        console.error('Error rendering home:', err);
        throw err;
    }
}

// Render Hero Section
function renderHero() {
    return `
        <div class="hero">
            <div class="hero-content">
                <h2>The Inkwell</h2>
                <p>Essays in Romance & Reverie</p>
                <p class="hero-tagline">Poetry and prose exploring desire, vulnerability, and the spaces between words.</p>
            </div>
        </div>
    `;
}

// Render Library Preview
async function renderLibraryPreview() {
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/assets/posts/library/library.md`);
        if (!response.ok) return '';

        const markdown = await response.text();
        const { content } = parsePageMarkdown(markdown);
        const preview = content.substring(0, 300) + '...';

        return `
            <div class="library-preview">
                <h2 class="section-title">The Library</h2>
                <p>
                    ${preview}
                </p>
                <button class="action-btn" onclick="loadPage('library')">Explore the Library</button>
            </div>
        `;
    } catch (err) {
        return '';
    }
}

// Render Feed
async function renderFeed() {
    try {
        const [poetry, sentiment, stories, prompts] = await Promise.all([
            fetchMarkdownFiles('poetry'),
            fetchMarkdownFiles('sentiment'),
            fetchMarkdownFiles('stories'),
            fetchMarkdownFiles('prompts')
        ]);

        const allPosts = [
            ...poetry,
            ...sentiment,
            ...stories,
            ...prompts
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allPosts.length === 0) {
            return `<div class="empty-state"><p>The pages are still being written. 💌</p></div>`;
        }

        return `<div class="feed">${allPosts.map(post => renderPostCard(post)).join('')}</div>`;
    } catch (err) {
        console.error('Error rendering feed:', err);
        throw err;
    }
}

// Render Collection
async function renderCollection(type) {
    try {
        const posts = await fetchMarkdownFiles(type);
        
        if (posts.length === 0) {
            return `<div class="empty-state"><p>No ${type} posts yet. 💌</p></div>`;
        }

        const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        return `<div class="feed">${sortedPosts.map(post => renderPostCard(post)).join('')}</div>`;
    } catch (err) {
        console.error('Error rendering collection:', err);
        throw err;
    }
}

// Render Post Card
function renderPostCard(post) {
    const { type, id, title, date, author, image, excerpt, content, cover } = post;
    const dateStr = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    if (type === 'poetry') {
        return `
            <div class="card poetry" data-post-id="${id}" data-type="poetry">
                <div class="card-content">
                    <div class="card-header">📝 Poetry</div>
                    ${title ? `<h2>${escapeHtml(title)}</h2>` : ''}
                    <div class="poem-text">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
                    <div class="card-footer">
                        <span class="timestamp">${dateStr}</span>
                        <div class="action-buttons">
                            <button class="action-btn share-btn">Share</button>
                        </div>
                    </div>
                    <div class="share-preview">
                        <div class="share-preview-meta"><strong>The Inkwell</strong> — Poetry</div>
                        ${title ? `<div class="share-preview-meta">"${escapeHtml(title)}"</div>` : ''}
                        <div class="share-preview-meta">💌 Poetry and Prose by Beau Holliday</div>
                    </div>
                </div>
            </div>
        `;
    }

    if (type === 'sentiment') {
        return `
            <div class="card sentiment" data-post-id="${id}" data-type="sentiment">
                <div class="card-content">
                    <div class="card-header">✨ Sentiment</div>
                    <div class="sentiment-text">${escapeHtml(content)}</div>
                    <div class="card-footer">
                        <span class="timestamp">${dateStr}</span>
                        <div class="action-buttons">
                            <button class="action-btn share-btn">Share</button>
                        </div>
                    </div>
                    <div class="share-preview">
                        <div class="share-preview-meta"><strong>The Inkwell</strong> — Sentiment</div>
                        <div class="share-preview-meta">"${escapeHtml(content.substring(0, 60))}..."</div>
                        <div class="share-preview-meta">💌 Poetry and Prose by Beau Holliday</div>
                    </div>
                </div>
            </div>
        `;
    }

    if (type === 'stories') {
        return `
            <div class="card story" data-post-id="${id}" data-type="stories">
                <div class="story-cover">
                    <img src="${BASE_URL}${cover}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='/assets/media/placeholder.jpg'">
                </div>
                <div class="story-info">
                    <div class="card-header">📖 Short Story</div>
                    <h2 class="story-title">${escapeHtml(title)}</h2>
                    <p class="story-excerpt">${escapeHtml(excerpt)}</p>
                    <div class="card-footer">
                        <span class="timestamp">${dateStr}</span>
                        <div class="action-buttons">
                            <button class="action-btn read-story-btn">Read Full Story</button>
                            <button class="action-btn share-btn">Share</button>
                        </div>
                    </div>
                    <div class="share-preview">
                        <div class="share-preview-meta"><strong>The Inkwell</strong> — Story</div>
                        <div class="share-preview-meta">"${escapeHtml(title)}"</div>
                        <div class="share-preview-meta">💌 Poetry and Prose by Beau Holliday</div>
                    </div>
                </div>
            </div>
        `;
    }

    if (type === 'prompts') {
        return `
            <div class="card prompt" data-post-id="${id}" data-type="prompts">
                <div class="prompt-background" style="background-image: url('${BASE_URL}${image}');"></div>
                <div class="prompt-overlay"></div>
                <div class="prompt-content">
                    <h2 class="prompt-title">${escapeHtml(title)}</h2>
                    <p class="prompt-count">Submissions coming soon</p>
                    <button class="prompt-link view-prompt-btn">View Prompt</button>
                </div>
            </div>
        `;
    }
}

// Render Story Page
function renderStoryPage(post) {
    if (!post) return '';

    const dateStr = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return `
        <div class="story-page">
            <div class="card story">
                <div class="card-content">
                    <div class="card-header">📖 Short Story</div>
                    <h2 class="story-title">${escapeHtml(post.title)}</h2>
                    
                    <div class="story-body">
                        <div class="story-text">
                            ${escapeHtml(post.content)}
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <span class="timestamp">${dateStr}</span>
                        <div class="action-buttons">
                            <button class="action-btn back-to-feed">Back to ${currentSourcePage === 'stories' ? 'Stories' : 'Feed'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Prompt Page
function renderPromptPage(post) {
    if (!post) return '';

    return `
        <div class="prompt-page">
            <div class="card prompt">
                <div class="prompt-background" style="background-image: url('${BASE_URL}${post.image}');"></div>
                <div class="prompt-overlay"></div>
                <div class="prompt-content">
                    <h2 class="prompt-title">${escapeHtml(post.title)}</h2>
                    <p class="prompt-count">Submissions coming soon</p>
                </div>
            </div>

            <div class="card">
                <div class="card-content">
                    <h3 class="section-title">The Prompt</h3>
                    <div class="prompt-text">
                        ${escapeHtml(post.content)}
                    </div>
                </div>
            </div>

            <div class="card prompt-response">
                <div class="card-content">
                    <h3 class="section-title">Share Your Response</h3>
                    <form id="prompt-form">
                        <div>
                            <label>Your Name (optional)</label>
                            <input type="text" placeholder="Leave blank for anonymous">
                        </div>
                        <div>
                            <label>Your Response</label>
                            <textarea placeholder="Write your response here..." required></textarea>
                        </div>
                        <div>
                            <label>Email (for your reference, not published)</label>
                            <input type="email" placeholder="your@email.com">
                        </div>
                        <button type="submit">Submit Response</button>
                    </form>
                    <p class="form-note">
                        💌 Your submission helps shape this creative conversation. Thank you for participating.
                    </p>
                </div>
            </div>

            <button class="back-to-feed">← Back to ${currentSourcePage === 'prompts' ? 'Prompts' : 'Feed'}</button>
        </div>
    `;
}

// Setup Post Interactions
function setupPostInteractions() {
    const shareStates = new Map();

    // Share button toggle
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const preview = card?.querySelector('.share-preview');
            if (!preview) return;
            
            const key = card.dataset.postId;
            const isVisible = shareStates.get(key);
            
            if (isVisible) {
                preview.classList.remove('visible');
                shareStates.set(key, false);
            } else {
                preview.classList.add('visible');
                shareStates.set(key, true);
            }
        });
    });

    // Read story button
    document.querySelectorAll('.read-story-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postId = card?.dataset.postId;
            
            if (!postId) return;
            
            const posts = await fetchMarkdownFiles('stories');
            const post = posts.find(p => p.id === postId);
            
            // FIX #9: Check if post exists
            if (!post) {
                document.getElementById('content').innerHTML = '<div class="empty-state"><p>Post not found. 💌</p></div>';
                return;
            }
            
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = renderStoryPage(post);
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    });

    // View prompt button
    document.querySelectorAll('.view-prompt-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postId = card?.dataset.postId;
            
            if (!postId) return;
            
            const posts = await fetchMarkdownFiles('prompts');
            const post = posts.find(p => p.id === postId);
            
            // FIX #9: Check if post exists
            if (!post) {
                document.getElementById('content').innerHTML = '<div class="empty-state"><p>Post not found. 💌</p></div>';
                return;
            }
            
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = renderPromptPage(post);
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    });

    // Back to feed button - FIX #5: Use currentSourcePage
    document.querySelectorAll('.back-to-feed').forEach(btn => {
        btn.addEventListener('click', () => {
            loadPage(currentSourcePage);
        });
    });

    // FIX #12: Form submission handler
    const promptForm = document.getElementById('prompt-form');
    if (promptForm) {
        promptForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(promptForm);
            // TODO: Send to your backend/email service
            
            alert('Thank you for your response! 💌');
            loadPage(currentSourcePage);
        });
    }
}

// Update Meta Tags
function updateMetaTags(title, description, image) {
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', image);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', image);
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
