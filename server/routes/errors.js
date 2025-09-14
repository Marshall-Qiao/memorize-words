const express = require('express');
const router = express.Router();

// 获取所有错误记录
router.get('/', async (req, res) => {
  try {
    const { sessionId, wordId, errorType, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        we.*,
        w.word,
        ts.session_name,
        ts.created_at as session_created_at
      FROM word_errors we
      JOIN words w ON we.word_id = w.id
      JOIN training_sessions ts ON we.session_id = ts.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (sessionId) {
      query += ' AND we.session_id = ?';
      params.push(sessionId);
    }
    
    if (wordId) {
      query += ' AND we.word_id = ?';
      params.push(wordId);
    }
    
    if (errorType) {
      query += ' AND we.error_type = ?';
      params.push(errorType);
    }
    
    query += ' ORDER BY we.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [rows] = await req.db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching errors:', error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

// 获取错误统计
router.get('/stats', async (req, res) => {
  try {
    const { sessionId, days = 30 } = req.query;
    
    let query = `
      SELECT 
        we.error_type,
        COUNT(*) as error_count,
        COUNT(DISTINCT we.word_id) as unique_words,
        COUNT(DISTINCT we.session_id) as sessions_affected
      FROM word_errors we
      WHERE we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    const params = [parseInt(days)];
    
    if (sessionId) {
      query += ' AND we.session_id = ?';
      params.push(sessionId);
    }
    
    query += ' GROUP BY we.error_type ORDER BY error_count DESC';
    
    const [rows] = await req.db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching error stats:', error);
    res.status(500).json({ error: 'Failed to fetch error stats' });
  }
});

// 获取最常出错的单词
router.get('/top-errors', async (req, res) => {
  try {
    const { limit = 20, days = 30 } = req.query;
    
    const [rows] = await req.db.execute(`
      SELECT 
        w.word,
        w.id as word_id,
        COUNT(we.id) as error_count,
        MAX(we.created_at) as last_error,
        GROUP_CONCAT(DISTINCT we.error_type) as error_types
      FROM word_errors we
      JOIN words w ON we.word_id = w.id
      WHERE we.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY w.id, w.word
      ORDER BY error_count DESC, last_error DESC
      LIMIT ?
    `, [parseInt(days), parseInt(limit)]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching top errors:', error);
    res.status(500).json({ error: 'Failed to fetch top errors' });
  }
});

// 创建错误训练轮次
router.post('/training-rounds', async (req, res) => {
  try {
    const { sessionId, wordIds, roundNumber } = req.body;
    
    if (!sessionId || !wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ error: 'Session ID and word IDs are required' });
    }

    const [result] = await req.db.execute(
      'INSERT INTO error_training_rounds (session_id, word_ids, round_number) VALUES (?, ?, ?)',
      [sessionId, JSON.stringify(wordIds), roundNumber || 1]
    );

    res.json({
      id: result.insertId,
      sessionId,
      wordIds,
      roundNumber: roundNumber || 1,
      message: 'Error training round created successfully'
    });
  } catch (error) {
    console.error('Error creating error training round:', error);
    res.status(500).json({ error: 'Failed to create error training round' });
  }
});

// 获取错误训练轮次
router.get('/training-rounds', async (req, res) => {
  try {
    const { sessionId, status = 'active' } = req.query;
    
    let query = `
      SELECT 
        etr.*,
        ts.session_name
      FROM error_training_rounds etr
      JOIN training_sessions ts ON etr.session_id = ts.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (sessionId) {
      query += ' AND etr.session_id = ?';
      params.push(sessionId);
    }
    
    if (status) {
      query += ' AND etr.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY etr.created_at DESC';
    
    const [rows] = await req.db.execute(query, params);
    
    // 解析JSON字段
    const rounds = rows.map(row => ({
      ...row,
      word_ids: JSON.parse(row.word_ids)
    }));
    
    res.json(rounds);
  } catch (error) {
    console.error('Error fetching error training rounds:', error);
    res.status(500).json({ error: 'Failed to fetch error training rounds' });
  }
});

// 更新错误训练轮次状态
router.put('/training-rounds/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedAt } = req.body;
    
    const validStatuses = ['active', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let query = 'UPDATE error_training_rounds SET status = ?';
    let params = [status];
    
    if (status === 'completed' && completedAt) {
      query += ', completed_at = ?';
      params.push(completedAt);
    }
    
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await req.db.execute(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Error training round not found' });
    }

    res.json({ message: 'Error training round status updated successfully' });
  } catch (error) {
    console.error('Error updating error training round status:', error);
    res.status(500).json({ error: 'Failed to update error training round status' });
  }
});

// 生成随机错误训练轮次
router.post('/generate-random-round', async (req, res) => {
  try {
    const { sessionId, roundNumber, wordCount = 10 } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // 获取该会话中最常出错的单词
    const [errorWords] = await req.db.execute(`
      SELECT 
        we.word_id,
        w.word,
        COUNT(we.id) as error_count
      FROM word_errors we
      JOIN words w ON we.word_id = w.id
      WHERE we.session_id = ?
      GROUP BY we.word_id, w.word
      ORDER BY error_count DESC, RAND()
      LIMIT ?
    `, [sessionId, parseInt(wordCount)]);
    
    if (errorWords.length === 0) {
      return res.status(404).json({ error: 'No error words found for this session' });
    }

    const wordIds = errorWords.map(w => w.word_id);
    
    // 创建训练轮次
    const [result] = await req.db.execute(
      'INSERT INTO error_training_rounds (session_id, word_ids, round_number) VALUES (?, ?, ?)',
      [sessionId, JSON.stringify(wordIds), roundNumber || 1]
    );

    res.json({
      id: result.insertId,
      sessionId,
      wordIds,
      words: errorWords,
      roundNumber: roundNumber || 1,
      message: 'Random error training round created successfully'
    });
  } catch (error) {
    console.error('Error generating random error round:', error);
    res.status(500).json({ error: 'Failed to generate random error round' });
  }
});

// 删除错误记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await req.db.execute('DELETE FROM word_errors WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Error record not found' });
    }

    res.json({ message: 'Error record deleted successfully' });
  } catch (error) {
    console.error('Error deleting error record:', error);
    res.status(500).json({ error: 'Failed to delete error record' });
  }
});

module.exports = router;
