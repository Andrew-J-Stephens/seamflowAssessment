import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/logo.png';

type Page = 'home' | 'architecture';

interface ClassificationResult {
  result: 'Hot Dog' | 'Not Hot Dog';
  timestamp: string;
  model: string;
}

interface HistoryItem {
  id: number;
  result: 'Hot Dog' | 'Not Hot Dog';
  model: string;
  timestamp: string;
  imageUrl: string | null;
  metadata: {
    originalFilename?: string;
    fileSize?: number;
    ip?: string;
    userAgent?: string;
  } | null;
}

// Sidebar Component
const Sidebar: React.FC<{ currentPage: Page; onNavigate: (page: Page) => void }> = ({ currentPage, onNavigate }) => {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`sidebar-link ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          Home
        </button>
        <button
          className={`sidebar-link ${currentPage === 'architecture' ? 'active' : ''}`}
          onClick={() => onNavigate('architecture')}
        >
          Architecture
        </button>
      </nav>
    </aside>
  );
};

// Footer Component
const Footer: React.FC = () => {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <footer className="footer">
      <p className="footer-text">
        {today} • Built by Andrew Stephens
      </p>
    </footer>
  );
};

// Home Component (Classification Interface)
const Home: React.FC<{
  history: HistoryItem[];
  onHistoryUpdate: () => void;
}> = ({ history, onHistoryUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await fetch('/api/classify', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to classify image');
      }

      const data: ClassificationResult = await res.json();
      setResult(data);
      onHistoryUpdate();
      
      // Automatically clear the image after successful classification
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="home-content">
      {history.length > 0 && (
        <div className="history-container">
          <h3 className="history-title">Recent Classifications</h3>
          <div className="history-scroll">
            {history.map((item) => (
              <div key={item.id} className={`history-item ${item.result === 'Hot Dog' ? 'hot-dog' : 'not-hot-dog'}`}>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="Classification" className="history-image" />
                )}
                <div className="history-content">
                  <div className="history-result">{item.result}</div>
                  <div className="history-timestamp">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  {item.metadata?.originalFilename && (
                    <div className="history-filename">{item.metadata.originalFilename}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="upload-form">
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-preview' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !previewUrl && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={loading}
          />
          
          {previewUrl ? (
            <div className="preview-container">
              <img src={previewUrl} alt="Preview" className="preview-image" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="remove-image-btn"
                disabled={loading}
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="upload-placeholder">
              <svg className="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="upload-text">
                Drag and drop an image here, or click to browse
              </p>
              <p className="upload-hint">
                JPEG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="button-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedFile || loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              'Classify'
            )}
          </button>
          
          {selectedFile && (
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              disabled={loading}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {result && (
        <div className={`result-container ${result.result === 'Hot Dog' ? 'hot-dog' : 'not-hot-dog'}`}>
          <div className="result-content">
            <div className="result-label">{result.result}</div>
            <div className="result-timestamp">
              {new Date(result.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Architecture Component
const Architecture: React.FC = () => {
  return (
    <div className="architecture-content">
      <h1 className="architecture-title">Architecture</h1>
      
      <section className="architecture-section">
        <h2 className="architecture-heading">CI/CD with GitHub Actions</h2>
        <p className="architecture-text">
          This application uses GitHub Actions for continuous integration and deployment. 
          When code is pushed to the main branch, the workflow automatically:
        </p>
        <ul className="architecture-list">
          <li>Builds a Docker image containing the Node.js server and React frontend</li>
          <li>Pushes the image to Amazon ECR (Elastic Container Registry)</li>
          <li>Updates the Terraform configuration with the new image tag</li>
          <li>Applies Terraform changes to update the ECS service</li>
          <li>Initializes the database schema if needed</li>
        </ul>
        <p className="architecture-text">
          The deployment uses OIDC (OpenID Connect) for secure authentication with AWS, 
          eliminating the need for long-lived access keys stored in GitHub secrets.
        </p>
      </section>

      <section className="architecture-section">
        <h2 className="architecture-heading">Terraform Cloud Infrastructure</h2>
        <p className="architecture-text">
          All cloud infrastructure is defined and managed using Terraform, including:
        </p>
        <ul className="architecture-list">
          <li><strong>VPC & Networking:</strong> Custom VPC with public and private subnets across multiple availability zones</li>
          <li><strong>RDS Database:</strong> PostgreSQL database in public subnets for demo purposes, storing classification history and metadata</li>
          <li><strong>S3 Bucket:</strong> Stores uploaded images with versioning and encryption enabled</li>
          <li><strong>ECS Fargate:</strong> Serverless container hosting for the application, automatically scaling based on demand</li>
          <li><strong>Application Load Balancer:</strong> Distributes traffic across ECS tasks and provides health checks</li>
          <li><strong>Security Groups:</strong> Network-level firewall rules controlling access to resources</li>
          <li><strong>IAM Roles:</strong> Fine-grained permissions for ECS tasks to access S3 and other AWS services</li>
        </ul>
        <p className="architecture-text">
          Infrastructure changes are version-controlled and can be reviewed before deployment, 
          ensuring consistency and reducing the risk of configuration drift.
        </p>
      </section>

      <section className="architecture-section">
        <h2 className="architecture-heading">Frontend: React with TypeScript</h2>
        <p className="architecture-text">
          The frontend is built with React and TypeScript, providing:
        </p>
        <ul className="architecture-list">
          <li><strong>Type Safety:</strong> TypeScript ensures type correctness at compile time</li>
          <li><strong>Component-Based Architecture:</strong> Reusable components for UI elements</li>
          <li><strong>Webpack Bundling:</strong> Optimized production builds with code splitting</li>
          <li><strong>Real-time Updates:</strong> History panel automatically refreshes to show new classifications</li>
          <li><strong>Responsive Design:</strong> Works seamlessly on desktop and mobile devices</li>
        </ul>
        <p className="architecture-text">
          The React app is served as static files by the Express server, enabling fast page loads 
          and a smooth user experience.
        </p>
      </section>

      <section className="architecture-section">
        <h2 className="architecture-heading">Backend: Node.js with Express</h2>
        <p className="architecture-text">
          The backend is built with Node.js and Express, handling:
        </p>
        <ul className="architecture-list">
          <li><strong>Image Upload:</strong> Receives and processes image files using Multer</li>
          <li><strong>OpenAI Integration:</strong> Uses GPT-4 Vision API to classify images as "Hot Dog" or "Not Hot Dog"</li>
          <li><strong>S3 Storage:</strong> Uploads images to S3 and generates presigned URLs for secure access</li>
          <li><strong>Database Operations:</strong> Stores classification results, metadata, and S3 keys in PostgreSQL</li>
          <li><strong>RESTful API:</strong> Provides endpoints for classification and history retrieval</li>
          <li><strong>Auto-initialization:</strong> Automatically creates database tables on first startup if they don't exist</li>
        </ul>
        <p className="architecture-text">
          The server is containerized with Docker and runs on ECS Fargate, providing automatic 
          scaling and high availability without managing servers.
        </p>
      </section>

      <section className="architecture-section">
        <h2 className="architecture-heading">Data Flow</h2>
        <ol className="architecture-list architecture-ordered">
          <li>User uploads an image through the React frontend</li>
          <li>Image is sent to the Express server via POST /api/classify</li>
          <li>Server uploads image to S3 and receives a unique S3 key</li>
          <li>Server sends image to OpenAI Vision API for classification</li>
          <li>Classification result is stored in RDS along with S3 key and request metadata</li>
          <li>Result is returned to the frontend and displayed to the user</li>
          <li>History panel fetches recent classifications with presigned S3 URLs for image display</li>
        </ol>
      </section>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history?limit=50');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === 'home') {
      fetchHistory();
      const interval = setInterval(fetchHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [currentPage]);

  return (
    <div className="app">
      <div className="app-layout">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        
        <div className="main-wrapper">
          <div className="container">
            <header className="header">
              <img src={logo} alt="Hot Dog or Not Logo" className="logo" />
            </header>

            <main className="main-content">
              {currentPage === 'home' && (
                <Home history={history} onHistoryUpdate={fetchHistory} />
              )}
              {currentPage === 'architecture' && <Architecture />}
            </main>

            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
