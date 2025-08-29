// Test database connection
require('dotenv').config();
const { dbAsync } = require('./backend/database/config');

async function testConnection() {
    try {
        console.log('Testing database connection...');
        console.log('Configuration:');
        console.log('- Host:', process.env.DB_HOST);
        console.log('- User:', process.env.DB_USER);
        console.log('- Database:', process.env.DB_NAME);
        console.log('- Port:', process.env.DB_PORT);
        
        // Test basic connection
        const result = await dbAsync.query('SELECT 1 as test');
        console.log('✅ Database connection successful!');
        console.log('Test query result:', result);
        
        // Test tables
        console.log('\n📋 Checking tables...');
        const tables = await dbAsync.query('SHOW TABLES');
        console.log('Tables found:', tables.length);
        tables.forEach(table => {
            console.log(`- ${Object.values(table)[0]}`);
        });
        
        // Test users table
        console.log('\n👤 Checking users...');
        const users = await dbAsync.query('SELECT id, username, role FROM users');
        console.log('Users found:', users.length);
        users.forEach(user => {
            console.log(`- ${user.username} (${user.role})`);
        });
        
        // Test products table
        console.log('\n📦 Checking products...');
        const products = await dbAsync.query('SELECT COUNT(*) as count FROM products');
        console.log('Products found:', products[0].count);
        
        console.log('\n✨ Database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Solution: Check your MySQL username and password in .env file');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n💡 Solution: Run the database_setup.sql script first to create the database');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: Make sure MySQL server is running');
        }
    }
    
    process.exit();
}

testConnection();
