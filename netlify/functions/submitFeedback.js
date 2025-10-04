// netlify/functions/submitFeedback.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  // 只处理 POST 请求
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 设置CORS头，确保前端可以正常调用
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // 解析表单数据
    const { name, email, rating, message } = JSON.parse(event.body);

    // 从环境变量获取数据库连接
    const connectionString = process.env.DATABASE_URL;
    const client = new Client({ 
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // 连接到数据库
    await client.connect();
    
    // 创建存储反馈的表（如果不存在）- 更新表结构
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        rating INTEGER,
        message TEXT NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 插入新的反馈数据 - 更新插入语句
    await client.query(
      'INSERT INTO user_feedback (name, email, rating, message) VALUES ($1, $2, $3, $4);',
      [name, email, rating, message]
    );
    
    // 断开数据库连接
    await client.end();

    // 返回成功响应
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Feedback submitted successfully!' }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to submit feedback.' }),
    };
  }
};