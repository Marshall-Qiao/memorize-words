const express = require('express');
const router = express.Router();

// 获取整体分析数据
router.get('/overview', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // 基础统计
    const [basicStats] = await req.db.execute(`
      SELECT 
        COUNT(DISTINCT ts.id) as total_sessions,
        COUNT(DISTINCT w.id) as total_words,
        COUNT(we.id) as total_errors,
        AVG(ts_stats.accuracy_rate) as avg_accuracy,
        SUM(ts_stats.total_time_seconds) as total_time_seconds
      FROM training_sessions ts
      LEFT JOIN words w ON JSON_CONTAINS(ts.word_ids, CAST(w.id AS JSON))
      LEFT JOIN word_errors we ON ts.id = we.session_id AND we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      LEFT JOIN training_stats ts_stats ON ts.id = ts_stats.session_id
      WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(days), parseInt(days)]);
    
    // 错误类型分布
    const [errorTypes] = await req.db.execute(`
      SELECT 
        error_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM word_errors WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)), 2) as percentage
      FROM word_errors
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_type
      ORDER BY count DESC
    `, [parseInt(days), parseInt(days)]);
    
    // 每日学习进度
    const [dailyProgress] = await req.db.execute(`
      SELECT 
        DATE(ts.created_at) as date,
        COUNT(DISTINCT ts.id) as sessions_count,
        COUNT(we.id) as errors_count,
        AVG(ts_stats.accuracy_rate) as avg_accuracy
      FROM training_sessions ts
      LEFT JOIN word_errors we ON ts.id = we.session_id AND DATE(we.created_at) = DATE(ts.created_at)
      LEFT JOIN training_stats ts_stats ON ts.id = ts_stats.session_id
      WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(ts.created_at)
      ORDER BY date DESC
    `, [parseInt(days)]);
    
    // 最常出错的单词
    const [topErrorWords] = await req.db.execute(`
      SELECT 
        w.word,
        w.id as word_id,
        COUNT(we.id) as error_count,
        MAX(we.created_at) as last_error,
        ROUND(COUNT(we.id) * 100.0 / (SELECT COUNT(*) FROM word_errors WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)), 2) as error_percentage
      FROM word_errors we
      JOIN words w ON we.word_id = w.id
      WHERE we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY w.id, w.word
      ORDER BY error_count DESC
      LIMIT 10
    `, [parseInt(days), parseInt(days)]);
    
    // 学习趋势（按周）
    const [weeklyTrend] = await req.db.execute(`
      SELECT 
        YEARWEEK(ts.created_at) as week,
        COUNT(DISTINCT ts.id) as sessions_count,
        COUNT(we.id) as errors_count,
        AVG(ts_stats.accuracy_rate) as avg_accuracy,
        SUM(ts_stats.total_time_seconds) as total_time_seconds
      FROM training_sessions ts
      LEFT JOIN word_errors we ON ts.id = we.session_id
      LEFT JOIN training_stats ts_stats ON ts.id = ts_stats.session_id
      WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY YEARWEEK(ts.created_at)
      ORDER BY week DESC
    `, [parseInt(days)]);
    
    res.json({
      basicStats: basicStats[0],
      errorTypes,
      dailyProgress,
      topErrorWords,
      weeklyTrend,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching overview analysis:', error);
    res.status(500).json({ error: 'Failed to fetch overview analysis' });
  }
});

// 获取会话详细分析
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 会话基本信息
    const [sessionInfo] = await req.db.execute(`
      SELECT 
        ts.*,
        ts_stats.total_words,
        ts_stats.correct_words,
        ts_stats.error_words,
        ts_stats.accuracy_rate,
        ts_stats.total_time_seconds
      FROM training_sessions ts
      LEFT JOIN training_stats ts_stats ON ts.id = ts_stats.session_id
      WHERE ts.id = ?
    `, [id]);
    
    if (sessionInfo.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // 错误详情
    const [errors] = await req.db.execute(`
      SELECT 
        we.*,
        w.word,
        w.id as word_id
      FROM word_errors we
      JOIN words w ON we.word_id = w.id
      WHERE we.session_id = ?
      ORDER BY we.created_at DESC
    `, [id]);
    
    // 错误类型统计
    const [errorTypeStats] = await req.db.execute(`
      SELECT 
        error_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM word_errors WHERE session_id = ?), 2) as percentage
      FROM word_errors
      WHERE session_id = ?
      GROUP BY error_type
      ORDER BY count DESC
    `, [id, id]);
    
    // 单词难度分析
    const [wordDifficulty] = await req.db.execute(`
      SELECT 
        w.word,
        w.id as word_id,
        COUNT(we.id) as error_count,
        MAX(we.created_at) as last_error,
        ROUND(COUNT(we.id) * 100.0 / (SELECT COUNT(*) FROM word_errors WHERE session_id = ?), 2) as difficulty_percentage
      FROM word_errors we
      JOIN words w ON we.word_id = w.id
      WHERE we.session_id = ?
      GROUP BY w.id, w.word
      ORDER BY error_count DESC
    `, [id, id]);
    
    res.json({
      session: sessionInfo[0],
      errors,
      errorTypeStats,
      wordDifficulty
    });
  } catch (error) {
    console.error('Error fetching session analysis:', error);
    res.status(500).json({ error: 'Failed to fetch session analysis' });
  }
});

// 获取学习进度分析
router.get('/progress', async (req, res) => {
  try {
    const { days = 30, groupBy = 'day' } = req.query;
    
    let dateFormat, groupByClause;
    
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        groupByClause = 'DATE_FORMAT(ts.created_at, "%Y-%m-%d %H")';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupByClause = 'DATE(ts.created_at)';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        groupByClause = 'YEARWEEK(ts.created_at)';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupByClause = 'DATE_FORMAT(ts.created_at, "%Y-%m")';
        break;
      default:
        dateFormat = '%Y-%m-%d';
        groupByClause = 'DATE(ts.created_at)';
    }
    
    const [progress] = await req.db.execute(`
      SELECT 
        ${groupByClause} as period,
        COUNT(DISTINCT ts.id) as sessions_count,
        COUNT(DISTINCT w.id) as unique_words_learned,
        COUNT(we.id) as total_errors,
        AVG(ts_stats.accuracy_rate) as avg_accuracy,
        SUM(ts_stats.total_time_seconds) as total_time_seconds,
        ROUND(AVG(ts_stats.accuracy_rate), 2) as accuracy_trend
      FROM training_sessions ts
      LEFT JOIN words w ON JSON_CONTAINS(ts.word_ids, CAST(w.id AS JSON))
      LEFT JOIN word_errors we ON ts.id = we.session_id
      LEFT JOIN training_stats ts_stats ON ts.id = ts_stats.session_id
      WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `, [parseInt(days)]);
    
    res.json({
      progress,
      groupBy,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching progress analysis:', error);
    res.status(500).json({ error: 'Failed to fetch progress analysis' });
  }
});

// 获取单词掌握程度分析
router.get('/word-mastery', async (req, res) => {
  try {
    const { days = 30, limit = 50 } = req.query;
    
    const [wordMastery] = await req.db.execute(`
      SELECT 
        w.word,
        w.id as word_id,
        COUNT(DISTINCT ts.id) as practice_sessions,
        COUNT(we.id) as total_errors,
        MAX(we.created_at) as last_error,
        MIN(we.created_at) as first_error,
        ROUND(COUNT(we.id) * 100.0 / COUNT(DISTINCT ts.id), 2) as error_rate,
        CASE 
          WHEN COUNT(we.id) = 0 THEN 'mastered'
          WHEN COUNT(we.id) <= 2 THEN 'good'
          WHEN COUNT(we.id) <= 5 THEN 'needs_practice'
          ELSE 'difficult'
        END as mastery_level
      FROM words w
      LEFT JOIN training_sessions ts ON JSON_CONTAINS(ts.word_ids, CAST(w.id AS JSON))
      LEFT JOIN word_errors we ON w.id = we.word_id AND we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY w.id, w.word
      HAVING practice_sessions > 0
      ORDER BY error_rate ASC, practice_sessions DESC
      LIMIT ?
    `, [parseInt(days), parseInt(days), parseInt(limit)]);
    
    // 掌握程度统计
    const [masteryStats] = await req.db.execute(`
      SELECT 
        mastery_level,
        COUNT(*) as word_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM (
          SELECT 
            w.id,
            CASE 
              WHEN COUNT(we.id) = 0 THEN 'mastered'
              WHEN COUNT(we.id) <= 2 THEN 'good'
              WHEN COUNT(we.id) <= 5 THEN 'needs_practice'
              ELSE 'difficult'
            END as mastery_level
          FROM words w
          LEFT JOIN training_sessions ts ON JSON_CONTAINS(ts.word_ids, CAST(w.id AS JSON))
          LEFT JOIN word_errors we ON w.id = we.word_id AND we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY w.id
          HAVING COUNT(DISTINCT ts.id) > 0
        ) as subquery), 2) as percentage
      FROM (
        SELECT 
          w.id,
          CASE 
            WHEN COUNT(we.id) = 0 THEN 'mastered'
            WHEN COUNT(we.id) <= 2 THEN 'good'
            WHEN COUNT(we.id) <= 5 THEN 'needs_practice'
            ELSE 'difficult'
          END as mastery_level
        FROM words w
        LEFT JOIN training_sessions ts ON JSON_CONTAINS(ts.word_ids, CAST(w.id AS JSON))
        LEFT JOIN word_errors we ON w.id = we.word_id AND we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        WHERE ts.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY w.id
        HAVING COUNT(DISTINCT ts.id) > 0
      ) as mastery_data
      GROUP BY mastery_level
      ORDER BY 
        CASE mastery_level
          WHEN 'mastered' THEN 1
          WHEN 'good' THEN 2
          WHEN 'needs_practice' THEN 3
          WHEN 'difficult' THEN 4
        END
    `, [parseInt(days), parseInt(days), parseInt(days), parseInt(days)]);
    
    res.json({
      wordMastery,
      masteryStats,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching word mastery analysis:', error);
    res.status(500).json({ error: 'Failed to fetch word mastery analysis' });
  }
});

// 获取推荐学习内容
router.get('/recommendations', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // 推荐需要练习的单词（错误次数多但最近练习少的）
    const [recommendations] = await req.db.execute(`
      SELECT 
        w.word,
        w.id as word_id,
        COUNT(we.id) as error_count,
        MAX(we.created_at) as last_error,
        DATEDIFF(NOW(), MAX(we.created_at)) as days_since_last_error,
        ROUND(COUNT(we.id) * 1.0 / GREATEST(DATEDIFF(NOW(), MIN(we.created_at)), 1), 2) as error_frequency
      FROM words w
      JOIN word_errors we ON w.id = we.word_id
      WHERE we.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY w.id, w.word
      HAVING error_count >= 2
      ORDER BY error_frequency DESC, days_since_last_error ASC
      LIMIT ?
    `, [parseInt(limit)]);
    
    // 推荐新单词（从未练习过的）
    const [newWords] = await req.db.execute(`
      SELECT 
        w.word,
        w.id as word_id,
        w.created_at
      FROM words w
      LEFT JOIN word_errors we ON w.id = we.word_id
      WHERE we.word_id IS NULL
      ORDER BY w.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({
      practiceRecommendations: recommendations,
      newWords,
      totalRecommendations: recommendations.length + newWords.length
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

module.exports = router;
