# 费曼学习助手

用费曼学习法帮你理解任何概念 —— 大白话讲解 + 即时测试 + 诊断反馈。

基于 Flask + MySQL + JWT 的 AI 学习平台，支持流式对话、文件解析、多用户管理。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **Web 框架** | Flask 3.x | 应用工厂模式 + Blueprint 蓝图 |
| **数据库** | MySQL 8.0 + SQLAlchemy ORM | 三表设计，pymysql 驱动 |
| **认证** | JWT（access + refresh token） | Flask-JWT-Extended，30min/7day |
| **API** | RESTful + SSE 流式 | 7 个端点，token 自动刷新 |
| **测试** | pytest | 32 个用例，SQLite 内存库 |
| **部署** | Docker + docker-compose | 多阶段构建，Gunicorn WSGI |
| **AI** | Moonshot API（kimi-k2.6） | 流式 SSE，禁用思考模式 |
| **限流** | Flask-Limiter | 按 IP，20次/分钟（聊天） |
| **文件** | python-docx / pypdf / openpyxl | 支持 txt、md、docx、pdf、xlsx |

---

## 快速开始

### Docker（推荐，一键启动）

```bash
# 1. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 MOONSHOT_API_KEY

# 2. 启动
docker-compose up

# 3. 浏览器打开
# http://localhost:5001
```

### 本地开发

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置 .env
cp .env.example .env
# 编辑 .env，填入 MOONSHOT_API_KEY 和数据库连接

# 3. 启动 MySQL（可用 docker 单独启）
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=feynman -e MYSQL_USER=feynman \
  -e MYSQL_PASSWORD=feynman123 mysql:8.0

# 4. 运行
python run.py
```

---

## 项目架构

```
├── run.py                         # 应用入口
├── config.py                      # 三套配置（Dev/Test/Prod）
├── Dockerfile                     # 多阶段构建
├── docker-compose.yml             # MySQL + App
│
├── app/                           # Flask 应用包
│   ├── __init__.py                # create_app() 工厂函数
│   ├── extensions.py              # db / jwt / migrate / limiter 初始化
│   ├── models/                    # ORM 数据模型
│   │   ├── user.py                # User（密码哈希）
│   │   ├── conversation.py        # Conversation（对话）
│   │   └── message.py             # Message（消息）
│   ├── api/                       # 路由层（Blueprint）
│   │   ├── auth.py                # 认证（注册/登录/刷新）
│   │   ├── chat.py                # 聊天 SSE 流 + DB 持久化
│   │   ├── conversations.py       # 对话 CRUD
│   │   └── health.py              # 健康检查
│   ├── services/                  # 业务逻辑层
│   │   ├── ai_client.py           # Moonshot API + SSE 生成器
│   │   ├── file_parser.py         # txt/docx/pdf/xlsx 解析
│   │   └── conversation_service.py # 对话/消息 CRUD
│   └── utils/
│       ├── prompts.py             # AI 系统提示词
│       ├── decorators.py          # @require_auth 装饰器
│       └── errors.py              # 自定义异常 + 错误处理器
│
├── frontend/                      # 前端（模块化）
│   ├── index.html                 # 主页面
│   ├── css/style.css              # 样式
│   └── js/
│       ├── api.js                 # fetch 封装 + token 刷新
│       ├── auth.js                # 登录/注册 UI
│       ├── chat.js                # 消息 + SSE 流
│       ├── history.js             # 对话列表 + API
│       └── ui.js                  # DOM 工具 + Markdown 渲染
│
├── tests/                         # pytest 测试
│   ├── conftest.py                # fixtures
│   ├── test_auth.py               # 认证（10 项）
│   ├── test_chat.py               # 聊天 + 持久化（6 项）
│   ├── test_conversations.py      # 对话 CRUD（9 项）
│   ├── test_file_parser.py        # 文件解析（6 项）
│   └── test_health.py             # 健康检查（1 项）
│
└── docs/
    └── interview_qa.md            # 面试话术
```

---

## API 端点

### 认证（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 `{username, email, password}`→ `{user, access_token, refresh_token}` |
| POST | `/api/auth/login` | 登录 `{email, password}` → `{user, access_token, refresh_token}` |
| POST | `/api/auth/refresh` | 刷新 `{refresh_token}` → `{access_token}` |

### 对话（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations` | 分页列表 `?page=1&per_page=20` |
| POST | `/api/conversations` | 新建 `{title?}` |
| GET | `/api/conversations/<id>` | 详情（含全部消息） |
| PATCH | `/api/conversations/<id>` | 重命名 `{title}` |
| DELETE | `/api/conversations/<id>` | 软删除 |

### 聊天（需 JWT + 限流）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | SSE 流 `{messages, conversation_id?, file?}` |

### 公共

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | `{"status":"ok","db":"connected"}` |

---

## 数据库设计

```
users (用户)
  id PK, username UNIQUE, email UNIQUE, password_hash, created_at, updated_at

conversations (对话)
  id PK, user_id FK→users, title, is_active, created_at, updated_at
  INDEX(user_id, updated_at DESC)

messages (消息)
  id PK, conversation_id FK→conversations, role ENUM(user|assistant),
  content TEXT, created_at
  INDEX(conversation_id, created_at)
```

关系：User 1→N Conversation 1→N Message，全部级联删除。

---

## 架构决策

- **工厂模式**：`create_app(config_name)` 支持多环境，避免循环导入
- **Service 层分离**：路由处理 HTTP 关注点，service 处理业务逻辑 → 可独立测试
- **3 表设计**：刻意极简，文件不存表（解析后内联到消息内容）
- **JWT 双 token**：access 30min + refresh 7day，前端拦截器自动刷新
- **SQLite 测试 / MySQL 生产**：测试快速无 Docker 依赖
- **SSE 非 WebSocket**：AI 流式单向推送，SSE 更简单且代理兼容

---

## 运行测试

```bash
pytest tests/ -v
# 32 passed, 1 warning
```

---

## 环境变量（.env）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MOONSHOT_API_KEY` | Kimi API 密钥 | 必填 |
| `SECRET_KEY` | Flask 密钥 | dev-secret... |
| `JWT_SECRET_KEY` | JWT 签名密钥 | jwt-secret... |
| `DATABASE_URL` | MySQL 连接 | mysql+pymysql://feynman:...@127.0.0.1:3306/feynman |
| `FLASK_ENV` | 环境 | development |
| `CORS_ORIGIN` | 跨域来源 | * |
