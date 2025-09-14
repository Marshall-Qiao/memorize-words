const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('./auth');

// 确保音频目录存在
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// 获取所有单词（需要指定词书ID）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { wordbook_id } = req.query;
    
    if (!wordbook_id) {
      return res.status(400).json({ error: 'wordbook_id is required' });
    }

    // 检查用户是否有权限访问这个词书
    const [wordbooks] = await req.db.execute(`
      SELECT id FROM wordbooks 
      WHERE id = ? AND (type = 'system' OR created_by = ?)
    `, [wordbook_id, req.user.userId]);

    if (wordbooks.length === 0) {
      return res.status(404).json({ error: 'Wordbook not found or no permission' });
    }

    const [rows] = await req.db.execute(
      'SELECT * FROM words WHERE wordbook_id = ? ORDER BY word',
      [wordbook_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

// 添加新单词
router.post('/', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    const [result] = await req.db.execute(
      'INSERT INTO words (word) VALUES (?) ON DUPLICATE KEY UPDATE word = word',
      [word.toLowerCase()]
    );

    res.json({ 
      id: result.insertId || result.affectedRows, 
      word: word.toLowerCase(),
      message: 'Word added successfully' 
    });
  } catch (error) {
    console.error('Error adding word:', error);
    res.status(500).json({ error: 'Failed to add word' });
  }
});

// 批量添加单词
router.post('/batch', async (req, res) => {
  try {
    const { words } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Words array is required' });
    }

    const wordValues = words.map(word => [word.toLowerCase()]);
    await req.db.execute(
      'INSERT IGNORE INTO words (word) VALUES ?',
      [wordValues]
    );

    res.json({ 
      message: `Successfully processed ${words.length} words`,
      added: words.length
    });
  } catch (error) {
    console.error('Error adding words batch:', error);
    res.status(500).json({ error: 'Failed to add words' });
  }
});

// 获取单词音频URL（有道词典）
router.get('/:id/audio', async (req, res) => {
  try {
    const { id } = req.params;
    const { accent = 'us' } = req.query;
    
    const [rows] = await req.db.execute('SELECT word FROM words WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const word = rows[0].word;
    const accentType = accent === 'us' ? 0 : 1;
    const audioUrl = `http://dict.youdao.com/dictvoice?type=${accentType}&audio=${word}`;
    
    res.json({ audioUrl, word, accent });
  } catch (error) {
    console.error('Error getting audio URL:', error);
    res.status(500).json({ error: 'Failed to get audio URL' });
  }
});

// 下载并保存音频文件
router.post('/:id/download-audio', async (req, res) => {
  try {
    const { id } = req.params;
    const { accent = 'us' } = req.body;
    
    const [rows] = await req.db.execute('SELECT word FROM words WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const word = rows[0].word;
    const accentType = accent === 'us' ? 0 : 1;
    const audioUrl = `http://dict.youdao.com/dictvoice?type=${accentType}&audio=${word}`;
    
    // 创建音频文件路径
    const audioFileName = `${word}_${accent}.mp3`;
    const audioFilePath = path.join(audioDir, audioFileName);
    
    // 下载音频文件
    const response = await axios.get(audioUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(audioFilePath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 更新数据库中的音频URL
    const localAudioUrl = `/audio/${audioFileName}`;
    const audioField = accent === 'us' ? 'audio_url_us' : 'audio_url_uk';
    await req.db.execute(
      `UPDATE words SET ${audioField} = ? WHERE id = ?`,
      [localAudioUrl, id]
    );

    res.json({ 
      message: 'Audio downloaded successfully',
      audioUrl: localAudioUrl,
      filePath: audioFilePath
    });
  } catch (error) {
    console.error('Error downloading audio:', error);
    res.status(500).json({ error: 'Failed to download audio' });
  }
});

// 删除单词
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await req.db.execute('DELETE FROM words WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }

    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).json({ error: 'Failed to delete word' });
  }
});

// 搜索单词
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 50 } = req.query;
    
    const [rows] = await req.db.execute(
      'SELECT * FROM words WHERE word LIKE ? ORDER BY word LIMIT ?',
      [`%${query}%`, parseInt(limit)]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error searching words:', error);
    res.status(500).json({ error: 'Failed to search words' });
  }
});

module.exports = router;
