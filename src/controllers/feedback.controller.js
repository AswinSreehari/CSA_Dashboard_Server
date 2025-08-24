import fs from "fs/promises";
import path from "path";
import Feedback from "../models/feedback.js";
import { analyzeSentiment } from "../services/sentiment.service.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

export async function importMockFeedback(req, res, next) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const filePath = join(__dirname, "../data/MockFeedback.json");
    console.log("filePath -->", filePath);

    const rawContent = await fs.readFile(filePath, "utf-8");
    const feedbacks = JSON.parse(rawContent);

    if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
      return res.status(400).json({ error: "No mock feedback data found" });
    }

    const enriched = [];
    for (const fb of feedbacks) {
      try {
        const { label, score, raw } = await analyzeSentiment(fb.text);
        enriched.push({
          ...fb,
          date: fb.date ? new Date(fb.date) : new Date(),
          sentiment: { label, score },
          metadata: { sentimentRaw: raw },
        });
      } catch (innerErr) {
        // Handle individual sentiment analysis failure gracefully if needed
        console.error(
          `Sentiment analysis failed for feedback id=${fb.id}:`,
          innerErr
        );
      }
    }

    const inserted = await Feedback.insertMany(enriched);

    res
      .status(201)
      .json({
        message: `Imported and inserted ${inserted.length} mock feedbacks`,
      });
  } catch (err) {
    next(err);
  }
}

export async function getKeywordSentimentSummary(req, res, next) {
  try {
    // Aggregate sentiment counts grouped by category
    const aggregation = await Feedback.aggregate([
      {
        $group: {
          _id: "$category",
          mentions: { $sum: 1 },
          positive: {
            $sum: {
              $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0],
            },
          },
          neutral: {
            $sum: {
              $cond: [{ $eq: ["$sentiment.label", "neutral"] }, 1, 0],
            },
          },
          negative: {
            $sum: {
              $cond: [{ $eq: ["$sentiment.label", "negative"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          category: "$_id",
          mentions: 1,
          positive: 1,
          neutral: 1,
          negative: 1,
          _id: 0,
          // Calculate positive percentage as string for frontend display
          positivePercentage: {
            $concat: [
              {
                $toString: {
                  $round: [
                    {
                      $multiply: [{ $divide: ["$positive", "$mentions"] }, 100],
                    },
                    0,  
                  ],
                },
              },
              "%",
            ],
          },
        },
      },
    ]);

    res.json(aggregation);
  } catch (err) {
    next(err);
  }
}

// <----------------------Platform sentiment--------------------->

export async function getPlatformSentimentSummary(req, res, next) {
  try {
    // Aggregate counts by platform and sentiment labels
    const aggregation = await Feedback.aggregate([
      {
        $group: {
          _id: '$source',   // group by platform/source field
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] },
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] },
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          platform: '$_id',
          positive: 1,
          neutral: 1,
          negative: 1,
          _id: 0,
        },
      },
    ]);

    res.json(aggregation);
  } catch (error) {
    next(error);
  }
}

// <--------------------------SentimentOvertime------------------>

export async function getSentimentOverTime(req, res, next) {
  try {
    const aggregation = await Feedback.aggregate([
      {
        // Group by date (day-level)
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          negative: {
            $sum: { $cond: [{ $eq: ["$sentiment.label", "negative"] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ["$sentiment.label", "neutral"] }, 1, 0] }
          },
          positive: {
            $sum: { $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0] }
          }
        }
      },
      {
        // Calculate net_sentiment = positive - negative
        $addFields: {
          net_sentiment: { $subtract: ["$positive", "$negative"] },
          created_at: "$_id"
        }
      },
      {
        $project: {
          _id: 0,
          created_at: 1,
          negative: 1,
          neutral: 1,
          positive: 1,
          net_sentiment: 1
        }
      },
      {
        $sort: { created_at: 1 }
      }
    ]);

    res.json(aggregation);
  } catch (error) {
    next(error);
  }
}


// <-----------------------Mention Volume----------------------->

 
export async function getMentionVolumeOverTime(req, res, next) {
  try {
    const aggregation = await Feedback.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          mention_count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          created_at: "$_id",
          mention_count: 1
        }
      },
      {
        $sort: { created_at: 1 }
      }
    ]);

    res.json(aggregation);
  } catch (error) {
    next(error);
  }
}

// <-----------------------Sentiment Ranking---------------------->

 
export async function getSentimentRanking(req, res, next) {
  try {
    // Aggregate mention counts and average sentiment percent per brand/model
    const aggregation = await Feedback.aggregate([
      {
        $group: {
          _id: "$model",                         // Group by product model/brand field
          mentions: { $sum: 1 },
          avg_sentiment: { $avg: "$sentiment.score" },  // average sentiment score (assuming 0 to 1 or -1 to 1)
        }
      },
      {
        $project: {
          _id: 0,
          brand: "$_id",
          mentions: 1,
          sentiment_percent: {
            $concat: [
              { $toString: { $round: [{ $multiply: ["$avg_sentiment", 100] }, 1] } },
              "%"
            ]
          }
        }
      },
      { $sort: { mentions: -1 } }, // Sort by mentions descending
      { $limit: 10 }
    ]);

    // For demo, simulate delta_positive and delta_negative and is_your_brand
    const yourBrand = 'Google Pixel';
    const rankedData = aggregation.map((item, index) => ({
      rank: index + 1,
      brand: item.brand,
      mentions: item.mentions,
      market_share: ((item.mentions / aggregation.reduce((a,b) => a + b.mentions, 0)) * 100).toFixed(1) + "%",
      sentiment_percent: item.sentiment_percent,
      delta_positive: `+${(Math.random() * 3).toFixed(1)}%`,
      delta_negative: `-${(Math.random() * 2).toFixed(1)}%`,
      is_your_brand: item.brand === yourBrand,
    }));

    res.json({ rankings: rankedData });
  } catch (error) {
    next(error);
  }
}


// <----------------Sentiment Distribution------------------------->

export async function getSentimentDistribution(req, res, next) {
  try {
    // Aggregate counts and percentages by sentiment label
    const aggregation = await Feedback.aggregate([
      {
        $group: {
          _id: "$sentiment.label",
          count: { $sum: 1 },
        }
      }
    ]);

    // Transform to object with counts by sentiment
    const distCounts = aggregation.reduce(
      (acc, item) => ({ ...acc, [item._id || "neutral"]: item.count }),
      {}
    );

    const total_mentions = Object.values(distCounts).reduce(
      (a, b) => a + b,
      0
    );

    const percentages = {
      positive: ((distCounts.positive || 0) / total_mentions) * 100,
      neutral: ((distCounts.neutral || 0) / total_mentions) * 100,
      negative: ((distCounts.negative || 0) / total_mentions) * 100,
    };

    res.json({
      total_mentions,
      sentiment_distribution: {
        ...distCounts,
        percentages,
      }
    });
  } catch (error) {
    next(error);
  }
}

// <-----------------------Top Section-------------------------------->

export async function getTopStats(req, res, next) {
  try {
    // Aggregate overall sentiment and counts
    const aggregation = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          totalMentions: { $sum: 1 },
          avgSentimentScore: { $avg: "$sentiment.score" },
          positiveMentions: {
            $sum: {
              $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0],
            },
          },
          // Add more aggregations as needed, e.g. engagement, deltas (mocked client-side or here)
        },
      },
    ]);

    const result = aggregation[0] || {};

    // For demo: mock change values (in real app compute changes)
    const mockChanges = {
      netSentimentChange: 2.1,
      totalMentionsChange: 12.3,
      positiveSentimentChange: 5.2,
      engagementRateChange: -1.1,
    };

    // Calculate positive sentiment percent
    const positiveSentimentPercent =
      result.totalMentions > 0
        ? (result.positiveMentions / result.totalMentions) * 100
        : 0;

    // Mock engagement rate for demo
    const engagementRate = 8.9;

    res.json({
      netSentiment:
        result.avgSentimentScore != null ? Number(result.avgSentimentScore.toFixed(1)) : 0,
      netSentimentChange: mockChanges.netSentimentChange,
      totalMentions: result.totalMentions || 0,
      totalMentionsChange: mockChanges.totalMentionsChange,
      positiveSentimentPercent: Number(positiveSentimentPercent.toFixed(1)),
      positiveSentimentChange: mockChanges.positiveSentimentChange,
      engagementRate,
      engagementRateChange: mockChanges.engagementRateChange,
    });
  } catch (error) {
    next(error);
  }
}

// <--------------------Multi Dimentional-------------------------->

 
export async function getRadarComparison(req, res, next) {
  try {
    const brands = ["Google Pixel", "Samsung Galaxy", "iPhone"];
    const categories = [
      "Camera Quality",
      "Battery Life",
      "Performance",
      "Design",
      "Value for Money",
      "Software Experience",
    ];

    const aggregation = await Feedback.aggregate([
      {
        $addFields: {
          brand: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$model", regex: /pixel/i } }, then: "Google Pixel" },
                { case: { $regexMatch: { input: "$model", regex: /samsung/i } }, then: "Samsung Galaxy" },
                { case: { $regexMatch: { input: "$model", regex: /iphone/i } }, then: "iPhone" },
              ],
              default: "Other"
            }
          },
          radarCategory: {
            $switch: {
              branches: [
                { case: { $eq: ["$category", "Camera"] }, then: "Camera Quality" },
                { case: { $eq: ["$category", "Battery"] }, then: "Battery Life" },
                { case: { $eq: ["$category", "Performance"] }, then: "Performance" },
                { case: { $eq: ["$category", "Design"] }, then: "Design" },
                { case: { $eq: ["$category", "Pricing"] }, then: "Value for Money" },
                { case: { $eq: ["$category", "Software Experience"] }, then: "Software Experience" },
              ],
              default: "Other"
            }
          }
        }
      },
      {
        $match: {
          brand: { $in: brands },
          radarCategory: { $in: categories }
        }
      },
      {
        $group: {
          _id: {
            brand: "$brand",
            category: "$radarCategory"
          },
          avg_score: { $avg: "$sentiment.score" }
        }
      }
    ]);

    // Prepare data structure for frontend radar chart
    const categoryBrandMap = {};
    categories.forEach(category => {
      categoryBrandMap[category] = { category };
      brands.forEach(brand => {
        categoryBrandMap[category][brand] = 0; // default zero
      });
    });

    aggregation.forEach(({ _id, avg_score }) => {
      const { brand, category } = _id;
      if (categoryBrandMap[category]) {
        categoryBrandMap[category][brand] = Math.round((avg_score || 0) * 100);
      }
    });

    const chartData = Object.values(categoryBrandMap);

    res.json({ data: chartData, brands });
  } catch (error) {
    next(error);
  }
}


// -----------------------------------Filter------------------------------

 
export async function getFilteredFeedback(req, res, next) {
  try {
    const { platform } = req.query;

    const filter = {};

     if (platform && platform !== "all") {
       const platformNormalized = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
      filter.source = platformNormalized;
    }

    const feedbacks = await Feedback.find(filter).exec();

    res.status(200).json({ success: true, data: feedbacks });
  } catch (err) {
    next(err);
  }
}

