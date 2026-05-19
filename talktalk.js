const express = require('express')
const dataB = require('./database')
const path = require('path')
const fs = require('fs')
const port = 1000
const cors = require('cors')
const multer = require('multer')

const app = express()

// CORS 配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 请求体解析
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 响应头
app.use((req, res, next) => {
  res.header('Content-Type', 'application/json; charset=utf-8')
  next()
})

// 文件上传配置
const uploadDir = path.join(__dirname, 'public', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'))
    }
  }
})

// 静态文件服务
app.use('/public', express.static(path.join(__dirname, 'public')))

// ==================== 文章相关 ====================

app.post('/db', async (req, res) => {
  const result = await dataB.addArticle(req.body)
  res.json(result)
})

app.post('/getArticle', async (req, res) => {
  const result = await dataB.getArticle(req.body)
  res.json(result)
})

app.post('/getContent', async (req, res) => {
  const result = await dataB.getContent(req.body)
  res.json(result)
})

app.post('/getArticleById', async (req, res) => {
  const result = await dataB.getArticleById(req.body)
  res.json(result)
})

app.post('/updateArticle', async (req, res) => {
  const result = await dataB.updateArticle(req.body)
  res.json(result)
})

app.post('/deleteArticle', async (req, res) => {
  const result = await dataB.deleteArticle(req.body)
  res.json(result)
})

app.post('/searchArticle', async (req, res) => {
  const result = await dataB.searchArticle(req.body)
  res.json(result)
})

app.get('/getClassify', async (req, res) => {
  const result = await dataB.getClassify()
  res.json(result)
})

app.post('/getTagArticle', async (req, res) => {
  const result = await dataB.getTagArticle(req.body)
  res.json(result)
})

// ==================== 用户相关 ====================

app.post('/register', async (req, res) => {
  const result = await dataB.addUser(req.body)
  res.json(result)
})

app.post('/login', async (req, res) => {
  const result = await dataB.userSelect(req.body)
  res.json(result)
})

app.post('/getUserInfo', async (req, res) => {
  const result = await dataB.getUserInfo(req.body)
  res.json(result)
})

app.post('/updateUser', async (req, res) => {
  const result = await dataB.updateUser(req.body)
  res.json(result)
})

app.post('/updateAvatar', async (req, res) => {
  const result = await dataB.updateAvatar(req.body)
  res.json(result)
})

app.post('/updateBanner', async (req, res) => {
  const result = await dataB.updateBanner(req.body)
  res.json(result)
})

app.post('/getUserContent', async (req, res) => {
  const result = await dataB.getUserContent(req.body)
  res.json(result)
})

// ==================== 密码相关 ====================

app.post('/verifyPassword', async (req, res) => {
  const result = await dataB.verifyPassword(req.body)
  res.json(result)
})

app.post('/changePassword', async (req, res) => {
  const result = await dataB.changePassword(req.body)
  res.json(result)
})

// ==================== 评论相关 ====================

app.post('/addComment', async (req, res) => {
  const result = await dataB.addComment(req.body)
  res.json(result)
})

app.post('/getComments', async (req, res) => {
  const result = await dataB.getComments(req.body)
  res.json(result)
})

app.post('/deleteComment', async (req, res) => {
  const result = await dataB.deleteComment(req.body)
  res.json(result)
})

// ==================== 点赞相关 ====================

app.post('/toggleLike', async (req, res) => {
  const result = await dataB.toggleLike(req.body)
  res.json(result)
})

app.post('/checkLike', async (req, res) => {
  const result = await dataB.checkLike(req.body)
  res.json(result)
})

// ==================== 收藏相关 ====================

app.post('/toggleCollect', async (req, res) => {
  const result = await dataB.toggleCollect(req.body)
  res.json(result)
})

app.post('/checkCollect', async (req, res) => {
  const result = await dataB.checkCollect(req.body)
  res.json(result)
})

app.post('/getUserCollects', async (req, res) => {
  const result = await dataB.getUserCollects(req.body)
  res.json(result)
})

// ==================== 文件上传 ====================

app.post('/upload/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, message: '请选择图片文件' })
  }

  const avatarUrl = `/public/uploads/${req.file.filename}`
  res.json({
    success: true,
    message: '上传成功',
    url: avatarUrl
  })
})

app.post('/upload/banner', upload.single('banner'), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, message: '请选择图片文件' })
  }

  const bannerUrl = `/public/uploads/${req.file.filename}`
  res.json({
    success: true,
    message: '上传成功',
    url: bannerUrl
  })
})

app.post('/upload/image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, message: '请选择图片文件' })
  }

  const imageUrl = `/public/uploads/${req.file.filename}`
  res.json({
    success: true,
    message: '上传成功',
    url: imageUrl
  })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.json({ success: false, message: '文件大小不能超过 5MB' })
    }
    return res.json({ success: false, message: err.message })
  }
  if (err) {
    return res.json({ success: false, message: err.message })
  }
  next()
})

// ==================== 管理员相关 ====================

app.post('/admin', async (req, res) => {
  const result = await dataB.admin(req.body)
  res.json(result)
})

app.get('/getStatistics', async (req, res) => {
  const result = await dataB.getStatistics()
  res.json(result)
})

// 根路径
app.get('/', (req, res) => {
  res.send('欢迎访问 Talk Talk 后端服务')
})

app.listen(port, () => {
  console.log('开始运行:')
  console.log(`http://localhost:${port}`)
})