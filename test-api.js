const axios = require('axios');

const API_BASE = 'http://127.0.0.1:3000/api';

async function testAPI() {
  console.log('🧪 开始测试API...\n');

  try {
    // 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ 健康检查:', healthResponse.data);
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
    return;
  }

  try {
    // 测试用户登录
    console.log('\n2. 测试用户登录...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'demo',
      password: '123456'
    });
    console.log('✅ 登录成功:', loginResponse.data.message);
    const token = loginResponse.data.token;

    // 测试获取词书列表
    console.log('\n3. 测试获取词书列表...');
    const wordbooksResponse = await axios.get(`${API_BASE}/wordbooks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 词书列表:', wordbooksResponse.data.length, '个词书');
    wordbooksResponse.data.forEach(wb => {
      console.log(`   - ${wb.name} (${wb.type}) - ${wb.total_words} 个单词`);
    });

    // 测试爬取四级词汇
    console.log('\n4. 测试爬取四级词汇...');
    const scrapeResponse = await axios.post(`${API_BASE}/scraper/cet4`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 爬取成功:', scrapeResponse.data.message);
    console.log(`   插入了 ${scrapeResponse.data.inserted} 个单词`);

    // 测试获取词书中的单词
    console.log('\n5. 测试获取词书中的单词...');
    const wordsResponse = await axios.get(`${API_BASE}/wordbooks/${scrapeResponse.data.wordbook_id}/words`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 单词列表:', wordsResponse.data.words.length, '个单词');
    console.log('   前5个单词:', wordsResponse.data.words.slice(0, 5).map(w => w.word).join(', '));

    console.log('\n🎉 所有API测试通过！');

  } catch (error) {
    console.log('❌ API测试失败:', error.response?.data || error.message);
  }
}

testAPI();