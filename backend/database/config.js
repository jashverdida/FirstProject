const mysql = require('mysql2');
require('dotenv').config();

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sari_sari_pos',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Promisify the pool for async/await usage
const promisePool = pool.promise();

// Database helper functions
const dbAsync = {
    query: async (sql, params = []) => {
        try {
            const [rows] = await promisePool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // For INSERT operations - returns insertId
    insert: async (sql, params = []) => {
        try {
            const [result] = await promisePool.execute(sql, params);
            return { insertId: result.insertId, affectedRows: result.affectedRows };
        } catch (error) {
            console.error('Database insert error:', error);
            throw error;
        }
    },

    // For UPDATE/DELETE operations - returns affectedRows
    modify: async (sql, params = []) => {
        try {
            const [result] = await promisePool.execute(sql, params);
            return { affectedRows: result.affectedRows };
        } catch (error) {
            console.error('Database modify error:', error);
            throw error;
        }
    },

    // Get single row
    get: async (sql, params = []) => {
        try {
            const [rows] = await promisePool.execute(sql, params);
            return rows[0] || null;
        } catch (error) {
            console.error('Database get error:', error);
            throw error;
        }
    },

    // Get all rows
    all: async (sql, params = []) => {
        try {
            const [rows] = await promisePool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database all error:', error);
            throw error;
        }
    },

    // Begin transaction
    beginTransaction: async () => {
        const connection = await promisePool.getConnection();
        await connection.beginTransaction();
        return connection;
    },

    // Commit transaction
    commit: async (connection) => {
        await connection.commit();
        connection.release();
    },

    // Rollback transaction
    rollback: async (connection) => {
        await connection.rollback();
        connection.release();
    }
};

// Test database connection
const testConnection = async () => {
    try {
        // First test connection without specifying database
        const testConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        };
        
        const testPool = mysql.createPool(testConfig).promise();
        await testPool.execute('SELECT 1');
        await testPool.end();
        
        console.log('✅ Connected to MySQL server');
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to MySQL server:', error.message);
        console.log('💡 Make sure MySQL is running and check your database credentials');
        return false;
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Closing database connection pool...');
    pool.end(() => {
        console.log('✅ Database connection pool closed');
        process.exit(0);
    });
});

module.exports = { pool, promisePool, dbAsync, testConnection };
