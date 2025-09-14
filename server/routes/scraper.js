const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { authenticateToken } = require('./auth');
const router = express.Router();

// 爬取四级词汇
router.post('/cet4', authenticateToken, async (req, res) => {
  try {
    // 这里使用模拟数据，实际项目中可以爬取真实网站
    const cet4Words = [
      { word: 'abandon', definition: 'to give up completely', example: 'He abandoned his car in the snow.' },
      { word: 'ability', definition: 'the skill or capacity to do something', example: 'She has the ability to speak three languages.' },
      { word: 'absolute', definition: 'complete and total', example: 'There was absolute silence in the room.' },
      { word: 'academic', definition: 'relating to education and study', example: 'He is an academic researcher.' },
      { word: 'accept', definition: 'to agree to receive something', example: 'I accept your invitation.' },
      { word: 'access', definition: 'the ability to enter or use something', example: 'Students have access to the library.' },
      { word: 'accident', definition: 'an unfortunate event that happens unexpectedly', example: 'He was injured in a car accident.' },
      { word: 'accompany', definition: 'to go somewhere with someone', example: 'She accompanied me to the meeting.' },
      { word: 'accomplish', definition: 'to achieve or complete successfully', example: 'We accomplished our goal.' },
      { word: 'according', definition: 'as stated by or in', example: 'According to the report, sales increased.' },
      { word: 'account', definition: 'a record of money spent and received', example: 'Please check your bank account.' },
      { word: 'accurate', definition: 'correct in all details', example: 'The weather forecast was accurate.' },
      { word: 'achieve', definition: 'to successfully complete something', example: 'She achieved her dream of becoming a doctor.' },
      { word: 'acquire', definition: 'to get or gain something', example: 'He acquired a new skill.' },
      { word: 'action', definition: 'the process of doing something', example: 'We need to take action immediately.' },
      { word: 'active', definition: 'engaging in activity', example: 'She is very active in sports.' },
      { word: 'activity', definition: 'something that you do', example: 'Reading is a good activity.' },
      { word: 'actual', definition: 'real or existing', example: 'The actual cost was higher than expected.' },
      { word: 'address', definition: 'the location where someone lives', example: 'What is your home address?' },
      { word: 'administration', definition: 'the management of a business or organization', example: 'The administration is working on the problem.' }
    ];

    // 获取或创建四级词书
    let [wordbooks] = await req.db.execute(
      'SELECT id FROM wordbooks WHERE name = ? AND type = ?',
      ['CET-4 四级词汇', 'system']
    );

    let wordbookId;
    if (wordbooks.length === 0) {
      const [result] = await req.db.execute(
        'INSERT INTO wordbooks (name, description, type, source) VALUES (?, ?, ?, ?)',
        ['CET-4 四级词汇', '大学英语四级考试核心词汇', 'system', 'CET-4 Official']
      );
      wordbookId = result.insertId;
    } else {
      wordbookId = wordbooks[0].id;
    }

    // 插入单词
    let insertedCount = 0;
    for (const wordData of cet4Words) {
      try {
        await req.db.execute(
          'INSERT IGNORE INTO words (word, definition, example_sentence, wordbook_id) VALUES (?, ?, ?, ?)',
          [wordData.word, wordData.definition, wordData.example, wordbookId]
        );
        insertedCount++;
      } catch (error) {
        console.error('Insert word error:', error);
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

    res.json({
      message: 'CET-4 words scraped successfully',
      wordbook_id: wordbookId,
      inserted: insertedCount,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Scrape CET-4 error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 爬取雅思词汇
router.post('/ielts', authenticateToken, async (req, res) => {
  try {
    const ieltsWords = [
      { word: 'abundant', definition: 'existing in large quantities', example: 'The region has abundant natural resources.' },
      { word: 'academic', definition: 'relating to education and study', example: 'He is pursuing academic excellence.' },
      { word: 'access', definition: 'the ability to enter or use something', example: 'The building has wheelchair access.' },
      { word: 'accommodate', definition: 'to provide space for someone', example: 'The hotel can accommodate 200 guests.' },
      { word: 'accompany', definition: 'to go somewhere with someone', example: 'She accompanied me to the meeting.' },
      { word: 'accomplish', definition: 'to achieve or complete successfully', example: 'We accomplished our mission.' },
      { word: 'accumulate', definition: 'to gradually increase in amount', example: 'Dust accumulates on the furniture.' },
      { word: 'accurate', definition: 'correct in all details', example: 'The measurement was accurate.' },
      { word: 'achieve', definition: 'to successfully complete something', example: 'She achieved her goals.' },
      { word: 'acknowledge', definition: 'to accept or admit something', example: 'He acknowledged his mistake.' },
      { word: 'acquire', definition: 'to get or gain something', example: 'She acquired new skills.' },
      { word: 'adapt', definition: 'to change to suit new conditions', example: 'Animals adapt to their environment.' },
      { word: 'adequate', definition: 'satisfactory or acceptable', example: 'The salary is adequate for my needs.' },
      { word: 'adjacent', definition: 'next to or near something', example: 'The hotel is adjacent to the beach.' },
      { word: 'adjust', definition: 'to change something slightly', example: 'Please adjust the temperature.' },
      { word: 'administer', definition: 'to manage or organize something', example: 'The nurse administered the medicine.' },
      { word: 'adopt', definition: 'to take up or start to use', example: 'The company adopted new policies.' },
      { word: 'advance', definition: 'to move forward', example: 'The army advanced towards the city.' },
      { word: 'advantage', definition: 'a beneficial factor', example: 'Experience is an advantage.' },
      { word: 'adverse', definition: 'preventing success or development', example: 'The weather had an adverse effect.' }
    ];

    // 获取或创建雅思词书
    let [wordbooks] = await req.db.execute(
      'SELECT id FROM wordbooks WHERE name = ? AND type = ?',
      ['IELTS 雅思词汇', 'system']
    );

    let wordbookId;
    if (wordbooks.length === 0) {
      const [result] = await req.db.execute(
        'INSERT INTO wordbooks (name, description, type, source) VALUES (?, ?, ?, ?)',
        ['IELTS 雅思词汇', '雅思考试核心词汇', 'system', 'IELTS Official']
      );
      wordbookId = result.insertId;
    } else {
      wordbookId = wordbooks[0].id;
    }

    // 插入单词
    let insertedCount = 0;
    for (const wordData of ieltsWords) {
      try {
        await req.db.execute(
          'INSERT IGNORE INTO words (word, definition, example_sentence, wordbook_id) VALUES (?, ?, ?, ?)',
          [wordData.word, wordData.definition, wordData.example, wordbookId]
        );
        insertedCount++;
      } catch (error) {
        console.error('Insert word error:', error);
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

    res.json({
      message: 'IELTS words scraped successfully',
      wordbook_id: wordbookId,
      inserted: insertedCount,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Scrape IELTS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 爬取托福词汇
router.post('/toefl', authenticateToken, async (req, res) => {
  try {
    const toeflWords = [
      { word: 'abandon', definition: 'to give up completely', example: 'He abandoned his studies.' },
      { word: 'abundant', definition: 'existing in large quantities', example: 'The area has abundant wildlife.' },
      { word: 'academic', definition: 'relating to education and study', example: 'She has academic qualifications.' },
      { word: 'access', definition: 'the ability to enter or use something', example: 'Students have access to the library.' },
      { word: 'accommodate', definition: 'to provide space for someone', example: 'The room can accommodate 50 people.' },
      { word: 'accompany', definition: 'to go somewhere with someone', example: 'She accompanied me to the store.' },
      { word: 'accomplish', definition: 'to achieve or complete successfully', example: 'We accomplished our task.' },
      { word: 'accumulate', definition: 'to gradually increase in amount', example: 'Snow accumulated on the ground.' },
      { word: 'accurate', definition: 'correct in all details', example: 'The clock is accurate.' },
      { word: 'achieve', definition: 'to successfully complete something', example: 'He achieved his dream.' },
      { word: 'acknowledge', definition: 'to accept or admit something', example: 'She acknowledged her error.' },
      { word: 'acquire', definition: 'to get or gain something', example: 'He acquired new knowledge.' },
      { word: 'adapt', definition: 'to change to suit new conditions', example: 'Plants adapt to climate change.' },
      { word: 'adequate', definition: 'satisfactory or acceptable', example: 'The food was adequate.' },
      { word: 'adjacent', definition: 'next to or near something', example: 'The park is adjacent to the school.' },
      { word: 'adjust', definition: 'to change something slightly', example: 'Please adjust the volume.' },
      { word: 'administer', definition: 'to manage or organize something', example: 'The doctor administered treatment.' },
      { word: 'adopt', definition: 'to take up or start to use', example: 'The school adopted new methods.' },
      { word: 'advance', definition: 'to move forward', example: 'Technology continues to advance.' },
      { word: 'advantage', definition: 'a beneficial factor', example: 'Experience is a great advantage.' }
    ];

    // 获取或创建托福词书
    let [wordbooks] = await req.db.execute(
      'SELECT id FROM wordbooks WHERE name = ? AND type = ?',
      ['TOEFL 托福词汇', 'system']
    );

    let wordbookId;
    if (wordbooks.length === 0) {
      const [result] = await req.db.execute(
        'INSERT INTO wordbooks (name, description, type, source) VALUES (?, ?, ?, ?)',
        ['TOEFL 托福词汇', '托福考试核心词汇', 'system', 'TOEFL Official']
      );
      wordbookId = result.insertId;
    } else {
      wordbookId = wordbooks[0].id;
    }

    // 插入单词
    let insertedCount = 0;
    for (const wordData of toeflWords) {
      try {
        await req.db.execute(
          'INSERT IGNORE INTO words (word, definition, example_sentence, wordbook_id) VALUES (?, ?, ?, ?)',
          [wordData.word, wordData.definition, wordData.example, wordbookId]
        );
        insertedCount++;
      } catch (error) {
        console.error('Insert word error:', error);
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

    res.json({
      message: 'TOEFL words scraped successfully',
      wordbook_id: wordbookId,
      inserted: insertedCount,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Scrape TOEFL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
