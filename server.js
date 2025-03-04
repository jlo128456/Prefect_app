// server.js
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes and JSON body parsing
app.use(cors());
app.use(express.json());

/// Serve static HTML files from the "public" directory
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

// Create a MySQL connection pool using remote credentials
const pool = mysql.createPool({
  host: process.env.AIVEN_MYSQL_HOST,         // e.g., your-aiven-host.aivencloud.com
  user: process.env.AIVEN_MYSQL_USER,          // your MySQL username
  password: process.env.AIVEN_MYSQL_PASSWORD,  // your MySQL password
  database: process.env.AIVEN_MYSQL_DATABASE,  // your database name
  port: process.env.AIVEN_MYSQL_PORT || 3306,
  ssl: {
    // Aiven (or other remote hosts) often requires SSL.
    rejectUnauthorized: false,
  },
});

/**
 * JOBS ENDPOINTS
 */

// Get all jobs
app.get('/jobs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs');
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving jobs:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new job
app.post('/jobs', async (req, res) => {
  const { customerName, contactName, workPerformed, status = 'Pending' } = req.body;
  try {
    const query = 'INSERT INTO jobs (customerName, contactName, workPerformed, status) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [customerName, contactName, workPerformed, status]);
    res.json({ id: result.insertId, customerName, contactName, workPerformed, status });
  } catch (error) {
    console.error('Error inserting job:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

/**
 * USERS ENDPOINTS
 */

// Get all users
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new user
app.post('/users', async (req, res) => {
  const { id, username, password, role } = req.body;
  try {
    const query = 'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [id, username, password, role]);
    res.json({ id, username, role });
  } catch (error) {
    console.error('Error inserting user:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

/**
 * MACHINES ENDPOINTS
 */

// Get all machines
app.get('/machines', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM machines');
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving machines:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new machine
app.post('/machines', async (req, res) => {
  const { machineType, model, notes, partsUsed } = req.body;
  try {
    const query = 'INSERT INTO machines (machineType, model, notes, partsUsed) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [machineType, model, notes, partsUsed]);
    res.json({ id: result.insertId, machineType, model, notes, partsUsed });
  } catch (error) {
    console.error('Error inserting machine:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Start the server on the specified port (running on localhost)
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
