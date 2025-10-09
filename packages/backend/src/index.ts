import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import apiRouter from './routes/api.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Allow CORS from both development server and E2E test preview server
const allowedOrigins = ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRouter);

// 404 handler (must come after all routes)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
export { server };
