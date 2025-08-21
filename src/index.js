import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB (expects process.env.MONGO_URI)
connectDB();

// Allowed origins list
const allowedOrigins = [
  "https://customer-sentiment-analysis.netlify.app",
  "http://localhost:5000"
];

// CORS options with dynamic origin check
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like curl or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: This origin is not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" })); // increased limit for batch imports
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/", (_req, res) => {
  res.status(200).send("Backend API is running");
});

import feedbackRoutes from "./routes/feedback.routes.js";
app.use("/api/feedback", feedbackRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

// Centralized error handler (keep this last)
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 400;
  res.status(status).json({ error: err.message || "Request failed" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
