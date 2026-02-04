import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/logo.png';

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

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    // Create preview URL
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
    fetchHistory();
    // Refresh history every 10 seconds
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Refresh history after a successful classification
    if (result) {
      fetchHistory();
    }
  }, [result]);

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <img src={logo} alt="Hot Dog or Not Logo" className="logo" />
        </header>

        <main className="main-content">
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
        </main>
      </div>
    </div>
  );
};

export default App;
