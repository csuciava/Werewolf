// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexiuni de la orice domeniu (pentru testare)
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Obiect pentru a stoca starea camerelor de joc
const rooms = {}; // Ex: { 'ABCD': { players: [], rolesAssigned: false, gameStarted: false } }

// Funcție pentru a genera un cod de cameră unic
function generateRoomCode() {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase(); // Ex: A1B2
  } while (rooms[code]); // Asigură unicitatea
  return code;
}

// Funcție pentru a atribui roluri
function assignRoles(playersInRoom) {
  const numPlayers = playersInRoom.length;
  const roles = [];

  // Definește rolurile disponibile și numărul lor pentru numărul de jucători
  // Aceasta este o versiune foarte simplificată, poți ajusta după preferințe
  // Exemplu: 5 jucători -> 1 Vârcolac, 1 Polițist, 1 Medic, 2 Săteni
  if (numPlayers >= 5) {
    roles.push('Vârcolac', 'Vârcolac'); // 2 vârcolaci
    roles.push('Polițist'); // 1 polițist
    roles.push('Medic'); // 1 medic
    // Restul sunt săteni
    for (let i = roles.length; i < numPlayers; i++) {
      roles.push('Sătean');
    }
  } else {
    // Pentru mai puțini jucători, simplifică sau afișează eroare
    console.log(`Prea puțini jucători (${numPlayers}) pentru a începe jocul.`);
    return false; // Nu putem atribui roluri
  }

  // Amestecă rolurile aleatoriu
  roles.sort(() => Math.random() - 0.5);

  // Atribuie rolurile jucătorilor
  playersInRoom.forEach((player, index) => {
    player.role = roles[index];
  });
  return true;
}

// Servim fișiere statice (vom crea un fișier HTML mai târziu)
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`<h1>Serverul de Vârcolac rulează!</h1>
            <p>Conectează-te cu un client Socket.IO pentru a crea/intra în camere.</p>`);
});

// Logica Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilizator s-a conectat:', socket.id);

  let currentRoomCode = null; // Codul camerei curente a socket-ului

  // Când un client vrea să creeze o cameră
  socket.on('createRoom', (playerName) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName, role: null }],
      rolesAssigned: false,
      gameStarted: false
    };
    socket.join(roomCode);
    currentRoomCode = roomCode;
    console.log(`${playerName} a creat camera: ${roomCode}`);
    io.to(roomCode).emit('roomCreated', roomCode, rooms[roomCode].players); // Notifică clientul creator și alți clienți din cameră
  });

  // Când un client vrea să se alăture unei camere
  socket.on('joinRoom', (roomCode, playerName) => {
    roomCode = roomCode.toUpperCase();
    if (rooms[roomCode] && !rooms[roomCode].gameStarted) {
      rooms[roomCode].players.push({ id: socket.id, name: playerName, role: null });
      socket.join(roomCode);
      currentRoomCode = roomCode;
      console.log(`${playerName} s-a alăturat camerei: ${roomCode}`);
      io.to(roomCode).emit('playerJoined', playerName, rooms[roomCode].players); // Notifică pe toți din cameră
    } else if (rooms[roomCode] && rooms[roomCode].gameStarted) {
        socket.emit('error', 'Jocul în această cameră a început deja.');
    }
    else {
      socket.emit('error', 'Camera nu există sau codul este incorect.');
    }
  });

  // Când un jucător din cameră cere să înceapă jocul (și să atribuie roluri)
  socket.on('startGame', () => {
    if (currentRoomCode && rooms[currentRoomCode]) {
      const room = rooms[currentRoomCode];
      if (room.players.length >= 5 && !room.rolesAssigned) { // Minim 5 jucători pentru exemplul nostru
        const success = assignRoles(room.players);
        if (success) {
          room.rolesAssigned = true;
          room.gameStarted = true;
          io.to(currentRoomCode).emit('gameStarted');
          // Trimite rolul fiecărui jucător individual
          room.players.forEach(player => {
            io.to(player.id).emit('yourRole', player.role);
          });
          console.log(`Jocul a început în camera ${currentRoomCode}. Roluri atribuite.`);
        } else {
          socket.emit('error', 'Nu s-au putut atribui rolurile. Verifică numărul de jucători.');
        }
      } else if (room.players.length < 5) {
        socket.emit('error', `Trebuie să fie minim 5 jucători pentru a începe jocul (acum sunt ${room.players.length}).`);
      } else if (room.rolesAssigned) {
        socket.emit('error', 'Rolurile au fost deja atribuite în această cameră.');
      }
    }
  });

  // Când un utilizator se deconectează
  socket.on('disconnect', () => {
    console.log('Un utilizator s-a deconectat:', socket.id);
    if (currentRoomCode && rooms[currentRoomCode]) {
      // Scoate jucătorul din lista camerei
      rooms[currentRoomCode].players = rooms[currentRoomCode].players.filter(
        (player) => player.id !== socket.id
      );
      io.to(currentRoomCode).emit('playerLeft', socket.id, rooms[currentRoomCode].players);
      // Dacă nu mai sunt jucători, șterge camera
      if (rooms[currentRoomCode].players.length === 0) {
        delete rooms[currentRoomCode];
        console.log(`Camera ${currentRoomCode} a fost ștearsă.`);
      }
    }
  });
});

// Pornim serverul
server.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
  console.log(`Accesează-l de pe telefon la: http://localhost:${PORT}`);
});

