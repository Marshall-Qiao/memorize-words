const express = require('express');
const router = express.Router();

// 创建训练会话
router.post('/sessions', async (req, res) => {
  try {
    const { sessionName, wordIds, settings } = req.body;
    
    if (!sessionName || !wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ error: 'Session name and word IDs are required' });
    }

    const [result] = await req.db.execute(
      'INSERT INTO training_sessions (session_name, word_ids, settings) VALUES (?, ?, ?)',
      [sessionName, JSON.stringify(wordIds), JSON.stringify(settings || {})]
    );

    res.json({
      id: result.insertId,
      sessionName,
      wordIds,
      settings,
      message: 'Training session created successfully'
    });
  } catch (error) {
    console.error('Error creating training session:', error);
    res.status(500).json({ error: 'Failed to create training session' });
  }
});

// 获取所有训练会话
router.get('/sessions', async (req, res) => {
  try {
    const [rows] = await req.db.execute(`
      SELECT 
        ts.*,
        COUNT(we.id) as error_count,
        ts.created_at,
        ts.completed_at
      FROM training_sessions ts
      LEFT JOIN word_errors we ON ts.id = we.session_id
      GROUP BY ts.id
      ORDER BY ts.created_at DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching training sessions:', error);
    res.status(500).json({ error: 'Failed to fetch training sessions' });
  }
});

// 获取特定训练会话
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await req.db.execute(
      'SELECT * FROM training_sessions WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Training session not found' });
    }

    const session = rows[0];
    session.word_ids = JSON.parse(session.word_ids);
    session.settings = JSON.parse(session.settings);

    // 获取会话中的单词详情
    const wordIds = session.word_ids;
    if (wordIds.length > 0) {
      const placeholders = wordIds.map(() => '?').join(',');
      const [wordRows] = await req.db.execute(
        `SELECT * FROM words WHERE id IN (${placeholders})`,
        wordIds
      );
      session.words = wordRows;
    } else {
      session.words = [];
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching training session:', error);
    res.status(500).json({ error: 'Failed to fetch training session' });
  }
});

// 更新训练会话状态
router.put('/sessions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedAt } = req.body;
    
    const validStatuses = ['active', 'completed', 'paused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let query = 'UPDATE training_sessions SET status = ?';
    let params = [status];
    
    if (status === 'completed' && completedAt) {
      query += ', completed_at = ?';
      params.push(completedAt);
    }
    
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await req.db.execute(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Training session not found' });
    }

    res.json({ message: 'Training session status updated successfully' });
  } catch (error) {
    console.error('Error updating training session status:', error);
    res.status(500).json({ error: 'Failed to update training session status' });
  }
});

// 保存训练结果
router.post('/sessions/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const { results } = req.body;
    
    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'Results array is required' });
    }

    // 开始事务
    const connection = await req.db.getConnection();
    await connection.beginTransaction();

    try {
      // 保存每个单词的结果
      for (const result of results) {
        const { wordId, isCorrect, userInput, errorType, timeSpent } = result;
        
        if (!isCorrect) {
          // 记录错误
          await connection.execute(
            `INSERT INTO word_errors (word_id, session_id, error_type, user_input, correct_answer, error_count)
             VALUES (?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE error_count = error_count + 1`,
            [wordId, id, errorType || 'spelling', userInput || '', '', 1]
          );
        }
      }

      // 计算统计信息
      const totalWords = results.length;
      const correctWords = results.filter(r => r.isCorrect).length;
      const errorWords = totalWords - correctWords;
      const accuracyRate = totalWords > 0 ? (correctWords / totalWords) * 100 : 0;
      const totalTimeSeconds = results.reduce((sum, r) => sum + (r.timeSpent || 0), 0);

      // 保存训练统计
      await connection.execute(
        `INSERT INTO training_stats (session_id, total_words, correct_words, error_words, accuracy_rate, total_time_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, totalWords, correctWords, errorWords, accuracyRate, totalTimeSeconds]
      );

      // 更新会话状态为完成
      await connection.execute(
        'UPDATE training_sessions SET status = ?, completed_at = NOW() WHERE id = ?',
        ['completed', id]
      );

      await connection.commit();
      
      res.json({
        message: 'Training results saved successfully',
        stats: {
          totalWords,
          correctWords,
          errorWords,
          accuracyRate: Math.round(accuracyRate * 100) / 100,
          totalTimeSeconds
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error saving training results:', error);
    res.status(500).json({ error: 'Failed to save training results' });
  }
});

// 删除训练会话
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await req.db.execute('DELETE FROM training_sessions WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Training session not found' });
    }

    res.json({ message: 'Training session deleted successfully' });
  } catch (error) {
    console.error('Error deleting training session:', error);
    res.status(500).json({ error: 'Failed to delete training session' });
  }
});

module.exports = router;
