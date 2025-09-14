const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');

// 导入路由
const wordRoutes = require('./routes/words');
const trainingRoutes = require('./routes/training');
const errorRoutes = require('./routes/errors');
const analysisRoutes = require('./routes/analysis');
const { router: authRoutes, authenticateToken } = require('./routes/auth');
const wordbookRoutes = require('./routes/wordbooks');
const scraperRoutes = require('./routes/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// 数据库连接配置
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'memorize_words',
  charset: 'utf8mb4'
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 将数据库连接传递给路由
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/wordbooks', wordbookRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/analysis', analysisRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
