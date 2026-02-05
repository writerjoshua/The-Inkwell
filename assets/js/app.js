// The Inkwell — SPA Application with GitHub API Auto-Discovery

const BASE_URL = '/The-Inkwell';
const GITHUB_OWNER = 'writerjoshua';
const GITHUB_REPO = 'The-Inkwell';
const GITHUB_API = 'https://api.github.com/repos';
const POSTS_PATH = 'assets/posts/';

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
    document.querySelectorAll('.bottom-nav-btn, .nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    const contentEl = document.getElementById('content');
    contentEl.innerHTML = '<div class="loading">Loading...</div>';
    
    if (page === 'home') {
        renderHome().then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            console.error('Error loading home:', err);
            contentEl.innerHTML = '<div class="empty-state"><p>Error loading home. 💌</p></div>';
        });
    } else if (page === 'everything') {
        renderFeed().then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            console.error('Error loading feed:', err);
            contentEl.innerHTML = '<div class="empty-state"><p>Error loading posts. 💌</p></div>';
        });
    } else if (page === 'about-beau' || page === 'library') {
        renderMarkdownPage(page === 'about-beau' ? 'about' : 'library').then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            console.error('Error loading page:', err);
            contentEl.innerHTML = '<div class="empty-state"><p>Error loading page. 💌</p></div>';
        });
    } else {
        renderCollection(page).then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        }).catch(err => {
            console.error('Error loading collection:', err);
            contentEl.innerHTML = '<div class="empty-state"><p>Error loading posts. 💌</p></div>';
        });
    }
}

// Fetch files from GitHub API
async function fetchFilesFromGitHub(path) {
    try {
        const url = `${GITHUB_API}/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}/${path}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log(`GitHub API: ${path} not found (${response.status})`);
            return [];
        }

        const files = await response.json();
        
        return Array.isArray(files) 
            ? files.filter(f => f.name.endsWith('.md') && f.type === 'file')
            : [];
    } catch (err) {
        console.error(`Error fetching from GitHub API for ${path}:`, err);
        return [];
    }
}

// Fetch markdown files
async function fetchMarkdownFiles(type) {
    try {
        const mdFiles = await fetchFilesFromGitHub(type);
        
        if (mdFiles.length === 0) {
            console.log(`No markdown files found in ${POSTS_PATH}/${type}`);
            return [];
        }

        const posts = [];

        for (const file of mdFiles) {
            try {
                const response = await fetch(`${BASE_URL}/assets/posts/${type}/${file.name}`);
                if (response.ok) {
                    const markdown = await response.text();
                    const post = parseMarkdown(markdown, type, file.name);
                    if (post) posts.push(post);
                }
            } catch (err) {
                console.log(`Error loading ${type}/${file.name}:`, err);
            }
        }

        return posts;
    } catch (err) {
        console.log(`Error in fetchMarkdownFiles for ${type}:`, err);
        return [];
    }
}

// Fetch markdown page
async function fetchMarkdownPage(filename) {
    try {
        const response = await fetch(`${BASE_URL}/assets/posts/${type}/${file.name}`);
        if (!response.ok) {
            return `<div class="empty-state"><p>Page not found. 💌</p></div>`;
        }

        const markdown = await response.text();
        const { metadata, content } = parsePageMarkdown(markdown);

        return `
            <div style="max-width: 900px; margin: 0 auto;">
                ${metadata.title ? `<h1 style="font-family: 'Playfair Display', serif; font-size: 2rem; margin-bottom: 2rem; color: #3d2817; text-align: center;">${escapeHtml(metadata.title)}</h1>` : ''}
                <div style="background: white; border: 2px solid #8b7355; padding: 2rem; position: relative; box-shadow: 2px 2px 8px rgba(0,0,0,.08);">
                    <div style="position: relative; z-index: 2; font-size: 1rem; line-height: 1.8; color: #444;">
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

    html = html.replace(/^### (.*?)$/gm, '<h3 style="font-family: \'Playfair Display\', serif; font-size: 1.3rem; margin: 1.5rem 0 0.5rem 0; color: #3d2817;">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="font-family: \'Playfair Display\', serif; font-size: 1.6rem; margin: 2rem 0 1rem 0; color: #3d2817;">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 style="font-family: \'Playfair Display\', serif; font-size: 2rem; margin: 2rem 0 1rem 0; color: #3d2817;">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #c9685a; text-decoration: underline;">$1</a>');

    html = html.replace(/\n\n/g, '</p><p style="margin: 1rem 0;">');
    html = '<p style="margin: 1rem 0;">' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');

    return html;
}

// Render Home Page
async function renderHome() {
    try {
        const [allPoetry, allSentiment, allStories, allPrompts] = await Promise.all([
            fetchMarkdownFiles('assets/poetry'),
            fetchMarkdownFiles('assets/sentiment'),
            fetchMarkdownFiles('assets/stories'),
            fetchMarkdownFiles('assets/prompts')
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

            <div style="margin-top: 3rem;">
                <h2 style="font-family: 'Playfair Display', serif; font-size: 1.8rem; margin-bottom: 1.5rem; color: #3d2817; border-bottom: 2px dashed #8b7355; padding-bottom: 0.8rem; letter-spacing: 1px;">Latest Writings</h2>
                <div class="feed">
                    ${latestPosts.length > 0 ? latestPosts.map(post => renderPostCard(post)).join('') : '<div class="empty-state"><p>No posts yet. 💌</p></div>'}
                </div>
            </div>

            ${await renderLibraryPreview()}
        `;
    } catch (err) {
        console.error('Error rendering home:', err);
        return `<div class="empty-state"><p>Error loading home. 💌</p></div>`;
    }
}

// Render Hero Section
function renderHero() {
    return `
        <div class="hero">
            <div class="hero-content">
                <h2>The Inkwell</h2>
                <p>By Beau Holliday</p>
                <p style="margin-top: 1.5rem; font-size: 1rem;">Poetry and prose exploring desire, vulnerability, and the spaces between words.</p>
            </div>
        </div>
    `;
}

// Render Library Preview
async function renderLibraryPreview() {
    try {
        const response = await fetch(`${BASE_URL}/assets/posts/library.md`);
        if (!response.ok) return '';

        const markdown = await response.text();
        const { content } = parsePageMarkdown(markdown);
        const preview = content.substring(0, 300) + '...';

        return `
            <div style="margin-top: 3rem; background: linear-gradient(135deg, #fffbf5 0%, #fef5e7 100%); border: 2px solid #8b7355; padding: 2rem; box-shadow: 2px 2px 8px rgba(0,0,0,.08);">
                <h2 style="font-family: 'Playfair Display', serif; font-size: 1.8rem; margin-bottom: 1rem; color: #3d2817; letter-spacing: 1px;">The Library</h2>
                <p style="font-size: 1rem; line-height: 1.8; margin-bottom: 1.5rem; color: #444;">
                    ${preview}
                </p>
                <button class="action-btn" style="border: 2px solid #8b7355; padding: 0.8rem 1.5rem; font-size: 0.9rem;" onclick="loadPage('library')">Explore the Library</button>
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
        return `<div class="empty-state"><p>Error loading posts. 💌</p></div>`;
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
        return `<div class="empty-state"><p>Error loading posts. 💌</p></div>`;
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
                    <img src="${BASE_URL}${cover}" alt="${escapeHtml(title)}">
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
function renderStoryPage(postId, post) {
    if (!post) return '';

    const dateStr = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return `
        <div style="max-width: 900px; margin: 0 auto;">
            <div class="card story" style="border-left: 6px solid #8b7355; display: flex; flex-direction: column;">
                <div class="card-content">
                    <div class="card-header">📖 Short Story</div>
                    <h2 class="story-title">${escapeHtml(post.title)}</h2>
                    
                    <div style="background: white; border: 2px solid #8b7355; padding: 2rem; margin: 2rem 0; position: relative;">
                        <div style="position: relative; z-index: 2; font-size: 1rem; line-height: 1.8; color: #444; white-space: pre-wrap;">
                            ${escapeHtml(post.content)}
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <span class="timestamp">${dateStr}</span>
                        <div class="action-buttons">
                            <button class="action-btn back-to-feed">Back to Stories</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Prompt Page
function renderPromptPage(postId, post) {
    if (!post) return '';

    return `
        <div style="max-width: 900px; margin: 0 auto;">
            <div class="card prompt" style="min-height: auto; margin-bottom: 2rem;">
                <div class="prompt-background" style="background-image: url('${BASE_URL}${post.image}');"></div>
                <div class="prompt-overlay"></div>
                <div class="prompt-content">
                    <h2 class="prompt-title">${escapeHtml(post.title)}</h2>
                    <p class="prompt-count">Submissions coming soon</p>
                </div>
            </div>

            <div class="card" style="border: 2px solid #8b7355; margin-bottom: 2rem;">
                <div class="card-content">
                    <h3 class="section-title">The Prompt</h3>
                    <div style="font-size: 1rem; line-height: 1.8; color: #444; white-space: pre-wrap;">
                        ${escapeHtml(post.content)}
                    </div>
                </div>
            </div>

            <div class="card" style="border: 2px solid #8b7355; background: linear-gradient(135deg, #fffbf5 0%, #fef5e7 100%);;">
                <div class="card-content">
                    <h3 class="section-title">Share Your Response</h3>
                    <form style="display: flex; flex-direction: column; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; letter-spacing: 1px; font-size: 0.9rem;">Your Name (optional)</label>
                            <input type="text" placeholder="Leave blank for anonymous" style="width: 100%; padding: 0.8rem; border: 1px solid #8b7355; font-family: 'Courier Prime', monospace; background: white;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; letter-spacing: 1px; font-size: 0.9rem;">Your Response</label>
                            <textarea placeholder="Write your response here..." style="width: 100%; padding: 1rem; border: 1px solid #8b7355; font-family: 'Courier Prime', monospace; min-height: 200px; resize: vertical; background: white;"></textarea>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; letter-spacing: 1px; font-size: 0.9rem;">Email (for your reference, not published)</label>
                            <input type="email" placeholder="your@email.com" style="width: 100%; padding: 0.8rem; border: 1px solid #8b7355; font-family: 'Courier Prime', monospace; background: white;">
                        </div>
                        <button type="submit" style="background: #8b7355; color: white; border: none; padding: 0.8rem 1.5rem; font-family: 'Courier Prime', monospace; font-size: 0.9rem; cursor: pointer; letter-spacing: 1px; transition: all 0.3s ease; align-self: flex-start;">Submit Response</button>
                    </form>
                    <p style="margin-top: 1rem; font-size: 0.85rem; color: #888; font-style: italic;">
                        💌 Your submission helps shape this creative conversation. Thank you for participating.
                    </p>
                </div>
            </div>

            <button class="back-to-feed" style="margin-top: 2rem; background: transparent; border: none; color: #8b7355; text-decoration: underline; cursor: pointer; font-family: 'Courier Prime', monospace; font-size: 0.95rem;">← Back to Prompts</button>
        </div>
    `;
}

// Setup Post Interactions
function setupPostInteractions() {
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const preview = card.querySelector('.share-preview');
            if (preview) {
                preview.classList.toggle('visible');
            }
        });
    });

    document.querySelectorAll('.read-story-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postId = card.dataset.postId;
            
            const posts = await fetchMarkdownFiles('stories');
            const post = posts.find(p => p.id === postId);
            
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = renderStoryPage(postId, post);
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    });

    document.querySelectorAll('.view-prompt-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postId = card.dataset.postId;
            
            const posts = await fetchMarkdownFiles('prompts');
            const post = posts.find(p => p.id === postId);
            
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = renderPromptPage(postId, post);
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    });

    document.querySelectorAll('.back-to-feed').forEach(btn => {
        btn.addEventListener('click', () => {
            loadPage('everything');
        });
    });
}

// Update Meta Tags
function updateMetaTags(title, description, image) {
    document.querySelector('meta[property="og:title"]').setAttribute('content', title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', description);
    document.querySelector('meta[property="og:image"]').setAttribute('content', image);
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', description);
    document.querySelector('meta[name="twitter:image"]').setAttribute('content', image);
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
