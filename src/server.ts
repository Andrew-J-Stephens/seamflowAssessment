import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import { promisify } from 'util';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Helper functions for file operations
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

async function imageToBase64(filePath: string): Promise<string> {
  const imageBuffer = await readFile(filePath);
  return imageBuffer.toString('base64');
}

// Database connection pool (optional - only if DB_HOST is set)
let pool: Pool | null = null;
if (process.env.DB_HOST) {
  pool = new Pool({
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
    if (!pool) return;
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
}

// API route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API route for database status (optional - only if pool exists)
app.get('/api/db-status', async (req, res) => {
  if (!pool) {
    return res.json({ 
      connected: false, 
      message: 'Database not configured',
      timestamp: new Date().toISOString()
    });
  }

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

// API route for hot dog classification
app.post('/api/classify', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No image file provided' 
    });
  }

  if (!process.env.OPENAI_KEY) {
    // Clean up uploaded file
    await unlink(req.file.path).catch(console.error);
    return res.status(500).json({ 
      error: 'OpenAI API key is not configured' 
    });
  }

  try {
    // Convert image to base64
    const base64Image = await imageToBase64(req.file.path);
    
    // Determine MIME type
    const mimeType = req.file.mimetype;

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Look at this image and determine if it contains a hot dog. Respond with ONLY one of these two exact phrases: "Hot Dog" or "Not Hot Dog". Do not include any explanation, reasoning, or additional text.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.trim() || 'Not Hot Dog';
    
    // Normalize response to ensure it's exactly "Hot Dog" or "Not Hot Dog"
    const result = response === 'Hot Dog' ? 'Hot Dog' : 'Not Hot Dog';

    // Clean up uploaded file after processing
    await unlink(req.file.path).catch(console.error);

    res.json({ 
      result,
      timestamp: new Date().toISOString(),
      model: completion.model
    });
  } catch (error) {
    // Clean up uploaded file on error
    await unlink(req.file.path).catch(console.error);
    
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to classify image' 
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
