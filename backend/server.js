const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Test database connection on startup
const { testConnection } = require('./database/config');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve main HTML file for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
    // Test database connection
    const isConnected = await testConnection();
    
    console.log(`🚀 Sari-Sari POS Server running on http://localhost:${PORT}`);
    console.log('📊 Available endpoints:');
    console.log('   • Login: http://localhost:3000');
    console.log('   • API: http://localhost:3000/api');
    
    if (!isConnected) {
        console.log('\n⚠️  Warning: Database connection failed!');
        console.log('Please check your MySQL server and database credentials in .env file');
    }
});
