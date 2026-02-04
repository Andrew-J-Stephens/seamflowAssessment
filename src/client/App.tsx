import React, { useState, useEffect } from 'react';

interface DbStatus {
  connected: boolean;
  message: string;
  timestamp?: string;
}

interface ChatResponse {
  response: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const App: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const response = await fetch('/api/db-status');
        const data: DbStatus = await response.json();
        setDbStatus(data);
      } catch (error) {
        setDbStatus({
          connected: false,
          message: 'Failed to check database status',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDbStatus();
    // Refresh status every 10 seconds
    const interval = setInterval(fetchDbStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoadingResponse(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data: ChatResponse = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingResponse(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Hello World</h1>
        <p>Welcome to Seamflow</p>
        <p>This is a test of the CI/CD pipeline</p>
        
        <div className="db-status" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h2>Database Connection Status</h2>
          {loading ? (
            <p>Checking database connection...</p>
          ) : dbStatus ? (
            <div>
              <p style={{ 
                color: dbStatus.connected ? 'green' : 'red',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {dbStatus.connected ? '✓ Connected' : '✗ Disconnected'}
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                {dbStatus.message}
              </p>
              {dbStatus.timestamp && (
                <p style={{ fontSize: '12px', color: '#999' }}>
                  Last checked: {new Date(dbStatus.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p>Unable to determine database status</p>
          )}
        </div>

        <div className="ai-chat" style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h2>AI Chat</h2>
          <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px' }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                disabled={loadingResponse}
              />
            </div>
            <button
              type="submit"
              disabled={loadingResponse || !prompt.trim()}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: loadingResponse ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingResponse || !prompt.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loadingResponse ? 'Sending...' : 'Send'}
            </button>
          </form>

          {error && (
            <div style={{
              padding: '10px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c00',
              marginBottom: '10px',
            }}>
              Error: {error}
            </div>
          )}

          {response && (
            <div style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}>
              <strong>Response:</strong>
              <div style={{ marginTop: '10px' }}>{response}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
