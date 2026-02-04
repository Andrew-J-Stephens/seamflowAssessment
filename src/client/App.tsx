import React, { useState, useRef } from 'react';

interface ClassificationResult {
  result: 'Hot Dog' | 'Not Hot Dog';
  timestamp: string;
  model: string;
}

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Hot Dog Classification System</h1>
          <p className="subtitle">Enterprise Image Analysis Platform</p>
        </header>

        <main className="main-content">
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
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📤</div>
                  <p className="upload-text">
                    Drag and drop an image here, or click to browse
                  </p>
                  <p className="upload-hint">
                    Supports JPEG, PNG, GIF, WebP (max 10MB)
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
                  'Classify Image'
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
              <div className="result-icon">
                {result.result === 'Hot Dog' ? '🌭' : '❌'}
              </div>
              <div className="result-text">
                <h2>{result.result}</h2>
                <p className="result-timestamp">
                  Classified at {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>Powered by OpenAI Vision API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
