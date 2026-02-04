import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import { promisify } from 'util';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// Create uploads directory if it doesn't exist (for temporary storage before S3 upload)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads (temporary storage)
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

// Initialize S3 client
const s3Client = process.env.S3_BUCKET_NAME ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
}) : null;

async function uploadToS3(filePath: string, fileName: string, contentType: string): Promise<string> {
  if (!s3Client || !process.env.S3_BUCKET_NAME) {
    throw new Error('S3 is not configured');
  }

  const fileBuffer = await readFile(filePath);
  const key = `images/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
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

  // Initialize database tables if they don't exist
  async function initializeDatabase() {
    if (!pool) return;
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS classification_history (
          id SERIAL PRIMARY KEY,
          s3_key VARCHAR(500),
          is_hot_dog BOOLEAN NOT NULL,
          model VARCHAR(100) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          request_metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_classification_history_timestamp 
        ON classification_history(timestamp DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_classification_history_is_hot_dog 
        ON classification_history(is_hot_dog)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_classification_history_s3_key 
        ON classification_history(s3_key)
      `);
      client.release();
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  // Initialize database after connection is established
  setTimeout(() => {
    if (dbConnected) {
      initializeDatabase();
    }
  }, 2000);
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

  let s3Key: string | null = null;
  const timestamp = new Date().toISOString();
  const requestMetadata = {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    originalFilename: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  };

  try {
    // Convert image to base64 for OpenAI
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

    // Upload to S3
    if (s3Client && process.env.S3_BUCKET_NAME) {
      try {
        s3Key = await uploadToS3(req.file.path, req.file.filename, mimeType);
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        // Continue even if S3 upload fails
      }
    }

    // Store in database
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO classification_history 
           (s3_key, is_hot_dog, model, timestamp, request_metadata) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            s3Key,
            result === 'Hot Dog',
            completion.model,
            timestamp,
            JSON.stringify(requestMetadata)
          ]
        );
      } catch (dbError) {
        console.error('Database insert error:', dbError);
        // Continue even if database insert fails
      }
    }

    // Clean up uploaded file after processing
    await unlink(req.file.path).catch(console.error);

    res.json({ 
      result,
      timestamp,
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

// API route to get classification history
app.get('/api/history', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ 
      error: 'Database not configured' 
    });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT id, s3_key, is_hot_dog, model, timestamp, request_metadata
       FROM classification_history
       ORDER BY timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Generate presigned URLs for S3 images if S3 is configured
    const history = await Promise.all(
      result.rows.map(async (row) => {
        let imageUrl: string | null = null;
        
        if (row.s3_key && s3Client && process.env.S3_BUCKET_NAME) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: row.s3_key,
            });
            imageUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          } catch (error) {
            console.error('Error generating presigned URL:', error);
          }
        }

        // PostgreSQL JSONB returns as object, not string, so no need to parse
        let metadata = null;
        if (row.request_metadata) {
          if (typeof row.request_metadata === 'string') {
            metadata = JSON.parse(row.request_metadata);
          } else {
            metadata = row.request_metadata;
          }
        }

        return {
          id: row.id,
          result: row.is_hot_dog ? 'Hot Dog' : 'Not Hot Dog',
          model: row.model,
          timestamp: row.timestamp,
          imageUrl,
          metadata,
        };
      })
    );

    res.json({ history });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch history' 
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
