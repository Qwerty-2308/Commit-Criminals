// Initialize Supabase client
const SUPABASE_URL = 'https://dqwavrjhwzbaiydgpdrt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxd2F2cmpod3piYWl5ZGdwZHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDA0OTgsImV4cCI6MjA3OTkxNjQ5OH0.0R6IOWg0q5k2zz2YUSJAeB-RPPFTlZLgZpVpGs82W3M';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Gemini API Configuration
const DEFAULT_GEMINI_KEY = 'AIzaSyAJ1vJUIih2Yv0R0DtWXxjxNehRGtn5a5I';
const GEMINI_MODEL = 'gemini-2.0-flash';



function getGeminiUrl() {
    // Always use the hardcoded key as requested
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${DEFAULT_GEMINI_KEY}`;
}



// Global state
let currentUser = null;

let currentCreateType = null;

// ============= UTILITY FUNCTIONS =============

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }
    // Format as date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? 'Just now' : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    // Format as full date
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Hash-based routing
const routes = {
    '/': 'page-home',
    '/chat': 'page-chat',
    '/qna': 'page-qna',
    '/lost-found': 'page-lost-found',
    '/login': 'page-login'
};

let isLoginMode = true;

// ============= AUTHENTICATION =============

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        updateAuthUI();
        if (window.location.hash === '#/login') {
            navigateTo('/');
        }
    } else {
        currentUser = null;
        updateAuthUI();
    }
}

function toggleMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    const btnText = document.getElementById('btn-text');
    const switchText = document.getElementById('switch-text');
    const switchLink = document.getElementById('switch-mode');
    const usernameGroup = document.getElementById('username-group');
    const passwordHint = document.getElementById('password-hint');
    const errorMsg = document.getElementById('error-msg');

    if (errorMsg) errorMsg.textContent = '';

    if (isLoginMode) {
        if (title) title.textContent = 'Welcome Back';
        if (subtitle) subtitle.textContent = 'Enter your details to access your account';
        if (btnText) btnText.textContent = 'Sign In';
        if (switchText) switchText.textContent = "Don't have an account?";
        if (switchLink) switchLink.textContent = 'Sign up';
        if (usernameGroup) usernameGroup.style.display = 'none';
        if (passwordHint) passwordHint.style.display = 'none';
        const pwd = document.getElementById('password');
        if (pwd) pwd.removeAttribute('minlength');
    } else {
        if (title) title.textContent = 'Create Account';
        if (subtitle) subtitle.textContent = 'Join the community today';
        if (btnText) btnText.textContent = 'Sign Up';
        if (switchText) switchText.textContent = 'Already have an account?';
        if (switchLink) switchLink.textContent = 'Sign in';
        if (usernameGroup) usernameGroup.style.display = 'block';
        if (passwordHint) passwordHint.style.display = 'block';
        const pwd = document.getElementById('password');
        if (pwd) pwd.setAttribute('minlength', '6');
    }
}

async function handleAuth(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const loadingText = document.getElementById('loading-text');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput ? usernameInput.value.trim() : '';

    if (errorMsg) errorMsg.textContent = '';

    // Validation
    if (!email || !password) {
        if (errorMsg) errorMsg.textContent = 'Please fill in all required fields.';
        return;
    }

    if (!isLoginMode) {
        if (!username || username.length < 3) {
            if (errorMsg) errorMsg.textContent = 'Username must be at least 3 characters.';
            return;
        }
        if (password.length < 6) {
            if (errorMsg) errorMsg.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            if (errorMsg) errorMsg.textContent = 'Username can only contain letters, numbers, and underscores.';
            return;
        }
    }

    // Loading state
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (loadingText) loadingText.style.display = 'inline';

    try {
        if (isLoginMode) {
            // Login
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;

            navigateTo('/');
        } else {
            // Signup
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            if (error) throw error;

            // Handle username
            if (data.user && username) {
                try {
                    await supabase.auth.updateUser({
                        data: { username: username }
                    });

                    // Update profile table
                    await supabase.from('user_profiles').upsert([
                        { id: data.user.id, username: username }
                    ]);
                } catch (err) {
                    console.warn('Profile update warning:', err);
                }
            }

            if (errorMsg) {
                errorMsg.style.color = '#22c55e';
                errorMsg.textContent = 'Account created! Redirecting...';
            }

            setTimeout(() => {
                navigateTo('/');
            }, 1500);
        }
    } catch (error) {
        if (errorMsg) {
            errorMsg.style.color = '#ef4444';
            errorMsg.textContent = error.message || 'An error occurred.';
        }
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (loadingText) loadingText.style.display = 'none';
    }
}

async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            // If table doesn't exist or profile not found, check user metadata
            if (error.message && error.message.includes('does not exist')) {
                console.warn('user_profiles table not found. Using user metadata or email as fallback.');
            }

            // Try to get username from user metadata
            if (currentUser.user_metadata && currentUser.user_metadata.username) {
                currentUser.username = currentUser.user_metadata.username;
            } else {
                // Use email as fallback
                currentUser.username = currentUser.email?.split('@')[0] || 'User';
            }
            return;
        }

        if (data) {
            currentUser.username = data.username;
        } else {
            // No profile found, check metadata or use email as fallback
            if (currentUser.user_metadata && currentUser.user_metadata.username) {
                currentUser.username = currentUser.user_metadata.username;
            } else {
                currentUser.username = currentUser.email?.split('@')[0] || 'User';
            }
        }
    } catch (error) {
        // Handle any unexpected errors
        console.warn('Error loading user profile:', error);
        // Try to get username from user metadata
        if (currentUser.user_metadata && currentUser.user_metadata.username) {
            currentUser.username = currentUser.user_metadata.username;
        } else {
            currentUser.username = currentUser.email?.split('@')[0] || 'User';
        }
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userSection = document.getElementById('user-section');
    const usernameDisplay = document.getElementById('username-display');

    if (!authButtons || !userSection || !usernameDisplay) return;

    if (currentUser) {
        authButtons.style.display = 'none';
        userSection.style.display = 'flex';
        usernameDisplay.textContent = currentUser.username || currentUser.email;
    } else {
        authButtons.style.display = 'flex';
        userSection.style.display = 'none';
    }
}

// Auth modal logic removed - handled in login.html

async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();

    // Reload current page
    loadPageContent();
}
// Expose to global scope
window.handleLogout = handleLogout;

// ============= NAVIGATION =============

function navigateTo(path) {
    window.location.hash = '#' + path;
}

function showPage() {
    let hash = window.location.hash.slice(1) || '/';
    const pageId = routes[hash];

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + hash) {
            link.classList.add('active');
        }
    });

    // Show active page
    if (pageId) {
        const activePage = document.getElementById(pageId);
        if (activePage) {
            // Explicitly set display based on page type
            if (pageId === 'page-login' || pageId === 'page-chat' || pageId === 'page-lost-found') {
                activePage.style.display = 'flex';
            } else {
                activePage.style.display = 'block';
            }
            loadPageContent();

            // Focus chat input if on chat page
            if (hash === '/chat') {
                setTimeout(() => {
                    const input = document.getElementById('chat-input');
                    if (input) input.focus();
                }, 300);
            }
        }
    }
}

function loadPageContent() {
    const hash = window.location.hash.slice(1) || '/';

    switch (hash) {
        case '/chat':
            loadChatMessages();
            break;
        case '/qna':
            loadQuestions();
            break;
        case '/lost-found':
            loadLostFoundItems();
            break;
    }
}

// ============= CHAT =============

async function loadChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading messages...</div>';

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Only load last 50 messages for speed

    if (error) {
        container.innerHTML = '<div class="loading">Error loading messages</div>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<div class="loading">No messages yet. Be the first to say something!</div>';
        // Focus input after a moment
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 100);
        return;
    }

    // Reverse to show oldest first
    const messages = data.reverse();

    container.innerHTML = messages.map(msg => {
        const isOwnMessage = currentUser && msg.author_id === currentUser.id;
        const username = msg.author_username || 'Anonymous';
        const editedIndicator = msg.edited_at ? '<span class="edited-indicator">(edited)</span>' : '';

        return `
            <div class="chat-message ${isOwnMessage ? 'own-message' : ''}" data-message-id="${msg.id}">
                <div class="message-header">
                    <span class="message-author">${escapeHtml(username)}</span>
                    <span class="message-time">${formatTime(msg.created_at)} ${editedIndicator}</span>
                </div>
                <div class="message-content" data-original-text="${escapeHtml(msg.message)}">${escapeHtml(msg.message)}</div>
                ${isOwnMessage ? `
                    <div class="message-actions">
                        <button class="message-action-btn edit-btn" onclick="editMessage('${msg.id}')" title="Edit message">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="message-action-btn delete-btn" onclick="deleteMessage('${msg.id}')" title="Delete message">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);

    // Focus input
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 200);
}

async function sendChatMessage(e) {
    e.preventDefault();

    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const sendBtn = document.getElementById('chat-send-btn');

    if (!message) return;

    // Disable input while sending
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        const username = currentUser?.username || currentUser?.email?.split('@')[0] || 'Anonymous';

        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                message: message,
                author_id: currentUser?.id || null,
                author_username: username
            }]);

        if (error) throw error;

        // Clear input and re-enable
        input.value = '';
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';

        // Messages will auto-update via realtime, but scroll to bottom
        setTimeout(() => {
            const container = document.getElementById('chat-messages');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
            input.focus();
        }, 100);

    } catch (error) {
        alert('Error sending message: ' + error.message);
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

// ============= MESSAGE EDIT/DELETE =============

async function deleteMessage(messageId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    console.log('Attempting to delete message:', messageId);
    console.log('Current user:', currentUser.id);

    try {
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId)
            .eq('author_id', currentUser.id); // Ensure only author can delete

        if (error) throw error;

        // Remove message from UI
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }
    } catch (error) {
        alert('Error deleting message: ' + error.message);
    }
}

async function clearAllMessages() {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('⚠️ ARE YOU SURE? ⚠️\n\nThis will permanently delete ALL messages for EVERYONE.\nThis action cannot be undone.')) {
        return;
    }

    try {
        // Delete all rows (using a valid UUID filter)
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .not('id', 'is', null);

        if (error) throw error;

        // Clear UI
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = '<div class="loading">No messages yet. Be the first to say something!</div>';
        }

        alert('All messages have been cleared.');
    } catch (error) {
        console.error('Error clearing messages:', error);
        alert('Error clearing messages: ' + error.message);
    }
}
// Expose to global scope
window.clearAllMessages = clearAllMessages;

function editMessage(messageId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const contentDiv = messageElement.querySelector('.message-content');
    const actionsDiv = messageElement.querySelector('.message-actions');
    const originalText = contentDiv.getAttribute('data-original-text');

    // Create edit UI
    contentDiv.innerHTML = `
        <textarea class="message-edit-input" maxlength="500">${originalText}</textarea>
        <div class="edit-controls">
            <button class="btn small primary" onclick="saveEditedMessage('${messageId}')">Save</button>
            <button class="btn small secondary" onclick="cancelEdit('${messageId}')">Cancel</button>
        </div>
    `;

    // Hide action buttons during edit
    if (actionsDiv) actionsDiv.style.display = 'none';

    // Focus and select text in textarea
    const textarea = contentDiv.querySelector('textarea');
    if (textarea) {
        textarea.focus();
        textarea.select();

        // Allow Enter to save (Shift+Enter for new line)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEditedMessage(messageId);
            } else if (e.key === 'Escape') {
                cancelEdit(messageId);
            }
        });
    }

    messageElement.classList.add('message-editing');
}

async function saveEditedMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const textarea = messageElement.querySelector('.message-edit-input');
    const newText = textarea?.value.trim();

    if (!newText) {
        alert('Message cannot be empty');
        return;
    }

    try {
        const { error } = await supabase
            .from('chat_messages')
            .update({
                message: newText,
                edited_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .eq('author_id', currentUser.id); // Ensure only author can edit

        if (error) throw error;

        // Update UI
        const contentDiv = messageElement.querySelector('.message-content');
        const actionsDiv = messageElement.querySelector('.message-actions');

        contentDiv.setAttribute('data-original-text', newText);
        contentDiv.innerHTML = escapeHtml(newText);

        // Show action buttons again
        if (actionsDiv) actionsDiv.style.display = 'flex';

        // Add edited indicator to timestamp
        const timeSpan = messageElement.querySelector('.message-time');
        if (timeSpan && !timeSpan.innerHTML.includes('(edited)')) {
            timeSpan.innerHTML += ' <span class="edited-indicator">(edited)</span>';
        }

        messageElement.classList.remove('message-editing');
    } catch (error) {
        alert('Error updating message: ' + error.message);
    }
}

function cancelEdit(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const contentDiv = messageElement.querySelector('.message-content');
    const actionsDiv = messageElement.querySelector('.message-actions');
    const originalText = contentDiv.getAttribute('data-original-text');

    // Restore original content
    contentDiv.innerHTML = escapeHtml(originalText);

    // Show action buttons again
    if (actionsDiv) actionsDiv.style.display = 'flex';

    messageElement.classList.remove('message-editing');
}

// ============= Q&A =============

function switchChatTab(tab) {
    const chatView = document.getElementById('chat-view');
    const qaView = document.getElementById('qa-view');
    const tabs = document.querySelectorAll('#page-chat .tab-btn');

    if (tab === 'chat') {
        chatView.style.display = 'block';
        qaView.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        chatView.style.display = 'none';
        qaView.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        loadQuestions();
    }
}
window.switchChatTab = switchChatTab;


async function loadQuestions() {
    const container = document.getElementById('questions-list');
    container.innerHTML = '<div class="loading">Loading questions...</div>';

    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="loading">Error loading questions</div>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<div class="loading">No questions yet. Ask the first one!</div>';
        return;
    }

    // Get reply counts for all questions
    const questionIds = data.map(q => q.id);
    const { data: replyCounts } = await supabase
        .from('question_replies')
        .select('question_id')
        .in('question_id', questionIds);

    const replyCountMap = {};
    if (replyCounts) {
        replyCounts.forEach(reply => {
            replyCountMap[reply.question_id] = (replyCountMap[reply.question_id] || 0) + 1;
        });
    }

    container.innerHTML = data.map(question => {
        const replyCount = replyCountMap[question.id] || 0;
        const isAuthor = currentUser && currentUser.id === question.author_id;
        return `
        <div class="question-card" data-question-id="${question.id}">
            <div class="question-header">
                <h3 onclick="toggleQuestion('${question.id}')" style="cursor: pointer;">${escapeHtml(question.title)}</h3>
                ${isAuthor ? `
                    <button class="btn small secondary delete-question-btn" onclick="deleteQuestion('${question.id}')" title="Delete question">
                        🗑️ Delete
                    </button>
                ` : ''}
            </div>
            <p class="question-preview">${escapeHtml(question.content)}</p>
            <div class="metadata">
                <span class="author">@${escapeHtml(question.author_username)}</span>
                <span class="timestamp">${formatDate(question.created_at)}</span>
                <span class="reply-count" onclick="toggleQuestion('${question.id}')" style="cursor: pointer;">
                    💬 ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}
                </span>
            </div>
            <div class="question-details" id="question-${question.id}" style="display: none;">
                <div class="replies-section">
                    <h4>Replies</h4>
                    <div id="replies-${question.id}" class="replies-list">
                        <div class="loading">Loading replies...</div>
                    </div>
                    ${currentUser ? `
                        <div class="reply-form">
                            <textarea id="reply-input-${question.id}" placeholder="Write your answer..." rows="3" maxlength="1000"></textarea>
                            <button class="btn primary" onclick="submitReply('${question.id}')">Post Reply</button>
                        </div>
                    ` : '<p class="login-prompt">Please <a href="login.html">login</a> to reply.</p>'}
                </div>
            </div>
        </div>
    `}).join('');
}

// ============= LOST & FOUND =============

async function loadLostFoundItems() {
    await loadLostItems();
    await loadFoundItems();
}

function switchLostFoundTab(tab) {
    // Update buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update views
    const lostView = document.getElementById('lost-view');
    const foundView = document.getElementById('found-view');

    if (tab === 'lost') {
        if (lostView) lostView.style.display = 'flex';
        if (foundView) foundView.style.display = 'none';
    } else {
        if (lostView) lostView.style.display = 'none';
        if (foundView) foundView.style.display = 'flex';
    }
}
// Expose to global scope
window.switchLostFoundTab = switchLostFoundTab;

async function loadLostItems() {
    const container = document.getElementById('lost-items');
    container.innerHTML = '<div class="loading">Loading lost items...</div>';

    const { data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('type', 'lost')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="loading">Error loading items</div>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<div class="loading">No lost items reported</div>';
        return;
    }

    container.innerHTML = data.map(item => {
        const isAuthor = currentUser && currentUser.id === item.author_id;
        return `
        <div class="item-card lost">
            <div class="item-badge">Lost</div>
            ${item.image_url ? `<img src="${item.image_url}" alt="${escapeHtml(item.title)}" class="item-image">` : ''}
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <span class="contact">Contact: ${escapeHtml(item.contact)}</span>
            <div class="metadata">
                <span class="timestamp">${formatDate(item.created_at)}</span>
            </div>
            ${isAuthor ? `
                <div style="display: flex; gap: 8px; margin-top: 1rem; width: 100%;">
                    <button class="btn small secondary edit-item-btn" onclick="editLostFoundItem('${item.id}', 'lost')" style="flex: 1;">
                        Edit
                    </button>
                    <button class="btn small secondary remove-item-btn" onclick="removeLostItem('${item.id}')" style="flex: 1;">
                        Remove
                    </button>
                </div>
            ` : currentUser ? `
                <button class="btn small primary mark-found-btn" onclick="markItemAsFound('${item.id}')" style="margin-top: 1rem; width: 100%;">
                    ✓ Mark as Found
                </button>
            ` : ''}
        </div>
    `}).join('');
}

async function loadFoundItems() {
    const container = document.getElementById('found-items');
    container.innerHTML = '<div class="loading">Loading found items...</div>';

    const { data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('type', 'found')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="loading">Error loading items</div>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<div class="loading">No found items reported</div>';
        return;
    }

    container.innerHTML = data.map(item => {
        const isAuthor = currentUser && currentUser.id === item.author_id;
        return `
        <div class="item-card found">
            <div class="item-badge">Found</div>
            ${item.image_url ? `<img src="${item.image_url}" alt="${escapeHtml(item.title)}" class="item-image">` : ''}
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <span class="contact">Contact: ${escapeHtml(item.contact)}</span>
            <div class="metadata">
                <span class="timestamp">${formatDate(item.created_at)}</span>
            </div>
            ${isAuthor ? `
                <div style="display: flex; gap: 8px; margin-top: 1rem; width: 100%;">
                    <button class="btn small secondary edit-item-btn" onclick="editLostFoundItem('${item.id}', 'found')" style="flex: 1;">
                        Edit
                    </button>
                    <button class="btn small secondary remove-item-btn" onclick="removeFoundItem('${item.id}')" style="flex: 1;">
                        Remove
                    </button>
                </div>
            ` : ''}
        </div>
    `}).join('');
}

// ============= MARK ITEM AS FOUND =============

async function markItemAsFound(itemId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('Mark this item as found? It will be removed from the lost items list.')) {
        return;
    }

    try {
        // Delete the lost item
        const { error } = await supabase
            .from('lost_found_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        // Reload the lost items list
        await loadLostItems();

        // Show success message
        const container = document.getElementById('lost-items');
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = 'Item marked as found and removed!';
        successMsg.style.cssText = 'text-align: center; padding: 1rem; color: var(--accent-green); background: rgba(0, 184, 148, 0.1); border-radius: 8px; margin-bottom: 1rem;';
        container.insertBefore(successMsg, container.firstChild);

        setTimeout(() => {
            successMsg.remove();
        }, 3000);
    } catch (error) {
        alert('Error marking item as found: ' + error.message);
    }
}

async function removeLostItem(itemId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('Remove this lost item from the list?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('lost_found_items')
            .delete()
            .eq('id', itemId)
            .eq('author_id', currentUser.id); // Ensure only author can delete

        if (error) throw error;

        // Reload the lost items list
        await loadLostItems();
    } catch (error) {
        alert('Error removing item: ' + error.message);
    }
}

async function removeFoundItem(itemId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('Remove this found item from the list?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('lost_found_items')
            .delete()
            .eq('id', itemId)
            .eq('author_id', currentUser.id); // Ensure only author can delete

        if (error) throw error;

    } catch (error) {
        alert('Error removing item: ' + error.message);
    }
}

// ============= EDIT LOST & FOUND ITEM =============

function editLostFoundItem(itemId, type) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    const itemCard = document.querySelector(`.item-card button[onclick*="${itemId}"]`).closest('.item-card');
    if (!itemCard) return;

    const titleEl = itemCard.querySelector('h3');
    const descEl = itemCard.querySelector('p');
    const contactEl = itemCard.querySelector('.contact');

    // Store original values
    const originalTitle = titleEl.textContent;
    const originalDesc = descEl.textContent;
    const originalContact = contactEl.textContent.replace('Contact: ', '');
    const originalHtml = itemCard.innerHTML;

    itemCard.setAttribute('data-original-html', originalHtml);

    // Create edit form
    itemCard.innerHTML = `
        <div class="edit-form" style="display: flex; flex-direction: column; gap: 8px;">
            <input type="text" class="edit-title" value="${escapeHtml(originalTitle)}" placeholder="Title" style="padding: 8px; border-radius: 6px; border: 1px solid #333; background: #222; color: white;">
            <textarea class="edit-desc" rows="3" placeholder="Description" style="padding: 8px; border-radius: 6px; border: 1px solid #333; background: #222; color: white;">${escapeHtml(originalDesc)}</textarea>
            <input type="text" class="edit-contact" value="${escapeHtml(originalContact)}" placeholder="Contact Info" style="padding: 8px; border-radius: 6px; border: 1px solid #333; background: #222; color: white;">
            <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn small primary" onclick="saveEditedItem('${itemId}', '${type}')" style="flex: 1;">Save</button>
                <button class="btn small secondary" onclick="cancelEditItem('${itemId}')" style="flex: 1;">Cancel</button>
            </div>
        </div>
    `;
}

async function saveEditedItem(itemId, type) {
    const itemCard = document.querySelector(`.item-card button[onclick*="${itemId}"]`).closest('.item-card');
    if (!itemCard) return;

    const newTitle = itemCard.querySelector('.edit-title').value.trim();
    const newDesc = itemCard.querySelector('.edit-desc').value.trim();
    const newContact = itemCard.querySelector('.edit-contact').value.trim();

    if (!newTitle || !newDesc) {
        alert('Title and description are required');
        return;
    }

    try {
        const { error } = await supabase
            .from('lost_found_items')
            .update({
                title: newTitle,
                description: newDesc,
                contact: newContact
            })
            .eq('id', itemId)
            .eq('author_id', currentUser.id);

        if (error) throw error;

        // Reload items
        if (type === 'lost') {
            await loadLostItems();
        } else {
            await loadFoundItems();
        }

    } catch (error) {
        alert('Error updating item: ' + error.message);
    }
}

function openCreateModal(type) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    currentCreateType = type;
    const modal = document.getElementById('create-modal');
    const title = document.getElementById('create-modal-title');
    const contentGroup = document.getElementById('create-content-group');
    const typeGroup = document.getElementById('create-type-group');
    const contactGroup = document.getElementById('create-contact-group');
    const imageGroup = document.getElementById('create-image-group');
    const contentLabel = contentGroup.querySelector('label');
    const errorMsg = document.getElementById('create-error');

    // Reset form
    document.getElementById('create-form').reset();
    document.getElementById('image-preview').innerHTML = '';
    if (errorMsg) errorMsg.textContent = '';

    // Configure based on type
    if (type === 'question') {
        title.textContent = 'Ask a Question';
        contentLabel.textContent = 'Details';
        contentGroup.style.display = 'block';
        typeGroup.style.display = 'none';
        contactGroup.style.display = 'none';
        imageGroup.style.display = 'none';
    } else if (type === 'lost-found') {
        title.textContent = 'Report Lost/Found Item';
        contentLabel.textContent = 'Description';
        contentGroup.style.display = 'block';
        typeGroup.style.display = 'block';
        contactGroup.style.display = 'block';
        imageGroup.style.display = 'block';

        // Add image preview handler
        const imageInput = document.getElementById('create-image');
        if (imageInput) {
            imageInput.onchange = function (e) {
                const file = e.target.files[0];
                const preview = document.getElementById('image-preview');

                if (file) {
                    // Check file size (5MB max)
                    if (file.size > 5 * 1024 * 1024) {
                        if (errorMsg) errorMsg.textContent = 'Image must be less than 5MB';
                        imageInput.value = '';
                        preview.innerHTML = '';
                        return;
                    }

                    // Show preview
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        preview.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 0.5rem;">`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.innerHTML = '';
                }
            };
        }
    }

    modal.style.display = 'flex';
}
// Expose to global scope
window.openCreateModal = openCreateModal;

function closeCreateModal() {
    document.getElementById('create-modal').style.display = 'none';
}

function cancelEditItem(itemId) {
    const itemCard = document.querySelector(`.item-card button[onclick*="${itemId}"]`).closest('.item-card');
    if (!itemCard) return;

    const originalHtml = itemCard.getAttribute('data-original-html');
    if (originalHtml) {
        itemCard.innerHTML = originalHtml;
    }
}

// ============= CREATE CONTENT =============

function showCreateModal(type) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    currentCreateType = type;
    const modal = document.getElementById('create-modal');
    const title = document.getElementById('create-modal-title');
    const contentGroup = document.getElementById('create-content-group');
    const typeGroup = document.getElementById('create-type-group');
    const contactGroup = document.getElementById('create-contact-group');
    const imageGroup = document.getElementById('create-image-group');
    const contentLabel = contentGroup.querySelector('label');
    const errorMsg = document.getElementById('create-error');

    // Reset form
    document.getElementById('create-form').reset();
    document.getElementById('image-preview').innerHTML = '';
    errorMsg.textContent = '';

    // Configure based on type
    if (type === 'question') {
        title.textContent = 'Ask a Question';
        contentLabel.textContent = 'Details';
        contentGroup.style.display = 'block';
        typeGroup.style.display = 'none';
        contactGroup.style.display = 'none';
        imageGroup.style.display = 'none';
    } else if (type === 'lost-found') {
        title.textContent = 'Report Lost/Found Item';
        contentLabel.textContent = 'Description';
        contentGroup.style.display = 'block';
        typeGroup.style.display = 'block';
        contactGroup.style.display = 'block';
        imageGroup.style.display = 'block';

        // Add image preview handler
        const imageInput = document.getElementById('create-image');
        imageInput.onchange = function (e) {
            const file = e.target.files[0];
            const preview = document.getElementById('image-preview');

            if (file) {
                // Check file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    errorMsg.textContent = 'Image must be less than 5MB';
                    imageInput.value = '';
                    preview.innerHTML = '';
                    return;
                }

                // Show preview
                const reader = new FileReader();
                reader.onload = function (event) {
                    preview.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 0.5rem;">`;
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        };
    }

    modal.style.display = 'flex';
}

function closeCreateModal() {
    document.getElementById('create-modal').style.display = 'none';
}

async function handleCreateContent(e) {
    e.preventDefault();

    const title = document.getElementById('create-title').value;
    const content = document.getElementById('create-content').value;
    const type = document.getElementById('create-type').value;
    const contact = document.getElementById('create-contact').value;
    const imageFile = document.getElementById('create-image')?.files[0];
    const errorMsg = document.getElementById('create-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    errorMsg.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
        if (currentCreateType === 'question') {
            const { data: newQuestion, error } = await supabase
                .from('questions')
                .insert([{
                    title,
                    content,
                    author_id: currentUser.id,
                    author_username: currentUser.username
                }])
                .select()
                .single();

            if (error) throw error;

            // Trigger AI Auto-Reply
            if (newQuestion) {
                generateAIAnswer(newQuestion.id, title, content);
            }

            closeCreateModal();
            loadQuestions();

        } else if (currentCreateType === 'lost-found') {
            let imageUrl = null;

            // Upload image if provided
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
                const filePath = `lost-found/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('items')
                    .upload(filePath, imageFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.warn('Image upload failed:', uploadError);
                    errorMsg.textContent = 'Image upload failed. Creating item without image...';
                    // Continue without image
                } else {
                    // Get public URL
                    const { data } = supabase.storage
                        .from('items')
                        .getPublicUrl(filePath);

                    imageUrl = data.publicUrl;
                }
            }

            const { error } = await supabase
                .from('lost_found_items')
                .insert([{
                    title,
                    description: content,
                    type,
                    contact: contact || `@${currentUser.username}`,
                    image_url: imageUrl,
                    author_id: currentUser.id
                }]);

            if (error) throw error;
        }

        closeCreateModal();
        loadPageContent();

    } catch (error) {
        console.error('Error creating content:', error);
        errorMsg.textContent = error.message;
    } finally {
        // Reset button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create';
        }
    }
}

// ============= AI AUTO-REPLY =============

async function generateAIAnswer(questionId, title, content) {
    console.log('🤖 Generating AI answer for:', title);

    // Check if we have a key (we always should with the default)
    const geminiUrl = getGeminiUrl();
    if (!geminiUrl || geminiUrl.includes('YOUR_API_KEY')) {
        console.error('❌ Gemini API Key is missing or invalid');
        return;
    }

    try {
        const prompt = `
        You are CircleUp AI, a friendly and knowledgeable campus expert. 🎓
        A user just posted a question:
        Title: "${title}"
        Content: "${content}"
        
        Please provide a helpful, encouraging, and detailed answer.
        - Use emojis to be friendly. 😊
        - **Bold** key terms or important advice.
        - If you don't know the specific answer, suggest practical steps or campus resources.
        - Keep it concise but informative (under 150 words).
        `;

        console.log('📤 Sending request to Gemini...');
        const response = await fetch(getGeminiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('❌ Gemini API Error:', err);
            return;
        }

        const data = await response.json();
        const aiAnswer = data.candidates[0].content.parts[0].text;
        console.log('✅ AI Answer received:', aiAnswer.substring(0, 50) + '...');

        // Post AI reply to database
        const { error } = await supabase
            .from('question_replies')
            .insert([{
                question_id: questionId,
                content: aiAnswer + "\n\n*(Automated AI Reply)* 🤖",
                author_id: currentUser.id, // Posted on behalf of user
                author_username: 'AI Assistant 🤖'
            }]);

        if (error) {
            console.error('❌ Error saving AI reply:', error);
            throw error;
        }

        console.log('💾 AI reply saved to database');

        // Reload replies if the question is open
        const repliesContainer = document.getElementById(`replies-${questionId}`);
        if (repliesContainer) {
            loadReplies(questionId);
        }

        // Update reply count
        loadQuestions();

    } catch (error) {
        console.error('❌ AI Auto-reply error:', error);
    }
}

// ============= REALTIME SUBSCRIPTIONS =============

function setupRealtimeSubscriptions() {
    // Chat messages - only reload if on chat page
    supabase
        .channel('chat_messages_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
            if (window.location.hash === '#/chat') {
                const container = document.getElementById('chat-messages');
                if (!container) return;

                if (payload.eventType === 'INSERT') {
                    const msg = payload.new;
                    const isOwnMessage = currentUser && msg.author_id === currentUser.id;
                    const username = msg.author_username || 'Anonymous';
                    const editedIndicator = msg.edited_at ? '<span class="edited-indicator">(edited)</span>' : '';

                    const messageHtml = `
                        <div class="chat-message ${isOwnMessage ? 'own-message' : ''}" data-message-id="${msg.id}">
                            <div class="message-header">
                                <span class="message-author">${escapeHtml(username)}</span>
                                <span class="message-time">${formatTime(msg.created_at)} ${editedIndicator}</span>
                            </div>
                            <div class="message-content" data-original-text="${escapeHtml(msg.message)}">${escapeHtml(msg.message)}</div>
                            ${isOwnMessage ? `
                                <div class="message-actions">
                                    <button class="message-action-btn edit-btn" onclick="editMessage('${msg.id}')" title="Edit message">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="message-action-btn delete-btn" onclick="deleteMessage('${msg.id}')" title="Delete message">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;

                    container.insertAdjacentHTML('beforeend', messageHtml);
                    container.scrollTop = container.scrollHeight;
                } else if (payload.eventType === 'DELETE') {
                    const messageId = payload.old.id;
                    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
                    if (messageElement) {
                        messageElement.remove();
                    }
                } else if (payload.eventType === 'UPDATE') {
                    // Optional: Handle updates (edits) in real-time
                    const msg = payload.new;
                    const messageElement = document.querySelector(`[data-message-id="${msg.id}"]`);
                    if (messageElement) {
                        const contentDiv = messageElement.querySelector('.message-content');
                        if (contentDiv) {
                            contentDiv.innerHTML = escapeHtml(msg.message);
                            contentDiv.setAttribute('data-original-text', msg.message);
                        }
                        const timeSpan = messageElement.querySelector('.message-time');
                        if (timeSpan && !timeSpan.innerHTML.includes('(edited)')) {
                            timeSpan.innerHTML += ' <span class="edited-indicator">(edited)</span>';
                        }
                    }
                }
            }
        })
        .subscribe();

    // Questions
    supabase
        .channel('questions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
            if (window.location.hash === '#/qna') loadQuestions();
        })
        .subscribe();

    // Lost & Found
    supabase
        .channel('lost_found_items_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_found_items' }, () => {
            if (window.location.hash === '#/lost-found') loadLostFoundItems();
        })
        .subscribe();
}

function initNavigation() {
    window.addEventListener('hashchange', showPage);

    // Handle logo click
    const brandLink = document.querySelector('.brand');
    if (brandLink) {
        brandLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/');
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = link.getAttribute('href').slice(1);
            navigateTo(path);

            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    document.querySelectorAll('[data-navigate]').forEach(button => {
        button.addEventListener('click', () => {
            const path = button.getAttribute('data-navigate');
            navigateTo(path);
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const createModal = document.getElementById('create-modal');

        if (e.target === createModal) {
            closeCreateModal();
        }
    });

    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const createModal = document.getElementById('create-modal');

            if (createModal.style.display === 'flex') {
                closeCreateModal();
            }
        }
    });

    showPage();
}

function initLostFoundTabs() {
    const tabs = document.querySelectorAll('.tab[data-tab]');
    const lostItems = document.getElementById('lost-items');
    const foundItems = document.getElementById('found-items');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tabType === 'lost') {
                lostItems.style.display = 'grid';
                foundItems.style.display = 'none';
            } else {
                lostItems.style.display = 'none';
                foundItems.style.display = 'grid';
            }
        });
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we are in SPA mode (look for a key element like #page-home)
    const isSPA = document.getElementById('page-home');

    if (isSPA) {
        initNavigation();
        initLostFoundTabs();
        setupRealtimeSubscriptions();
    }

    try {
        await checkAuth();
    } catch (error) {
        console.warn('Auth check failed:', error);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            loadUserProfile().then(() => {
                updateAuthUI();
                if (isSPA) loadPageContent();
            });
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateAuthUI();
            if (isSPA) loadPageContent();
        }
    });
});

// ============= Q&A REPLIES =============

async function toggleQuestion(questionId) {
    const detailsDiv = document.getElementById(`question-${questionId}`);

    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        await loadReplies(questionId);
    } else {
        detailsDiv.style.display = 'none';
    }
}

async function loadReplies(questionId) {
    const container = document.getElementById(`replies-${questionId}`);
    container.innerHTML = '<div class="loading">Loading replies...</div>';

    const { data, error } = await supabase
        .from('question_replies')
        .select('*')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });

    if (error) {
        container.innerHTML = '<div class="loading">Error loading replies</div>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<p class="no-replies">No replies yet. Be the first to answer!</p>';
        return;
    }

    container.innerHTML = data.map(reply => {
        const isAuthor = currentUser && currentUser.id === reply.author_id;
        return `
            <div class="reply-card" data-reply-id="${reply.id}">
                <div class="reply-header">
                    <span class="reply-author">@${escapeHtml(reply.author_username)}</span>
                    <span class="reply-time">${formatTime(reply.created_at)}</span>
                </div>
                <div class="reply-content" data-original-text="${escapeHtml(reply.content)}">${escapeHtml(reply.content)}</div>
                ${isAuthor ? `
                    <div class="reply-actions">
                        <button class="btn small secondary edit-reply-btn" onclick="editReply('${reply.id}', '${questionId}')">
                            Edit
                        </button>
                        <button class="btn small secondary delete-reply-btn" onclick="deleteReply('${reply.id}', '${questionId}')">
                            Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function submitReply(questionId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    const textarea = document.getElementById(`reply-input-${questionId}`);
    const content = textarea.value.trim();

    if (!content) {
        alert('Please write a reply');
        return;
    }

    try {
        const { error } = await supabase
            .from('question_replies')
            .insert([{
                question_id: questionId,
                content: content,
                author_id: currentUser.id,
                author_username: currentUser.username
            }]);

        if (error) throw error;

        // Clear textarea
        textarea.value = '';

        // Reload replies
        await loadReplies(questionId);

        // Update reply count in UI
        const questionCard = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionCard) {
            const replyCountSpan = questionCard.querySelector('.reply-count');
            if (replyCountSpan) {
                const currentCount = parseInt(replyCountSpan.textContent.match(/\d+/)[0]) || 0;
                const newCount = currentCount + 1;
                replyCountSpan.innerHTML = `💬 ${newCount} ${newCount === 1 ? 'reply' : 'replies'}`;
            }
        }
    } catch (error) {
        alert('Error posting reply: ' + error.message);
    }
}

async function deleteReply(replyId, questionId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('Delete this reply?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('question_replies')
            .delete()
            .eq('id', replyId)
            .eq('author_id', currentUser.id);

        if (error) throw error;

        // Reload replies
        await loadReplies(questionId);

        // Update reply count
        const questionCard = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionCard) {
            const replyCountSpan = questionCard.querySelector('.reply-count');
            if (replyCountSpan) {
                const currentCount = parseInt(replyCountSpan.textContent.match(/\d+/)[0]) || 0;
                const newCount = Math.max(0, currentCount - 1);
                replyCountSpan.innerHTML = `💬 ${newCount} ${newCount === 1 ? 'reply' : 'replies'}`;
            }
        }
    } catch (error) {
        alert('Error deleting reply: ' + error.message);
    }
}

// ============= EDIT REPLY =============

function editReply(replyId, questionId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    const replyCard = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (!replyCard) return;

    const contentDiv = replyCard.querySelector('.reply-content');
    const actionsDiv = replyCard.querySelector('.reply-actions');
    const originalText = contentDiv.getAttribute('data-original-text');

    // Create edit UI
    contentDiv.innerHTML = `
        <textarea class="reply-edit-input" maxlength="1000">${originalText}</textarea>
        <div class="edit-controls">
            <button class="btn small primary" onclick="saveEditedReply('${replyId}', '${questionId}')">Save</button>
            <button class="btn small secondary" onclick="cancelEditReply('${replyId}')">Cancel</button>
        </div>
    `;

    // Hide action buttons during edit
    if (actionsDiv) actionsDiv.style.display = 'none';

    // Focus and select text in textarea
    const textarea = contentDiv.querySelector('textarea');
    if (textarea) {
        textarea.focus();
        textarea.select();

        // Allow Enter to save (Shift+Enter for new line)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEditedReply(replyId, questionId);
            } else if (e.key === 'Escape') {
                cancelEditReply(replyId);
            }
        });
    }

    replyCard.classList.add('reply-editing');
}

async function saveEditedReply(replyId, questionId) {
    const replyCard = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (!replyCard) return;

    const textarea = replyCard.querySelector('.reply-edit-input');
    const newText = textarea?.value.trim();

    if (!newText) {
        alert('Reply cannot be empty');
        return;
    }

    try {
        const { error } = await supabase
            .from('question_replies')
            .update({
                content: newText
            })
            .eq('id', replyId)
            .eq('author_id', currentUser.id); // Ensure only author can edit

        if (error) throw error;

        // Update UI
        const contentDiv = replyCard.querySelector('.reply-content');
        const actionsDiv = replyCard.querySelector('.reply-actions');

        contentDiv.setAttribute('data-original-text', newText);
        contentDiv.innerHTML = escapeHtml(newText);

        // Show action buttons again
        if (actionsDiv) actionsDiv.style.display = 'flex';

        replyCard.classList.remove('reply-editing');
    } catch (error) {
        alert('Error updating reply: ' + error.message);
    }
}

function cancelEditReply(replyId) {
    const replyCard = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (!replyCard) return;

    const contentDiv = replyCard.querySelector('.reply-content');
    const actionsDiv = replyCard.querySelector('.reply-actions');
    const originalText = contentDiv.getAttribute('data-original-text');

    // Restore original content
    contentDiv.innerHTML = escapeHtml(originalText);

    // Show action buttons again
    if (actionsDiv) actionsDiv.style.display = 'flex';

    replyCard.classList.remove('reply-editing');
}

// ============= DELETE QUESTION =============

async function deleteQuestion(questionId) {
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    if (!confirm('Delete this question? This will also delete all replies.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', questionId)
            .eq('author_id', currentUser.id); // Ensure only author can delete

        if (error) throw error;

        // Remove question card from UI with animation
        const questionCard = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionCard) {
            questionCard.style.opacity = '0';
            questionCard.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                questionCard.remove();

                // Show message if no questions left
                const container = document.getElementById('questions-list');
                if (container && container.children.length === 0) {
                    container.innerHTML = '<div class="loading">No questions yet. Ask the first one!</div>';
                }
            }, 300);
        }
    } catch (error) {
        alert('Error deleting question: ' + error.message);
    }
}



// ============= AI CHATBOT (Landing Page) =============

document.addEventListener('DOMContentLoaded', () => {
    /* --- DOM Elements --- */
    const chatbotBtn = document.getElementById("chatbot-btn");
    const chatbot = document.getElementById("chatbot");
    const chatMessages = document.getElementById("ai-chat-messages");
    const chatInput = document.getElementById("ai-chat-input");
    const chatSend = document.getElementById("ai-chat-send");
    const configBtn = document.getElementById("config-btn");
    const configModal = document.getElementById("config-modal");
    const saveKeyBtn = document.getElementById("save-key");
    const cancelConfigBtn = document.getElementById("cancel-config");
    const apiKeyInput = document.getElementById("api-key-input");

    // Only run if elements exist
    if (!chatbotBtn || !chatbot) return;

    let apiKey = localStorage.getItem("circleup_api_key") || "";
    let memory = [];

    /* --- Helper Functions --- */
    function random(a) { return a[Math.floor(Math.random() * a.length)]; }

    function addMessage(msg, cls) {
        const div = document.createElement("div");
        div.className = "chat-msg " + cls;
        div.innerHTML = msg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const t = document.createElement("div");
        t.className = "typing";
        t.textContent = "CircleUp AI is thinking...";
        t.id = "typing-indicator";
        chatMessages.appendChild(t);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTyping() {
        const t = document.getElementById("typing-indicator");
        if (t) t.remove();
    }

    /* --- Context Extraction --- */
    function getPageContext() {
        const heroText = document.getElementById('hero-content')?.innerText || '';
        const actionText = document.getElementById('action-content')?.innerText || '';
        const testimonials = document.getElementById('testimonials')?.innerText || '';

        return `
        You are CircleUp AI, the official campus assistant. 🎓
        Your goal is to help students connect, find lost items, and navigate campus life.

        WEBSITE CONTEXT:
        ${heroText}
        ${actionText}
        ${testimonials}
        
        GUIDELINES:
        1. **Persona**: Be friendly, enthusiastic, and helpful. Use emojis! 😊
        2. **Knowledge**: If asked about CircleUp, use the context above. For general topics, use your broad knowledge.
        3. **Formatting**: 
           - **Bold** important keywords.
           - Use bullet points for lists.
           - Keep paragraphs short.
        4. **Conciseness**: Keep answers under 100 words unless asked for detail.
        `;
    }

    /* --- Fallback Logic --- */
    function fallbackReply(input) {
        input = input.toLowerCase();
        if (/hi|hello|hey/.test(input)) return random(["Hey there! 👋", "Hi! Welcome to CircleUp.", "Hello! How can I help?"]);
        if (input.includes("lost")) return "🔍 You can post lost items in the section above!";
        if (input.includes("found")) return "🧾 Found something? Post it in the Found section!";
        return "I'm in Demo Mode. Click the ⚙️ icon to add a free API Key!";
    }

    /* --- Gemini API Logic --- */
    async function callGemini(userText) {
        const url = getGeminiUrl();
        const historyPayload = memory.slice(-12);
        const currentMessage = { role: "user", parts: [{ text: userText }] };
        const contents = [...historyPayload, currentMessage];

        const payload = {
            system_instruction: { parts: [{ text: getPageContext() }] },
            contents: contents,
            tools: [{ google_search: {} }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.error) {
                console.error("Gemini API Error:", data.error);
                return "⚠️ API Error: " + data.error.message;
            }
            if (data.candidates && data.candidates.length > 0) return data.candidates[0].content.parts[0].text;
            return "⚠️ No response generated.";
        } catch (e) {
            return "⚠️ Connection failed.";
        }
    }

    /* --- Main Chat Handler --- */
    async function sendChat() {
        const val = chatInput.value.trim();
        if (!val) return;

        addMessage(val, "user");
        chatInput.value = "";
        showTyping();

        let reply = "";
        // Always try to call Gemini (we have a default key)
        memory.push({ role: "user", parts: [{ text: val }] });
        reply = await callGemini(val);
        memory.push({ role: "model", parts: [{ text: reply }] });

        removeTyping();
        addMessage(reply, "bot");
    }

    /* --- Event Listeners --- */
    if (chatSend) chatSend.onclick = sendChat;
    if (chatInput) chatInput.onkeypress = e => { if (e.key === "Enter") sendChat(); };

    if (chatbotBtn) chatbotBtn.onclick = () => {
        const isOpen = chatbot.hasAttribute('open');
        if (isOpen) {
            chatbot.removeAttribute('open');
        } else {
            chatbot.setAttribute('open', '');
            if (chatMessages.children.length === 0) {
                setTimeout(() => addMessage("👋 Hi! I'm CircleUp AI. Ask me about lost items, the community, or reviews!", "bot"), 500);
            }
        }
    };

    if (configBtn) configBtn.onclick = () => {
        configModal.style.display = "flex";
        if (apiKeyInput) apiKeyInput.value = apiKey;
    };

    if (cancelConfigBtn) cancelConfigBtn.onclick = () => {
        configModal.style.display = "none";
    };

    if (saveKeyBtn) saveKeyBtn.onclick = () => {
        const newKey = apiKeyInput.value.trim();
        if (newKey) {
            apiKey = newKey;
            localStorage.setItem("circleup_api_key", apiKey);
            configModal.style.display = "none";
            addMessage("✅ API Key saved!", "bot");
        } else {
            alert("Please enter a valid key.");
        }
    };
});

// Auth Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuth);

    const switchMode = document.getElementById('switch-mode');
    if (switchMode) switchMode.addEventListener('click', toggleMode);

    initEyeTracking();
});

function initEyeTracking() {
    const irises = document.querySelectorAll('.iris');

    document.addEventListener('mousemove', (e) => {
        irises.forEach(iris => {
            const pupil = iris.querySelector('.pupil');
            if (!pupil) return;

            const irisRect = iris.getBoundingClientRect();
            const irisCenterX = irisRect.left + irisRect.width / 2;
            const irisCenterY = irisRect.top + irisRect.height / 2;

            // Calculate angle and distance
            const angle = Math.atan2(e.clientY - irisCenterY, e.clientX - irisCenterX);

            // Limit movement radius (adjust divisor to control range)
            const maxDistance = irisRect.width / 4;
            const distance = Math.min(
                maxDistance,
                Math.hypot(e.clientX - irisCenterX, e.clientY - irisCenterY)
            );

            // Calculate new position
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            pupil.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
}
