-- Database initialization script for classification history
-- This script creates the table to store image classification results

CREATE TABLE IF NOT EXISTS classification_history (
    id SERIAL PRIMARY KEY,
    s3_key VARCHAR(500),
    is_hot_dog BOOLEAN NOT NULL,
    model VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    request_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_classification_history_timestamp ON classification_history(timestamp DESC);

-- Create index on is_hot_dog for filtering
CREATE INDEX IF NOT EXISTS idx_classification_history_is_hot_dog ON classification_history(is_hot_dog);

-- Create index on s3_key for lookups
CREATE INDEX IF NOT EXISTS idx_classification_history_s3_key ON classification_history(s3_key);
