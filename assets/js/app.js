// The Inkwell — SPA Application with Markdown Posts

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadPage('everything');
    updateMetaTags('The Inkwell', 'Poetry and Prose by American Romance Writer, Beau Holliday', '/assets/media/beauholliday.jpg');
});

// Navigation Setup
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            loadPage(page);
        });
    });
}

// Load Page
function loadPage(page) {
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Render content
    const contentEl = document.getElementById('content');
    contentEl.innerHTML = '<div class="loading">Loading...</div>';
    
    if (page === 'everything') {
        renderFeed().then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    } else if (page === 'about-beau') {
        contentEl.innerHTML = renderAbout();
        setupPostInteractions();
        window.scrollTo(0, 0);
    } else {
        renderCollection(page).then(html => {
            contentEl.innerHTML = html;
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    }
}

// Fetch markdown files from a directory
async function fetchMarkdownFiles(type) {
    try {
        const response = await fetch(`posts/${type}/`);
        if (!response.ok) return [];

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract .md file links
        const links = Array.from(doc.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.endsWith('.md'))
            .map(href => href.split('/').pop());

        const posts = [];

        for (const filename of links) {
            try {
                const postResponse = await fetch(`posts/${type}/${filename}`);
                if (postResponse.ok) {
                    const markdown = await postResponse.text();
                    const post = parseMarkdown(markdown, type, filename);
                    if (post) posts.push(post);
                }
            } catch (err) {
                console.log(`Error loading ${type}/${filename}:`, err);
            }
        }

        return posts;
    } catch (err) {
        console.log(`No posts found for ${type}:`, err);
        return [];
    }
}

// Parse Markdown with YAML Frontmatter
function parseMarkdown(markdown, type, filename) {
    // Match YAML frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

    // Parse YAML manually (simple approach)
    const metadata = {};
    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
            metadata[key.trim()] = value;
        }
    });

    // Generate ID from filename
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

// Render Feed (All Posts)
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
                    <img src="${cover}" alt="${escapeHtml(title)}">
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
                <div class="prompt-background" style="background-image: url('${image}');"></div>
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

// Render Full Story Page
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
                <div class="prompt-background" style="background-image: url('${post.image}');"></div>
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

// Render About Page
function renderAbout() {
    return `
        <div style="max-width: 900px; margin: 0 auto;">
            <div class="about-section">
                <div class="about-content">
                    <h2 class="section-title">About Beau Holliday</h2>
                    
                    <p class="bio-text">
                        Beau Holliday is an old soul from the Southwest, published independently, pursuing shamelessness through song, poem, and prose.
                    </p>

                    <img src="/assets/media/profile-image.jpg" alt="Beau Holliday" class="profile-image" onerror="this.style.display='none'">

                    <div class="bio-highlight">
                        An American musician, writer, romance author, and poet—Beau's presence weaves across web and social media with an obsession for the romantic and sensual. Drawing from the psychological and spiritual aspects of sex, the history and mysticism of desire, these explorations manifest in pseudo-fictional fantasies, academic pursuits, and philosophical ponderings within unique and intriguing artistic endeavors, both online and off.
                    </div>

                    <p class="bio-text">
                        At the heart of The Inkwell lies a philosophy: <em>that vulnerability is a language all its own, that desire deserves to be explored without apology, and that the spaces between words often hold more truth than the words themselves.</em>
                    </p>

                    <p class="bio-text">
                        Beau's work spans across mediums—music that echoes with longing, poetry that cuts to the bone, short stories that linger in the margins of your thoughts. Each piece is an invitation to sit with the uncomfortable, the beautiful, and the deeply human experience of connection.
                    </p>
                </div>
            </div>

            <div class="about-section">
                <div class="about-content">
                    <h2 class="section-title">Artistic Mediums</h2>
                    
                    <ul class="mediums-list">
                        <li>Music & Songwriting</li>
                        <li>Poetry & Verse</li>
                        <li>Prose & Short Stories</li>
                        <li>Essay & Philosophical Writing</li>
                        <li>Academic Exploration</li>
                    </ul>

                    <p class="bio-text" style="margin-top: 1.5rem;">
                        Each medium is a different language for the same obsession: understanding desire, intimacy, and the mysterious pull between two souls.
                    </p>
                </div>
            </div>

            <div class="contact-section">
                <div class="contact-content">
                    <h2 class="section-title">Connect with Beau</h2>
                    
                    <div class="contact-item">
                        <div class="contact-label">Website</div>
                        <div class="contact-value">
                            <a href="https://www.BeauHolliday.com" target="_blank">www.BeauHolliday.com</a>
                        </div>
                    </div>

                    <div class="contact-item">
                        <div class="contact-label">Phone</div>
                        <div class="contact-value">
                            <a href="tel:+13054324849">+1 (305) 432-4849</a>
                        </div>
                    </div>

                    <div class="contact-item">
                        <div class="contact-label">Location</div>
                        <div class="contact-value">
                            Southwest & Montreal
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Setup Post Interactions
function setupPostInteractions() {
    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const preview = card.querySelector('.share-preview');
            if (preview) {
                preview.classList.toggle('visible');
            }
        });
    });

    // Read Full Story buttons
    document.querySelectorAll('.read-story-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postId = card.dataset.postId;
            
            // Find the full post data
            const posts = await fetchMarkdownFiles('stories');
            const post = posts.find(p => p.id === postId);
            
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = renderStoryPage(postId, post);
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    });

    // View Prompt buttons
    document.querySelectorAll('.view-prompt-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postId = card.dataset.postId;
            
            // Find the full post data
            const posts = await fetchMarkdownFiles('prompts');
            const post = posts.find(p => p.id === postId);
            
            const contentEl = document.getElementById('content');
            contentEl.innerHTML = renderPromptPage(postId, post);
            setupPostInteractions();
            window.scrollTo(0, 0);
        });
    });

    // Back to feed buttons
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
// I love you 🌹
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
