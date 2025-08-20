import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  id: String,           
  text: { type: String, required: true },
  date: Date,
  category: String,
  source: String,
  model: String,
  customerId: String,
  sentiment: {
    label: { type: String, enum: ['positive', 'neutral', 'negative'] },
    score: Number
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
