const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new Database(path.join(__dirname, 'taskly.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// API Routes

// Newsletter subscription
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)');
    stmt.run(email.toLowerCase().trim());
    res.json({ success: true, message: 'You\'re on the list! We\'ll notify you when Taskly launches.' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      res.status(409).json({ success: false, message: 'This email is already subscribed!' });
    } else {
      res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
  }
});

// Contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)');
    stmt.run(name.trim(), email.toLowerCase().trim(), subject ? subject.trim() : null, message.trim());
    res.json({ success: true, message: 'Message received! We\'ll get back to you soon.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// Get all unique emails collected across both tables (admin)
app.get('/api/all-emails', (req, res) => {
  try {
    const emails = db.prepare(`
      SELECT email, 'newsletter' as source, subscribed_at as date FROM newsletter_subscribers
      UNION
      SELECT email, 'contact' as source, created_at as date FROM contact_messages
      ORDER BY date DESC
    `).all();
    res.json({ success: true, count: emails.length, data: emails });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all subscribers (admin)
app.get('/api/subscribers', (req, res) => {
  const subscribers = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC').all();
  res.json({ success: true, data: subscribers });
});

// Get all contact messages (admin)
app.get('/api/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json({ success: true, data: messages });
});

// Fallback to index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨ Taskly server running at http://localhost:${PORT}`);
});
