import express from "express";
import {
  getBrandComparison,
  getDataSource,
  getEmotionSourceHeatmap,
  getFilteredFeedback,
  getKeywordSentimentSummary,
  getMentionVolumeOverTime,
  getNegativeEmotionsBreakdown,
  getPlatformSentimentSummary,
  getProductMentions,
  getRadarComparison,
  getSentimentDistribution,
  getSentimentOverTime,
  getSentimentRanking,
  getTopNegativeDrivers,
  getTopStats,
  getTrendingModels,
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
router.get('/trending-models', getTrendingModels);
router.get('/product-mentions', getProductMentions);
router.get('/brand-comparison', getBrandComparison);
router.get('/emotion-source-heatmap', getEmotionSourceHeatmap);
router.get('/negative-emotions-breakdown', getNegativeEmotionsBreakdown);
router.get('/top-negative-drivers', getTopNegativeDrivers);
 

router.get("/filterdata", getFilteredFeedback)








export default router;
