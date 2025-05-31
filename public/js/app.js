// DOM elements
const messages = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const connectionStatus = document.getElementById('connectionStatus');

// Generate a random username
const username = 'User_' + Math.floor(Math.random() * 1000);

// WebSocket connection
let socket;
let isConnected = false;

// Initialize WebSocket connection
function connectWebSocket() {
    // Get the correct WebSocket URL based on the current page URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    socket = new WebSocket(wsUrl);

    // Connection opened
    socket.addEventListener('open', (event) => {
        isConnected = true;
        connectionStatus.textContent = 'Connected to server';
        connectionStatus.style.color = '#4caf50';

        // Send a join message
        const joinMessage = {
            type: 'join',
            username: username,
            message: 'has joined the chat'
        };
        socket.send(JSON.stringify(joinMessage));
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            displayMessage(data);
        } catch (e) {
            console.error('Error parsing message:', e);
            displaySystemMessage('Received malformed message');
        }
    });

    // Connection closed
    socket.addEventListener('close', (event) => {
        isConnected = false;
        connectionStatus.textContent = 'Disconnected from server. Attempting to reconnect...';
        connectionStatus.style.color = '#f44336';

        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    });

    // Connection error
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        displaySystemMessage('Connection error occurred');
    });
}

// Display a message in the chat
function displayMessage(data) {
    const messageElement = document.createElement('div');

    if (data.type === 'join' || data.type === 'leave') {
        messageElement.className = 'system-message';
        messageElement.textContent = `${data.username} ${data.message}`;
    } else {
        messageElement.className = data.username === username ? 'my-message' : 'user-message';
        messageElement.textContent = `${data.username}: ${data.message}`;
    }

    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
}

// Display a system message
function displaySystemMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = message;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
}

// Send a message
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (!message) return;

    if (isConnected) {
        const chatMessage = {
            type: 'chat',
            username: username,
            message: message
        };
        socket.send(JSON.stringify(chatMessage));
        messageInput.value = '';
    } else {
        displaySystemMessage('Cannot send message: Not connected to server');
    }
});

// Initialize WebSocket connection when the page loads
connectWebSocket();

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (isConnected) {
        const leaveMessage = {
            type: 'leave',
            username: username,
            message: 'has left the chat'
        };
        socket.send(JSON.stringify(leaveMessage));
        socket.close();
    }
});
