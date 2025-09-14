const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('./auth');
const router = express.Router();

// 配置multer用于文件上传
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// 获取所有词书（系统词书 + 用户词书）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [wordbooks] = await req.db.execute(`
      SELECT 
        wb.id, 
        wb.name, 
        wb.description, 
        wb.type, 
        wb.source, 
        wb.total_words,
        wb.created_at,
        u.username as created_by_username
      FROM wordbooks wb
      LEFT JOIN users u ON wb.created_by = u.id
      WHERE wb.type = 'system' OR wb.created_by = ?
      ORDER BY wb.type DESC, wb.created_at DESC
    `, [req.user.userId]);

    res.json(wordbooks);
  } catch (error) {
    console.error('Get wordbooks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取词书详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const wordbookId = req.params.id;
    
    const [wordbooks] = await req.db.execute(`
      SELECT 
        wb.id, 
        wb.name, 
        wb.description, 
        wb.type, 
        wb.source, 
        wb.total_words,
        wb.created_at,
        u.username as created_by_username
      FROM wordbooks wb
      LEFT JOIN users u ON wb.created_by = u.id
      WHERE wb.id = ? AND (wb.type = 'system' OR wb.created_by = ?)
    `, [wordbookId, req.user.userId]);

    if (wordbooks.length === 0) {
      return res.status(404).json({ error: 'Wordbook not found' });
    }

    res.json(wordbooks[0]);
  } catch (error) {
    console.error('Get wordbook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取词书中的单词
router.get('/:id/words', authenticateToken, async (req, res) => {
  try {
    const wordbookId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // 首先检查用户是否有权限访问这个词书
    const [wordbooks] = await req.db.execute(`
      SELECT id FROM wordbooks 
      WHERE id = ? AND (type = 'system' OR created_by = ?)
    `, [wordbookId, req.user.userId]);

    if (wordbooks.length === 0) {
      return res.status(404).json({ error: 'Wordbook not found' });
    }

    // 获取单词列表
    const [words] = await req.db.execute(`
      SELECT id, word, pronunciation_us, pronunciation_uk, 
             audio_url_us, audio_url_uk, definition, example_sentence
      FROM words 
      WHERE wordbook_id = ?
      ORDER BY word
      LIMIT ? OFFSET ?
    `, [wordbookId, limit, offset]);

    // 获取总数
    const [countResult] = await req.db.execute(
      'SELECT COUNT(*) as total FROM words WHERE wordbook_id = ?',
      [wordbookId]
    );

    res.json({
      words,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建用户词书
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Wordbook name is required' });
    }

    const [result] = await req.db.execute(
      'INSERT INTO wordbooks (name, description, type, created_by) VALUES (?, ?, ?, ?)',
      [name, description || '', 'user_upload', req.user.userId]
    );

    res.json({
      message: 'Wordbook created successfully',
      wordbook: {
        id: result.insertId,
        name,
        description: description || '',
        type: 'user_upload',
        total_words: 0
      }
    });
  } catch (error) {
    console.error('Create wordbook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 上传词书CSV文件
router.post('/:id/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const wordbookId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 检查用户是否有权限修改这个词书
    const [wordbooks] = await req.db.execute(
      'SELECT id FROM wordbooks WHERE id = ? AND created_by = ?',
      [wordbookId, req.user.userId]
    );

    if (wordbooks.length === 0) {
      return res.status(404).json({ error: 'Wordbook not found or no permission' });
    }

    const words = [];
    const filePath = req.file.path;

    // 解析CSV文件
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // 支持多种CSV格式
          const word = row.word || row.Word || row['单词'];
          const definition = row.definition || row.Definition || row['释义'] || row['意思'];
          const example = row.example || row.Example || row['例句'] || row['例子'];
          const pronunciation = row.pronunciation || row.Pronunciation || row['发音'];

          if (word) {
            words.push({
              word: word.trim(),
              definition: definition ? definition.trim() : '',
              example_sentence: example ? example.trim() : '',
              pronunciation_us: pronunciation ? pronunciation.trim() : ''
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (words.length === 0) {
      return res.status(400).json({ error: 'No valid words found in CSV file' });
    }

    // 批量插入单词
    let insertedCount = 0;
    for (const wordData of words) {
      try {
        await req.db.execute(
          'INSERT INTO words (word, definition, example_sentence, pronunciation_us, wordbook_id) VALUES (?, ?, ?, ?, ?)',
          [wordData.word, wordData.definition, wordData.example_sentence, wordData.pronunciation_us, wordbookId]
        );
        insertedCount++;
      } catch (error) {
        // 忽略重复单词错误
        if (!error.message.includes('Duplicate entry')) {
          console.error('Insert word error:', error);
        }
      }
    }

    // 更新词书单词总数
    const [countResult] = await req.db.execute(
      'SELECT COUNT(*) as total FROM words WHERE wordbook_id = ?',
      [wordbookId]
    );

    await req.db.execute(
      'UPDATE wordbooks SET total_words = ? WHERE id = ?',
      [countResult[0].total, wordbookId]
    );

    // 删除临时文件
    fs.unlinkSync(filePath);

    res.json({
      message: 'Words uploaded successfully',
      inserted: insertedCount,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Upload words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除用户词书
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const wordbookId = req.params.id;

    // 检查用户是否有权限删除这个词书
    const [wordbooks] = await req.db.execute(
      'SELECT id FROM wordbooks WHERE id = ? AND created_by = ?',
      [wordbookId, req.user.userId]
    );

    if (wordbooks.length === 0) {
      return res.status(404).json({ error: 'Wordbook not found or no permission' });
    }

    // 删除词书（会级联删除相关单词）
    await req.db.execute('DELETE FROM wordbooks WHERE id = ?', [wordbookId]);

    res.json({ message: 'Wordbook deleted successfully' });
  } catch (error) {
    console.error('Delete wordbook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
