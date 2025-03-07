// server.js
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes and parse JSON bodies
app.use(cors());
app.use(express.json());

// Always use remote MySQL (e.g., Aiven) credentials
const pool = mysql.createPool({
  host: process.env.AIVEN_MYSQL_HOST,         // e.g., your-aiven-host.aivencloud.com
  user: process.env.AIVEN_MYSQL_USER,          // your MySQL username
  password: process.env.AIVEN_MYSQL_PASSWORD,  // your MySQL password
  database: process.env.AIVEN_MYSQL_DATABASE,  // your database name
  port: process.env.AIVEN_MYSQL_PORT || 3306,
  ssl: {
    // Aiven requires SSL. This setting skips certificate verification.
    rejectUnauthorized: false,
  },
});

// If running locally with static HTML, serve files from the public folder
if (process.env.LOCAL_STATIC === 'true') {
  // Resolve directory path in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use(express.static(path.join(__dirname, 'api', 'public')));
  console.log('Serving static files from the public folder (local mode)');
}

/**
 * API ENDPOINTS
 */

// JOBS ENDPOINTS
app.get('/jobs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs');
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving jobs:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/jobs/:id', async (req, res) => {
  const jobId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    
    if (rows.length === 0) {
      // If no job is found, return 404
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // If the job exists, send the first (and only) row
    res.json(rows[0]);
  } catch (error) {
    console.error('Error retrieving job:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/jobs', async (req, res) => {
  // Expect snake_case keys in the request body
  const { work_order, customer_name, contractor, work_required, status = 'Pending' } = req.body;
  try {
    const query = 'INSERT INTO jobs (work_order, customer_name, contractor, work_required, status) VALUES (?, ?, ?, ?, ?)';
    const [result] = await pool.query(query, [work_order, customer_name, contractor, work_required, status]);
    res.json({ id: result.insertId, work_order, customer_name, contractor, work_required, status });
  } catch (error) {
    console.error('Error inserting job:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

app.put('/jobs/:id', async (req, res) => {
  const { id } = req.params; // Extract ID from URL
  const { status, contractor_status, onsite_time, status_timestamp } = req.body;

  try {
    // Ensure job exists before updating
    const [existingJob] = await pool.query("SELECT * FROM jobs WHERE id = ?", [id]);
    if (existingJob.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Update job
    const query = `
      UPDATE jobs 
      SET status = ?, contractor_status = ?, onsite_time = ?, status_timestamp = ? 
      WHERE id = ?`;
    const [result] = await pool.query(query, [status, contractor_status, onsite_time, status_timestamp, id]);

    res.json({ success: true, message: "Job updated successfully" });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Database update failed" });
  }
});

// USERS ENDPOINTS
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

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

// MACHINES ENDPOINTS
app.get('/machines', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM machines');
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving machines:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/machines', async (req, res) => {
  // Expect snake_case keys in the request body
  const { machine_type, model, notes, parts_used } = req.body;
  try {
    const query = 'INSERT INTO machines (machine_type, model, notes, parts_used) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [machine_type, model, notes, parts_used]);
    res.json({ id: result.insertId, machine_type, model, notes, parts_used });
  } catch (error) {
    console.error('Error inserting machine:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Start the server (API running on localhost)
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
