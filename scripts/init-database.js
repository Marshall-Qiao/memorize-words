const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  charset: 'utf8mb4'
};

async function initDatabase() {
  let connection;
  
  try {
    // 连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to MySQL server');
    
    // 创建数据库
    await connection.execute('CREATE DATABASE IF NOT EXISTS memorize_words CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('Database "memorize_words" created or already exists');
    
    // 关闭当前连接，重新连接到指定数据库
    await connection.end();
    connection = await mysql.createConnection({
      ...dbConfig,
      database: 'memorize_words'
    });
    
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "users" created');

    // 创建词书表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS wordbooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('system', 'user_upload') NOT NULL DEFAULT 'user_upload',
        source VARCHAR(255),
        total_words INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_type (type),
        INDEX idx_created_by (created_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "wordbooks" created');

    // 创建单词表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS words (
        id INT AUTO_INCREMENT PRIMARY KEY,
        word VARCHAR(255) NOT NULL,
        pronunciation_us VARCHAR(255),
        pronunciation_uk VARCHAR(255),
        audio_url_us VARCHAR(500),
        audio_url_uk VARCHAR(500),
        definition TEXT,
        example_sentence TEXT,
        wordbook_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
        UNIQUE KEY unique_word_wordbook (word, wordbook_id),
        INDEX idx_wordbook (wordbook_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "words" created');
    
    // 创建训练会话表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_name VARCHAR(255) NOT NULL,
        wordbook_id INT NOT NULL,
        word_ids JSON NOT NULL,
        settings JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        status ENUM('active', 'completed', 'paused') DEFAULT 'active',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_wordbook (wordbook_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "training_sessions" created');
    
    // 创建错误记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS word_errors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        word_id INT NOT NULL,
        session_id INT NOT NULL,
        error_type ENUM('spelling', 'pronunciation', 'recognition') NOT NULL,
        user_input TEXT,
        correct_answer VARCHAR(255) NOT NULL,
        error_count INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
        INDEX idx_word_session (word_id, session_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "word_errors" created');
    
    // 创建错误训练轮次表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_training_rounds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        round_number INT NOT NULL,
        word_ids JSON NOT NULL,
        session_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        status ENUM('active', 'completed') DEFAULT 'active',
        FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
        INDEX idx_session_round (session_id, round_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "error_training_rounds" created');
    
    // 创建训练统计表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS training_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        total_words INT NOT NULL,
        correct_words INT NOT NULL,
        error_words INT NOT NULL,
        accuracy_rate DECIMAL(5,2) NOT NULL,
        total_time_seconds INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
        INDEX idx_session_stats (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "training_stats" created');
    
    // 插入默认用户
    const bcrypt = require('bcrypt');
    const defaultPassword = await bcrypt.hash('123456', 10);
    
    try {
      await connection.execute(
        'INSERT IGNORE INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['demo', 'demo@example.com', defaultPassword]
      );
      console.log('Default user created');
    } catch (error) {
      console.log('Default user already exists or error:', error.message);
    }

    // 插入系统词书
    const systemWordbooks = [
      {
        name: 'CET-4 四级词汇',
        description: '大学英语四级考试核心词汇',
        type: 'system',
        source: 'CET-4 Official'
      },
      {
        name: 'IELTS 雅思词汇',
        description: '雅思考试核心词汇',
        type: 'system',
        source: 'IELTS Official'
      },
      {
        name: 'TOEFL 托福词汇',
        description: '托福考试核心词汇',
        type: 'system',
        source: 'TOEFL Official'
      }
    ];

    for (const wordbook of systemWordbooks) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO wordbooks (name, description, type, source) VALUES (?, ?, ?, ?)',
          [wordbook.name, wordbook.description, wordbook.type, wordbook.source]
        );
      } catch (error) {
        console.log(`Wordbook "${wordbook.name}" already exists or error: ${error.message}`);
      }
    }
    console.log('System wordbooks created');

    // 插入示例单词数据到四级词书
    const sampleWords = [
      { word: 'abandon', definition: 'to give up completely', example: 'He abandoned his car in the snow.' },
      { word: 'ability', definition: 'the skill or capacity to do something', example: 'She has the ability to speak three languages.' },
      { word: 'absolute', definition: 'complete and total', example: 'There was absolute silence in the room.' },
      { word: 'academic', definition: 'relating to education and study', example: 'He is an academic researcher.' },
      { word: 'accept', definition: 'to agree to receive something', example: 'I accept your invitation.' },
      { word: 'access', definition: 'the ability to enter or use something', example: 'Students have access to the library.' },
      { word: 'accident', definition: 'an unfortunate event that happens unexpectedly', example: 'He was injured in a car accident.' },
      { word: 'accompany', definition: 'to go somewhere with someone', example: 'She accompanied me to the meeting.' },
      { word: 'accomplish', definition: 'to achieve or complete successfully', example: 'We accomplished our goal.' },
      { word: 'according', definition: 'as stated by or in', example: 'According to the report, sales increased.' }
    ];
    
    // 获取四级词书ID
    const [wordbookRows] = await connection.execute(
      'SELECT id FROM wordbooks WHERE name = ? AND type = ?',
      ['CET-4 四级词汇', 'system']
    );
    
    if (wordbookRows.length > 0) {
      const wordbookId = wordbookRows[0].id;
      
      for (const wordData of sampleWords) {
        try {
          await connection.execute(
            'INSERT IGNORE INTO words (word, definition, example_sentence, wordbook_id) VALUES (?, ?, ?, ?)',
            [wordData.word, wordData.definition, wordData.example, wordbookId]
          );
        } catch (error) {
          console.log(`Word "${wordData.word}" already exists or error: ${error.message}`);
        }
      }
      console.log('Sample words inserted into CET-4 wordbook');
    }
    
    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行初始化
initDatabase();
