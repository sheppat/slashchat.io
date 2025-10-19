// SlashChat - The Chaotic Group Chat with Firebase
class SlashChat {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.onlineUsers = new Set();
        this.xpPerMessage = 5;
        this.xpToNextLevel = 100;
        this.messageListener = null;
        this.onlineUsersListener = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.startSimulation();
    }

    setupEventListeners() {
        // Auth form tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));

        // Chat functionality
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Character count
        document.getElementById('messageInput').addEventListener('input', (e) => {
            document.getElementById('charCount').textContent = `${e.target.value.length}/500`;
        });

        // Online users toggle
        document.querySelector('.online-count').addEventListener('click', () => {
            document.getElementById('onlineList').classList.toggle('show');
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Close online list when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.online-users')) {
                document.getElementById('onlineList').classList.remove('show');
            }
        });
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            // Check if user exists in Firestore
            const userDoc = await db.collection('users').doc(username).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.password === password) {
                    await this.login(username, userData);
                } else {
                    this.showNotification('Invalid password!', 'error');
                }
            } else {
                this.showNotification('User not found!', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match!', 'error');
            return;
        }

        if (username.length < 3) {
            this.showNotification('Username must be at least 3 characters!', 'error');
            return;
        }

        try {
            // Check if user already exists
            const userDoc = await db.collection('users').doc(username).get();
            
            if (userDoc.exists) {
                this.showNotification('Username already exists!', 'error');
                return;
            }

            // Create new user
            const userData = {
                password: password,
                xp: 0,
                level: 1,
                joinDate: firebase.firestore.Timestamp.now(),
                lastSeen: firebase.firestore.Timestamp.now()
            };

            await db.collection('users').doc(username).set(userData);
            await this.login(username, userData);
            this.showNotification('Welcome to SlashChat!', 'success');
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Signup failed. Please try again.', 'error');
        }
    }

    async login(username, userData) {
        this.currentUser = {
            username: username,
            ...userData
        };

        // Update last seen timestamp
        await db.collection('users').doc(username).update({
            lastSeen: firebase.firestore.Timestamp.now()
        });

        document.getElementById('authModal').style.display = 'none';
        document.getElementById('chatContainer').classList.remove('hidden');
        
        this.updateUserDisplay();
        await this.addToOnlineUsers();
        await this.loadMessages();
        this.setupRealtimeListeners();
    }

    async logout() {
        await this.removeFromOnlineUsers();
        
        // Clean up listeners
        if (this.messageListener) {
            this.messageListener();
        }
        if (this.onlineUsersListener) {
            this.onlineUsersListener();
        }
        
        document.getElementById('chatContainer').classList.add('hidden');
        document.getElementById('authModal').style.display = 'flex';
        
        // Clear forms
        document.querySelectorAll('input').forEach(input => input.value = '');
        document.getElementById('charCount').textContent = '0/500';
        
        this.currentUser = null;
    }

    async checkAuth() {
        // For now, we'll use a simple approach
        // In a real app, you'd use Firebase Auth
        const savedUser = localStorage.getItem('slashchat_current_user');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                const userDoc = await db.collection('users').doc(userData.username).get();
                
                if (userDoc.exists) {
                    this.currentUser = { ...userData, ...userDoc.data() };
                    document.getElementById('authModal').style.display = 'none';
                    document.getElementById('chatContainer').classList.remove('hidden');
                    this.updateUserDisplay();
                    await this.addToOnlineUsers();
                    await this.loadMessages();
                    this.setupRealtimeListeners();
                } else {
                    localStorage.removeItem('slashchat_current_user');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('slashchat_current_user');
            }
        }
    }

    updateUserDisplay() {
        document.getElementById('currentUsername').textContent = this.currentUser.username;
        document.getElementById('userLevel').textContent = this.currentUser.level;
        document.getElementById('userXP').textContent = this.currentUser.xp;
        
        const xpProgress = (this.currentUser.xp % this.xpToNextLevel) / this.xpToNextLevel * 100;
        document.getElementById('xpProgress').style.width = `${xpProgress}%`;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !this.currentUser) return;

        try {
            const message = {
                username: this.currentUser.username,
                text: text,
                timestamp: firebase.firestore.Timestamp.now(),
                xp: this.xpPerMessage
            };

            // Add message to Firestore
            await db.collection('messages').add(message);
            
            // Update user XP
            await this.addXP(this.xpPerMessage);
            this.createChaosEffect();
            
            input.value = '';
            document.getElementById('charCount').textContent = '0/500';
            
            // Auto-scroll to bottom
            setTimeout(() => {
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
        } catch (error) {
            console.error('Send message error:', error);
            this.showNotification('Failed to send message. Please try again.', 'error');
        }
    }

    displayMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Remove welcome message if it exists
        const welcomeMsg = chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-username">${message.username}</span>
                    <span class="message-time">${this.formatTime(message.timestamp.toDate())}</span>
                </div>
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                <div class="message-xp">+${message.xp} XP</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
    }

    async addXP(amount) {
        try {
            this.currentUser.xp += amount;
            
            // Check for level up
            const newLevel = Math.floor(this.currentUser.xp / this.xpToNextLevel) + 1;
            if (newLevel > this.currentUser.level) {
                this.currentUser.level = newLevel;
                this.showNotification(`🎉 Level Up! You're now level ${newLevel}!`, 'success');
                this.createLevelUpEffect();
            }

            // Update in Firestore
            await db.collection('users').doc(this.currentUser.username).update({
                xp: this.currentUser.xp,
                level: this.currentUser.level
            });

            // Update local storage for persistence
            localStorage.setItem('slashchat_current_user', JSON.stringify(this.currentUser));
            
            this.updateUserDisplay();
        } catch (error) {
            console.error('Add XP error:', error);
        }
    }

    createChaosEffect() {
        const effects = ['⚡', '💥', '🔥', '✨', '🌟', '💫', '🎆', '🎇'];
        const effect = effects[Math.floor(Math.random() * effects.length)];
        
        const chaosDiv = document.createElement('div');
        chaosDiv.className = 'chaos-effect';
        chaosDiv.textContent = effect;
        chaosDiv.style.left = Math.random() * window.innerWidth + 'px';
        chaosDiv.style.top = Math.random() * window.innerHeight + 'px';
        chaosDiv.style.fontSize = (Math.random() * 20 + 20) + 'px';
        chaosDiv.style.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        
        document.body.appendChild(chaosDiv);
        
        setTimeout(() => {
            chaosDiv.remove();
        }, 2000);
    }

    createLevelUpEffect() {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createChaosEffect();
            }, i * 100);
        }
    }

    async addToOnlineUsers() {
        if (!this.currentUser) return;
        
        try {
            await db.collection('onlineUsers').doc(this.currentUser.username).set({
                username: this.currentUser.username,
                lastSeen: firebase.firestore.Timestamp.now(),
                level: this.currentUser.level
            });
            
            this.onlineUsers.add(this.currentUser.username);
            this.updateOnlineUsersDisplay();
        } catch (error) {
            console.error('Add to online users error:', error);
        }
    }

    async removeFromOnlineUsers() {
        if (!this.currentUser) return;
        
        try {
            await db.collection('onlineUsers').doc(this.currentUser.username).delete();
            this.onlineUsers.delete(this.currentUser.username);
            this.updateOnlineUsersDisplay();
        } catch (error) {
            console.error('Remove from online users error:', error);
        }
    }

    updateOnlineUsersDisplay() {
        document.getElementById('onlineCount').textContent = this.onlineUsers.size;
        
        const onlineList = document.getElementById('onlineList');
        onlineList.innerHTML = '';
        
        this.onlineUsers.forEach(username => {
            const userDiv = document.createElement('div');
            userDiv.className = 'online-user';
            userDiv.textContent = username;
            onlineList.appendChild(userDiv);
        });
    }

    setupRealtimeListeners() {
        // Listen for new messages
        this.messageListener = db.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = { id: change.doc.id, ...change.doc.data() };
                        this.displayMessage(message);
                    }
                });
            });

        // Listen for online users
        this.onlineUsersListener = db.collection('onlineUsers')
            .onSnapshot((snapshot) => {
                this.onlineUsers.clear();
                snapshot.forEach((doc) => {
                    this.onlineUsers.add(doc.id);
                });
                this.updateOnlineUsersDisplay();
            });
    }

    startSimulation() {
        // Simulate other users joining/leaving
        setInterval(async () => {
            if (Math.random() < 0.1) { // 10% chance every interval
                const fakeUsers = ['ChaosMaster', 'LightningBolt', 'ThunderStorm', 'ElectricEel', 'PowerSurge', 'VoltageKing', 'SparkPlug', 'EnergyWave'];
                const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
                
                if (!this.onlineUsers.has(randomUser)) {
                    try {
                        await db.collection('onlineUsers').doc(randomUser).set({
                            username: randomUser,
                            lastSeen: firebase.firestore.Timestamp.now(),
                            level: Math.floor(Math.random() * 10) + 1
                        });
                        
                        // Simulate fake messages occasionally
                        if (Math.random() < 0.3) {
                            setTimeout(() => {
                                this.simulateFakeMessage(randomUser);
                            }, Math.random() * 5000);
                        }
                    } catch (error) {
                        console.error('Simulation error:', error);
                    }
                }
            }
            
            // Simulate users leaving
            if (Math.random() < 0.05 && this.onlineUsers.size > 1) {
                const usersArray = Array.from(this.onlineUsers);
                const randomUser = usersArray[Math.floor(Math.random() * usersArray.length)];
                if (randomUser !== this.currentUser?.username) {
                    try {
                        await db.collection('onlineUsers').doc(randomUser).delete();
                    } catch (error) {
                        console.error('Simulation error:', error);
                    }
                }
            }
        }, 3000);
    }

    async simulateFakeMessage(username) {
        const fakeMessages = [
            "This is chaos! 🔥",
            "I love the XP system! ⚡",
            "SlashChat is amazing! ✨",
            "Level up time! 🎉",
            "The energy here is electric! ⚡",
            "More XP please! 💫",
            "Chaos mode activated! 🌟",
            "This is so fun! 🎆",
            "I'm addicted to this chat! 💥",
            "The leveling system rocks! 🎇"
        ];
        
        try {
            const message = {
                username: username,
                text: fakeMessages[Math.floor(Math.random() * fakeMessages.length)],
                timestamp: firebase.firestore.Timestamp.now(),
                xp: this.xpPerMessage
            };

            await db.collection('messages').add(message);
        } catch (error) {
            console.error('Simulate fake message error:', error);
        }
    }

    async loadMessages() {
        try {
            const snapshot = await db.collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            // Clear existing messages
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '<div class="welcome-message"><h2>Welcome to SlashChat!</h2><p>Type anything and watch the chaos unfold...</p></div>';
            
            // Display messages in reverse order (oldest first)
            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            messages.reverse().forEach(message => {
                this.displayMessage(message);
            });
        } catch (error) {
            console.error('Load messages error:', error);
            this.showNotification('Failed to load messages.', 'error');
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new SlashChat();
});