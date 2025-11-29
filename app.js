// Initialize Supabase client
const SUPABASE_URL = 'https://dqwavrjhwzbaiydgpdrt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxd2F2cmpod3piYWl5ZGdwZHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDA0OTgsImV4cCI6MjA3OTkxNjQ5OH0.0R6IOWg0q5k2zz2YUSJAeB-RPPFTlZLgZpVpGs82W3M';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let currentAuthMode = 'login';
let currentCreateType = null;

// Hash-based routing
const routes = {
    '/': 'page-home',
    '/chat': 'page-chat',
    '/qna': 'page-qna',
    '/lost-found': 'page-lost-found'
};

// ============= AUTHENTICATION =============

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        updateAuthUI();
    } else {
        currentUser = null;
        updateAuthUI();
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

    if (currentUser) {
        authButtons.style.display = 'none';
        userSection.style.display = 'flex';
        usernameDisplay.textContent = currentUser.username || currentUser.email;
    } else {
        authButtons.style.display = 'flex';
        userSection.style.display = 'none';
    }
}

function showAuthModal(mode) {
    currentAuthMode = mode;
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const submitText = document.getElementById('auth-submit-text');
    const switchText = document.getElementById('auth-switch-text');
    const usernameGroup = document.getElementById('username-group');
    const passwordHint = document.getElementById('password-hint');
    const errorMsg = document.getElementById('auth-error');

    if (mode === 'login') {
        title.textContent = 'Login';
        submitText.textContent = 'Login';
        switchText.textContent = "Don't have an account?";
        usernameGroup.style.display = 'none';
        passwordHint.style.display = 'none';
        document.getElementById('auth-password').removeAttribute('minlength');
    } else {
        title.textContent = 'Sign Up';
        submitText.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        usernameGroup.style.display = 'block';
        passwordHint.style.display = 'block';
        document.getElementById('auth-password').setAttribute('minlength', '6');
    }

    errorMsg.textContent = '';
    submitBtn.disabled = false;
    document.getElementById('auth-form').reset();
    modal.style.display = 'flex';

    // Focus on first input
    setTimeout(() => {
        if (mode === 'signup' && usernameGroup.style.display !== 'none') {
            document.getElementById('auth-username').focus();
        } else {
            document.getElementById('auth-email').focus();
        }
    }, 100);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    const errorMsg = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    const submitText = document.getElementById('auth-submit-text');
    const loadingText = document.getElementById('auth-loading');

    modal.style.display = 'none';
    errorMsg.textContent = '';
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    loadingText.style.display = 'none';
    document.getElementById('auth-form').reset();
}

function toggleAuthMode(e) {
    e.preventDefault();
    currentAuthMode = currentAuthMode === 'login' ? 'signup' : 'login';
    showAuthModal(currentAuthMode);
}

async function handleAuth(e) {
    e.preventDefault();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value.trim();
    const errorMsg = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    const submitText = document.getElementById('auth-submit-text');
    const loadingText = document.getElementById('auth-loading');

    errorMsg.textContent = '';
    errorMsg.style.color = '#ff6b6b';

    // Validation
    if (!email || !password) {
        errorMsg.textContent = 'Please fill in all required fields.';
        return;
    }

    if (currentAuthMode === 'signup') {
        if (!username || username.length < 3) {
            errorMsg.textContent = 'Username must be at least 3 characters.';
            return;
        }
        if (password.length < 6) {
            errorMsg.textContent = 'Password must be at least 6 characters.';
            return;
        }
        // Validate username format
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorMsg.textContent = 'Username can only contain letters, numbers, and underscores.';
            return;
        }
    }

    // Show loading state
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    loadingText.style.display = 'inline';

    try {
        if (currentAuthMode === 'signup') {
            // Sign up
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            // Store username in user metadata (trigger will create profile automatically)
            if (data.user && username) {
                try {
                    await supabase.auth.updateUser({
                        data: { username: username }
                    });
                } catch (updateError) {
                    console.warn('Could not update user metadata:', updateError);
                }
            }

            // Wait a moment for trigger to create profile, then update with username
            if (data.user) {
                // Small delay to let trigger execute
                await new Promise(resolve => setTimeout(resolve, 500));

                try {
                    // Update the profile with the chosen username (trigger creates it with email)
                    const { error: profileError } = await supabase
                        .from('user_profiles')
                        .update({ username: username || email.split('@')[0] })
                        .eq('id', data.user.id);

                    if (profileError) {
                        // If update fails, try upsert (in case trigger didn't run)
                        if (profileError.message && profileError.message.includes('does not exist')) {
                            console.warn('user_profiles table not found. Please run the database setup script.');
                        } else if (profileError.code === '23505') {
                            // Username already taken, try with fallback
                            const fallbackUsername = `${username || email.split('@')[0]}_${Date.now().toString().slice(-4)}`;
                            await supabase
                                .from('user_profiles')
                                .update({ username: fallbackUsername })
                                .eq('id', data.user.id);
                        } else {
                            // Try upsert as fallback
                            await supabase
                                .from('user_profiles')
                                .upsert([
                                    { id: data.user.id, username: username || email.split('@')[0] }
                                ], {
                                    onConflict: 'id'
                                });
                        }
                    }
                } catch (profileError) {
                    // Non-critical error - profile should be created by trigger
                    console.warn('Profile update attempt failed (profile may be created by trigger):', profileError);
                }
            }

            errorMsg.style.color = 'var(--accent-green)';
            errorMsg.textContent = 'Account created! Please check your email to verify.';

            setTimeout(() => {
                closeAuthModal();
                showAuthModal('login');
            }, 2000);

        } else {
            // Login
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            currentUser = data.user;
            await loadUserProfile();
            updateAuthUI();
            closeAuthModal();

            // Reload current page content
            loadPageContent();
        }
    } catch (error) {
        errorMsg.style.color = '#ff6b6b';
        errorMsg.textContent = error.message || 'An error occurred. Please try again.';
    } finally {
        // Reset loading state
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        loadingText.style.display = 'none';
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();

    // Reload current page
    loadPageContent();
}

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
            activePage.style.display = 'block';
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
        .order('created_at', { ascending: true })
        .limit(1000);

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

    container.innerHTML = data.map(msg => {
        const isOwnMessage = currentUser && msg.author_id === currentUser.id;
        const username = msg.author_username || 'Anonymous';
        return `
            <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
                <div class="message-header">
                    <span class="message-author">${escapeHtml(username)}</span>
                    <span class="message-time">${formatTime(msg.created_at)}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.message)}</div>
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

// ============= Q&A =============


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

    container.innerHTML = data.map(question => `
        <div class="question-card">
            <h3>${escapeHtml(question.title)}</h3>
            <p>${escapeHtml(question.content)}</p>
            <div class="metadata">
                <span class="author">@${escapeHtml(question.author_username)}</span>
                <span class="timestamp">${formatDate(question.created_at)}</span>
            </div>
        </div>
    `).join('');
}

// ============= LOST & FOUND =============

async function loadLostFoundItems() {
    await loadLostItems();
    await loadFoundItems();
}

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

    container.innerHTML = data.map(item => `
        <div class="item-card lost">
            <div class="item-badge">Lost</div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <span class="contact">Contact: ${escapeHtml(item.contact)}</span>
            <div class="metadata">
                <span class="timestamp">${formatDate(item.created_at)}</span>
            </div>
            ${currentUser ? `
                <button class="btn small primary mark-found-btn" onclick="markItemAsFound('${item.id}')" style="margin-top: 1rem; width: 100%;">
                    ✓ Mark as Found
                </button>
            ` : ''}
        </div>
    `).join('');
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

    container.innerHTML = data.map(item => `
        <div class="item-card found">
            <div class="item-badge">Found</div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <span class="contact">Contact: ${escapeHtml(item.contact)}</span>
            <div class="metadata">
                <span class="timestamp">${formatDate(item.created_at)}</span>
            </div>
            ${currentUser && currentUser.id === item.author_id ? `
                <button class="btn small secondary remove-item-btn" onclick="removeFoundItem('${item.id}')" style="margin-top: 1rem; width: 100%;">
                    Remove Item
                </button>
            ` : ''}
        </div>
    `).join('');
}

// ============= MARK ITEM AS FOUND =============

async function markItemAsFound(itemId) {
    if (!currentUser) {
        showAuthModal('login');
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

async function removeFoundItem(itemId) {
    if (!currentUser) {
        showAuthModal('login');
        return;
    }

    if (!confirm('Remove this found item from the list?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('lost_found_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        // Reload the found items list
        await loadFoundItems();
    } catch (error) {
        alert('Error removing item: ' + error.message);
    }
}

// ============= CREATE CONTENT =============

function showCreateModal(type) {
    if (!currentUser) {
        showAuthModal('login');
        return;
    }

    currentCreateType = type;
    const modal = document.getElementById('create-modal');
    const title = document.getElementById('create-modal-title');
    const contentGroup = document.getElementById('create-content-group');
    const typeGroup = document.getElementById('create-type-group');
    const contactGroup = document.getElementById('create-contact-group');
    const contentLabel = contentGroup.querySelector('label');
    const errorMsg = document.getElementById('create-error');

    // Reset form
    document.getElementById('create-form').reset();
    errorMsg.textContent = '';

    // Configure based on type
    if (type === 'question') {
        title.textContent = 'Ask a Question';
        contentLabel.textContent = 'Details';
        contentGroup.style.display = 'block';
        typeGroup.style.display = 'none';
        contactGroup.style.display = 'none';
    } else if (type === 'lost-found') {
        title.textContent = 'Report Lost/Found Item';
        contentLabel.textContent = 'Description';
        contentGroup.style.display = 'block';
        typeGroup.style.display = 'block';
        contactGroup.style.display = 'block';
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
    const errorMsg = document.getElementById('create-error');

    errorMsg.textContent = '';

    try {
        if (currentCreateType === 'question') {
            const { error } = await supabase
                .from('questions')
                .insert([{
                    title,
                    content,
                    author_id: currentUser.id,
                    author_username: currentUser.username
                }]);

            if (error) throw error;

        } else if (currentCreateType === 'lost-found') {
            const { error } = await supabase
                .from('lost_found_items')
                .insert([{
                    title,
                    description: content,
                    type,
                    contact: contact || `@${currentUser.username}`,
                    author_id: currentUser.id
                }]);

            if (error) throw error;
        }

        closeCreateModal();
        loadPageContent();

    } catch (error) {
        errorMsg.textContent = error.message;
    }
}

// ============= REALTIME SUBSCRIPTIONS =============

function setupRealtimeSubscriptions() {
    // Chat messages
    supabase
        .channel('chat_messages_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
            if (window.location.hash === '#/chat') loadChatMessages();
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
    document.querySelector('.logo a').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('/');
    });

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
        const authModal = document.getElementById('auth-modal');
        const createModal = document.getElementById('create-modal');

        if (e.target === authModal) {
            closeAuthModal();
        }
        if (e.target === createModal) {
            closeCreateModal();
        }
    });

    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const authModal = document.getElementById('auth-modal');
            const createModal = document.getElementById('create-modal');

            if (authModal.style.display === 'flex') {
                closeAuthModal();
            }
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
    await checkAuth();
    initNavigation();
    initLostFoundTabs();
    setupRealtimeSubscriptions();

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            loadUserProfile().then(() => {
                updateAuthUI();
                loadPageContent();
            });
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateAuthUI();
            loadPageContent();
        }
    });
});
