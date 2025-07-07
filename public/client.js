
const socket = io(); // Se va conecta automat la serverul de pe același domeniu/port

const playerNameInput = document.getElementById('playerName');
const roomCodeInput = document.getElementById('roomCodeInput');
const connectionArea = document.getElementById('connection-area');
const roomArea = document.getElementById('room-area');
const currentRoomCodeDisplay = document.getElementById('currentRoomCode');
const playersList = document.getElementById('players');
const myRoleDisplay = document.getElementById('myRole');
const messagesDiv = document.getElementById('messages');

let myPlayerId = localStorage.getItem('werewolfPlayerId');
let myPlayerName = localStorage.getItem('werewolfPlayerName');

// Generează un ID unic dacă nu există deja
if (!myPlayerId) {
    myPlayerId = 'player_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('werewolfPlayerId', myPlayerId);
}

// Pre-populează numele dacă a fost salvat anterior
if (myPlayerName) {
    playerNameInput.value = myPlayerName;
}

function logMessage(msg, type = '') {
    const item = document.createElement('div');
    item.textContent = msg;
    item.className = type;
    messagesDiv.appendChild(item);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
}

function createRoom() {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        localStorage.setItem('werewolfPlayerName', playerName); // Salvează numele
        socket.emit('createRoom', myPlayerId, playerName); // Trimite ID-ul și numele
        logMessage('Se creează camera...', 'success');
    } else {
        logMessage('Introdu un nume.', 'error');
    }
}

function joinRoom() {
    const roomCode = roomCodeInput.value.trim();
    const playerName = playerNameInput.value.trim();
    if (roomCode && playerName) {
        localStorage.setItem('werewolfPlayerName', playerName); // Salvează numele
        socket.emit('joinRoom', roomCode, myPlayerId, playerName); // Trimite codul, ID-ul și numele
        logMessage(`Se alătură camerei ${roomCode}...`, 'success');
    } else {
        logMessage('Introdu un nume și un cod de cameră.', 'error');
    }
}

function startGame() {
    socket.emit('startGame');
    logMessage('Se încearcă începerea jocului...', 'success');
}

// --- Evenimente de la server ---
socket.on('roomCreated', (roomCode, players) => {
    currentRoomCodeDisplay.textContent = roomCode;
    updatePlayersList(players);
    connectionArea.style.display = 'none';
    roomArea.style.display = 'block';
    logMessage(`Camera creată: ${roomCode}. Trimite acest cod prietenilor!`, 'success');
});

socket.on('playerJoined', (playerName, players) => {
    updatePlayersList(players);
    logMessage(`${playerName} s-a alăturat camerei.`, 'success');
});

socket.on('playerLeft', (playerId, players) => {
    updatePlayersList(players);
    logMessage('Un jucător a părăsit camera.', 'error');
});

socket.on('gameStarted', () => {
    logMessage('Jocul a început! Rolurile sunt atribuite...', 'success');
});

socket.on('yourRole', (role) => {
    myRoleDisplay.textContent = `Rolul tău: ${role}`;
    logMessage(`Rolul tău a fost atribuit: ${role}`, 'success');
});

socket.on('error', (message) => {
    logMessage(`Eroare: ${message}`, 'error');
});

function updatePlayersList(players) {
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name; // Afișează numele, nu ID-ul
        playersList.appendChild(li);
    });
}

// Handle initial connection status
socket.on('connect', () => {
    logMessage('Conectat la server.', 'success');
});

socket.on('disconnect', () => {
    logMessage('Deconectat de la server.', 'error');
});
