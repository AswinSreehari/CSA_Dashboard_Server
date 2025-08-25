import express from "express";
import {
  getDataSource,
  getFilteredFeedback,
  getKeywordSentimentSummary,
  getMentionVolumeOverTime,
  getPlatformSentimentSummary,
  getRadarComparison,
  getSentimentDistribution,
  getSentimentOverTime,
  getSentimentRanking,
  getTopStats,
  importMockFeedback,
} from "../controllers/feedback.controller.js";

const router = express.Router();

router.get("/import-mock", importMockFeedback);
router.get("/sentiment-summary", getKeywordSentimentSummary);
router.get('/getplatformdata', getPlatformSentimentSummary);
router.get('/sentiment-overtime', getSentimentOverTime);
router.get('/mention-volume', getMentionVolumeOverTime);
router.get('/sentiment-ranking', getSentimentRanking);
router.get('/sentiment-distribution', getSentimentDistribution);
router.get("/top-stats", getTopStats);
router.get('/radar-comparison', getRadarComparison);
router.get('/data-source', getDataSource);


router.get("/filterdata", getFilteredFeedback)








export default router;
