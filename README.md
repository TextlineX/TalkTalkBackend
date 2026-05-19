# TalkTalk 后端项目

## 项目简介

TalkTalk 的后端接口服务，基于 Express + PostgreSQL。

## 技术栈

- Express.js
- PostgreSQL (Aiven 云数据库)
- bcryptjs 密码加密
- multer 文件上传
- CORS 跨域支持

## 环境变量

| 环境变量 | 说明 |
|:---|:---|
| PG_HOST | 数据库地址 |
| PG_PORT | 数据库端口 |
| PG_USER | 数据库用户名 |
| PG_PASSWORD | 数据库密码 |
| PG_DATABASE | 数据库名称 |
| PORT | 服务端口 (默认 1000) |

## API 接口

- `/register` - 用户注册
- `/login` - 用户登录
- `/getArticle` - 获取文章列表
- `/db` - 发布文章
- `/toggleLike` - 点赞/取消点赞
- `/toggleCollect` - 收藏/取消收藏
- `/addComment` - 添加评论
- `/upload/*` - 文件上传

## 部署

使用 Vercel 部署，请确保在 Vercel 后台配置好环境变量。

---

GitHub: https://github.com/TextlineX/TalkTalkBackend
