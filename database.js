const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'textlinedb-textlinedatabase.i.aivencloud.com',
  port: process.env.PG_PORT || 16904,
  user: process.env.PG_USER || 'avnadmin',
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE || 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
});

const SALT_ROUNDS = 10;

// 初始化表
(async () => {
  const client = await pool.connect();
  try {
    // 用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(12) NOT NULL UNIQUE,
        sex VARCHAR(10) NOT NULL DEFAULT '默认',
        date VARCHAR(30) NOT NULL,
        description VARCHAR(200) NOT NULL DEFAULT ' ',
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) NOT NULL DEFAULT 'https://img.textline.top/file/1747010554838_avatar.webp',
        banner VARCHAR(500) NOT NULL DEFAULT 'https://img.textline.top/file/1740911096111_rg2.jpg',
        phone VARCHAR(20) NOT NULL DEFAULT '',
        email VARCHAR(50) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 文章表
    await client.query(`
      CREATE TABLE IF NOT EXISTS article (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        label VARCHAR(50) NOT NULL,
        date VARCHAR(30) NOT NULL,
        username VARCHAR(20) NOT NULL,
        cover VARCHAR(500) NOT NULL DEFAULT '',
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        collect_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 评论表
    await client.query(`
      CREATE TABLE IF NOT EXISTS comment (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES article(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 管理员表
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER REFERENCES users(id)
      )
    `);

    // 点赞表
    await client.query(`
      CREATE TABLE IF NOT EXISTS article_like (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES article(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, user_id)
      )
    `);

    // 收藏表
    await client.query(`
      CREATE TABLE IF NOT EXISTS article_collect (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES article(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, user_id)
      )
    `);

    // 分类表
    await client.query(`
      CREATE TABLE IF NOT EXISTS category (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(20) DEFAULT '#1890ff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('所有表初始化完成');
  } catch (err) {
    console.log(`表初始化出错，原因为：${err.message}`);
  } finally {
    client.release();
  }
})();

// ==================== 文章相关 ====================

module.exports.addArticle = async function addArticle(data) {
  const { title, content, category, time, author } = data;
  const sql = `
    INSERT INTO article (title, content, label, date, username)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const values = [title, content, category, time, author];

  try {
    const result = await pool.query(sql, values);
    return { success: true, message: '文章发布成功', articleId: result.rows[0].id };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getArticle = async function getArticle(data) {
  const { current = 1, pageSize = 10 } = data || {};
  const offset = current === 1 ? 0 : (current - 1) * pageSize;

  try {
    const sql = 'SELECT * FROM article ORDER BY id DESC LIMIT $1 OFFSET $2';
    const result = await pool.query(sql, [pageSize, offset]);
    const countResult = await pool.query('SELECT COUNT(*) as total FROM article');

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      current: current,
      pageSize: pageSize
    };
  } catch (err) {
    throw err;
  }
};

module.exports.getContent = async function getContent(data) {
  const { id } = data;

  try {
    await pool.query('UPDATE article SET view_count = view_count + 1 WHERE id = $1', [id]);
    const sql = 'SELECT * FROM article WHERE id = $1';
    const result = await pool.query(sql, [id]);

    return {
      status: 200,
      success: true,
      data: result.rows
    };
  } catch (err) {
    return { status: 500, success: false, message: err.message };
  }
};

module.exports.getArticleById = async function getArticleById(data) {
  const { id } = data;

  try {
    const sql = 'SELECT * FROM article WHERE id = $1';
    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      return { success: false, message: '文章不存在' };
    }

    return { success: true, data: result.rows[0] };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.updateArticle = async function updateArticle(data) {
  const { id, title, content, label } = data;

  try {
    const sql = `
      UPDATE article
      SET title = $1, content = $2, label = $3
      WHERE id = $4
      RETURNING id
    `;
    const result = await pool.query(sql, [title, content, label, id]);

    if (result.rows.length === 0) {
      return { success: false, message: '文章不存在' };
    }

    return { success: true, message: '文章更新成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.deleteArticle = async function deleteArticle(data) {
  const { id, username } = data;

  try {
    const checkSql = 'SELECT username FROM article WHERE id = $1';
    const checkResult = await pool.query(checkSql, [id]);

    if (checkResult.rows.length === 0) {
      return { success: false, message: '文章不存在' };
    }

    if (checkResult.rows[0].username !== username) {
      return { success: false, message: '无权限删除' };
    }

    await pool.query('DELETE FROM article WHERE id = $1', [id]);
    return { success: true, message: '文章删除成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.searchArticle = async function searchArticle(data) {
  const { keyword, current = 1, pageSize = 10 } = data;
  const offset = (current - 1) * pageSize;

  try {
    const sql = `
      SELECT * FROM article
      WHERE title ILIKE $1 OR content ILIKE $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(sql, [`%${keyword}%`, pageSize, offset]);
    const countSql = `
      SELECT COUNT(*) as total FROM article
      WHERE title ILIKE $1 OR content ILIKE $1
    `;
    const countResult = await pool.query(countSql, [`%${keyword}%`]);

    return {
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getClassify = async function getClassify() {
  try {
    // 获取文章分类（按标签统计）
    const articleSql = `
      SELECT DISTINCT label as name, COUNT(*) as count
      FROM article
      WHERE label IS NOT NULL AND label != ''
      GROUP BY label
      ORDER BY count DESC
    `;
    const articleResult = await pool.query(articleSql);

    // 获取自定义分类
    const customSql = `
      SELECT name, 0 as count
      FROM category
      ORDER BY id
    `;
    const customResult = await pool.query(customSql);

    // 合并结果
    const customCategories = customResult.rows.map(c => ({
      name: c.name,
      count: 0,
      isCustom: true
    }));

    const articleCategories = articleResult.rows;

    return {
      status: 200,
      success: true,
      data: [...customCategories, ...articleCategories]
    };
  } catch (err) {
    return { status: 500, success: false, message: err.message };
  }
};

module.exports.addCategory = async function addCategory(data) {
  const { name, color } = data;
  try {
    const sql = `
      INSERT INTO category (name, color)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET color = $2
      RETURNING id
    `;
    const result = await pool.query(sql, [name, color || '#1890ff']);
    return { success: true, message: '分类创建成功', data: result.rows[0] };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.deleteCategory = async function deleteCategory(data) {
  const { id } = data;
  try {
    await pool.query('DELETE FROM category WHERE id = $1', [id]);
    return { success: true, message: '分类删除成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getTagArticle = async function getTagArticle(data) {
  const { tag, current = 1, pageSize = 10 } = data;
  const offset = (current - 1) * pageSize;

  try {
    const sql = `
      SELECT * FROM article WHERE label = $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(sql, [tag, pageSize, offset]);

    return {
      status: 200,
      success: true,
      data: result.rows
    };
  } catch (err) {
    return { status: 500, success: false, message: err.message };
  }
};

// ==================== 用户相关（密码加密） ====================

module.exports.addUser = async function addUser(data) {
  const { name, date, password, sex, description, avatar, banner, phone, email } = data;

  try {
    const checkUserSql = 'SELECT * FROM users WHERE name = $1';
    const existingUsers = await pool.query(checkUserSql, [name]);

    if (existingUsers.rows.length > 0) {
      return { status: 409, success: false, message: '用户已存在' };
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const insertUserSql = `
      INSERT INTO users (name, date, password, sex, description, avatar, banner, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const values = [name, date, hashedPassword, sex || '默认', description || ' ', avatar || '', banner || '', phone || '', email || ''];
    const result = await pool.query(insertUserSql, values);

    return {
      success: true,
      message: '用户注册成功',
      userId: result.rows[0].id
    };
  } catch (err) {
    return { success: false, message: '用户注册失败：' + err.message };
  }
};

module.exports.userSelect = async function userSelect(data) {
  const { username, password } = data;

  try {
    const sql = 'SELECT id, name, sex, date, description, avatar, banner, phone, email, password, created_at FROM users WHERE name = $1';
    const result = await pool.query(sql, [username]);

    if (result.rows.length === 0) {
      return { status: 401, success: false, message: '用户不存在' };
    }

    const user = result.rows[0];

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { status: 401, success: false, message: '密码错误' };
    }

    // 返回用户信息（不含密码）
    const { password: _, ...userInfo } = user;
    return {
      status: 200,
      success: true,
      message: '登录成功',
      data: userInfo
    };
  } catch (err) {
    return { status: 500, success: false, message: '服务器错误' };
  }
};

module.exports.verifyPassword = async function verifyPassword(data) {
  const { userId, oldPassword } = data;

  try {
    const sql = 'SELECT password FROM users WHERE id = $1';
    const result = await pool.query(sql, [userId]);

    if (result.rows.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password);
    return { success: true, valid: isValid };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.changePassword = async function changePassword(data) {
  const { userId, newPassword } = data;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const sql = 'UPDATE users SET password = $1 WHERE id = $2 RETURNING id';
    const result = await pool.query(sql, [hashedPassword, userId]);

    if (result.rows.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    return { success: true, message: '密码修改成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getUserInfo = async function getUserInfo(data) {
  const { userId } = data;

  try {
    const sql = 'SELECT id, name, sex, date, description, avatar, banner, phone, email, created_at FROM users WHERE id = $1';
    const result = await pool.query(sql, [userId]);

    if (result.rows.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    return { success: true, data: result.rows[0] };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.updateUser = async function updateUser(data) {
  const { userId, sex, description, phone, email } = data;

  try {
    const sql = `
      UPDATE users
      SET sex = COALESCE($1, sex),
          description = COALESCE($2, description),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email)
      WHERE id = $5
      RETURNING id
    `;
    const result = await pool.query(sql, [sex, description, phone, email, userId]);

    if (result.rows.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    return { success: true, message: '信息更新成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.updateAvatar = async function updateAvatar(data) {
  const { userId, avatar } = data;

  try {
    const sql = 'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id';
    const result = await pool.query(sql, [avatar, userId]);

    if (result.rows.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    return { success: true, message: '头像更新成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.updateBanner = async function updateBanner(data) {
  const { userId, banner } = data;

  try {
    const sql = 'UPDATE users SET banner = $1 WHERE id = $2 RETURNING id';
    const result = await pool.query(sql, [banner, userId]);

    if (result.rows.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    return { success: true, message: '背景更新成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getUserContent = async function getUserContent(data) {
  const { user, current = 1, pageSize = 10 } = data;
  const offset = (current - 1) * pageSize;

  try {
    const sql = `
      SELECT * FROM article WHERE username = $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(sql, [user, pageSize, offset]);
    const countSql = 'SELECT COUNT(*) as total FROM article WHERE username = $1';
    const countResult = await pool.query(countSql, [user]);

    return {
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// ==================== 评论相关 ====================

module.exports.addComment = async function addComment(data) {
  const { articleId, userId, userName, content } = data;

  if (!content || content.trim() === '') {
    return { success: false, message: '评论内容不能为空' };
  }

  try {
    const sql = `
      INSERT INTO comment (article_id, user_id, user_name, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const result = await pool.query(sql, [articleId, userId, userName, content.trim()]);

    return {
      success: true,
      message: '评论成功',
      commentId: result.rows[0].id
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getComments = async function getComments(data) {
  const { articleId, current = 1, pageSize = 20 } = data;
  const offset = (current - 1) * pageSize;

  try {
    const sql = `
      SELECT c.*, u.avatar as user_avatar
      FROM comment c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.article_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(sql, [articleId, pageSize, offset]);

    const countSql = 'SELECT COUNT(*) as total FROM comment WHERE article_id = $1';
    const countResult = await pool.query(countSql, [articleId]);

    return {
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.deleteComment = async function deleteComment(data) {
  const { commentId, userId } = data;

  try {
    // 检查是否是评论作者
    const checkSql = 'SELECT user_id FROM comment WHERE id = $1';
    const checkResult = await pool.query(checkSql, [commentId]);

    if (checkResult.rows.length === 0) {
      return { success: false, message: '评论不存在' };
    }

    if (checkResult.rows[0].user_id !== userId) {
      return { success: false, message: '无权限删除' };
    }

    await pool.query('DELETE FROM comment WHERE id = $1', [commentId]);
    return { success: true, message: '评论已删除' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// ==================== 点赞相关 ====================

module.exports.toggleLike = async function toggleLike(data) {
  const { articleId, userId } = data;

  try {
    const checkSql = 'SELECT id FROM article_like WHERE article_id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkSql, [articleId, userId]);

    if (checkResult.rows.length > 0) {
      await pool.query('DELETE FROM article_like WHERE article_id = $1 AND user_id = $2', [articleId, userId]);
      await pool.query('UPDATE article SET like_count = GREATEST(0, like_count - 1) WHERE id = $1', [articleId]);
      return { success: true, message: '已取消点赞', liked: false };
    } else {
      await pool.query('INSERT INTO article_like (article_id, user_id) VALUES ($1, $2)', [articleId, userId]);
      await pool.query('UPDATE article SET like_count = like_count + 1 WHERE id = $1', [articleId]);
      return { success: true, message: '点赞成功', liked: true };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.checkLike = async function checkLike(data) {
  const { articleId, userId } = data;

  try {
    const sql = 'SELECT id FROM article_like WHERE article_id = $1 AND user_id = $2';
    const result = await pool.query(sql, [articleId, userId]);

    return { success: true, liked: result.rows.length > 0 };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// ==================== 收藏相关 ====================

module.exports.toggleCollect = async function toggleCollect(data) {
  const { articleId, userId } = data;

  try {
    const checkSql = 'SELECT id FROM article_collect WHERE article_id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkSql, [articleId, userId]);

    if (checkResult.rows.length > 0) {
      await pool.query('DELETE FROM article_collect WHERE article_id = $1 AND user_id = $2', [articleId, userId]);
      await pool.query('UPDATE article SET collect_count = GREATEST(0, collect_count - 1) WHERE id = $1', [articleId]);
      return { success: true, message: '已取消收藏', collected: false };
    } else {
      await pool.query('INSERT INTO article_collect (article_id, user_id) VALUES ($1, $2)', [articleId, userId]);
      await pool.query('UPDATE article SET collect_count = collect_count + 1 WHERE id = $1', [articleId]);
      return { success: true, message: '收藏成功', collected: true };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.checkCollect = async function checkCollect(data) {
  const { articleId, userId } = data;

  try {
    const sql = 'SELECT id FROM article_collect WHERE article_id = $1 AND user_id = $2';
    const result = await pool.query(sql, [articleId, userId]);

    return { success: true, collected: result.rows.length > 0 };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

module.exports.getUserCollects = async function getUserCollects(data) {
  const { userId, current = 1, pageSize = 10 } = data;
  const offset = (current - 1) * pageSize;

  try {
    const sql = `
      SELECT a.*, ac.created_at as collected_at
      FROM article a
      INNER JOIN article_collect ac ON a.id = ac.article_id
      WHERE ac.user_id = $1
      ORDER BY ac.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(sql, [userId, pageSize, offset]);

    return { success: true, data: result.rows };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// ==================== 管理员相关 ====================

module.exports.admin = async function admin(data) {
  const { id } = data;

  try {
    const sql = 'SELECT * FROM admin WHERE user_id = $1';
    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      return { status: 401, success: false, message: '不是管理员' };
    }

    return { status: 200, success: true, message: '管理员验证成功' };
  } catch (error) {
    return { status: 401, success: false, message: '管理员验证失败' };
  }
};

module.exports.getStatistics = async function getStatistics() {
  try {
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const articleCount = await pool.query('SELECT COUNT(*) as count FROM article');
    const likeCount = await pool.query('SELECT COUNT(*) as count FROM article_like');
    const collectCount = await pool.query('SELECT COUNT(*) as count FROM article_collect');
    const commentCount = await pool.query('SELECT COUNT(*) as count FROM comment');

    return {
      success: true,
      data: {
        users: parseInt(userCount.rows[0].count),
        articles: parseInt(articleCount.rows[0].count),
        likes: parseInt(likeCount.rows[0].count),
        collects: parseInt(collectCount.rows[0].count),
        comments: parseInt(commentCount.rows[0].count)
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// ==================== 验证数据库连接 ====================

pool.query('SELECT NOW()')
  .then(() => {
    console.log('成功连接到 PostgreSQL 数据库');
  })
  .catch(err => {
    console.error('数据库连接失败:', err.message);
  });

module.exports.pool = pool;