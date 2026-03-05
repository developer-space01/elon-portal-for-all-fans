require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const pool = require('./db');
const { notifyAdmin } = require('./telegramBot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve images from public/

const usersSockets = {};

io.on('connection', (socket) => {
  socket.on('register', (username) => {
    socket.username = username;
    usersSockets[username] = socket.id;
    pool.query('INSERT INTO users (username) VALUES ($1) ON CONFLICT DO NOTHING', [username])
      .catch(err => console.error('DB insert user error:', err));
  });

  socket.on('chat message', async (data) => {
    const { username, message } = data;
    try {
      await pool.query(
        'INSERT INTO messages (username, message, is_from_user) VALUES ($1, $2, $3)',
        [username, message, true]
      );
      await notifyAdmin({ username, message });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) delete usersSockets[socket.username];
  });
});

global.emitToUser = (username, data) => {
  const socketId = usersSockets[username];
  if (socketId) io.to(socketId).emit('admin message', data);
};

// API endpoints
app.post('/api/donation/giftcard', async (req, res) => {
  const { username, cardType, amount, reason } = req.body;
  try {
    await pool.query(
      'INSERT INTO donations (username, type, details) VALUES ($1, $2, $3)',
      [username, 'giftcard', { cardType, amount, reason }]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/donation/crypto', async (req, res) => {
  const { username, cryptoType, amount, reason } = req.body;
  try {
    await pool.query(
      'INSERT INTO donations (username, type, details) VALUES ($1, $2, $3)',
      [username, 'crypto', { cryptoType, amount, reason }]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/history/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const history = await pool.query(
      'SELECT message, is_from_user, timestamp FROM messages WHERE username = $1 ORDER BY timestamp',
      [username]
    );
    res.json(history.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { emitToUser };
