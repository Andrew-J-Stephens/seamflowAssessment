import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// temporarily log the connection details
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // RDS uses SSL - we accept the RDS certificate
  },
});

// Test database connection
let dbConnected = false;
let dbError: string | null = null;

async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    dbConnected = true;
    dbError = null;
    console.log('Database connection successful');
  } catch (error) {
    dbConnected = false;
    dbError = error instanceof Error ? error.message : 'Unknown error';
    console.error('Database connection failed:', dbError);
  }
}

// Test connection on startup
testDatabaseConnection();

// Test connection every 30 seconds
setInterval(testDatabaseConnection, 30000);

// API route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API route for database status
app.get('/api/db-status', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    res.json({ 
      connected: true, 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      message: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// API route for OpenAI chat completion
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Prompt is required and must be a string' 
      });
    }

    if (!process.env.OPENAI_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key is not configured' 
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';

    res.json({ 
      response,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get response from OpenAI' 
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
