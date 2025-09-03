require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Static files (client build)
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server running with Supabase integration'
  });
});

// Catch-all handler: client-side routing için
app.use((req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Client served from: ${clientPath}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log('✅ Supabase integration ready');
});
