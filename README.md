# 费曼学习助手

用费曼学习法帮你理解任何概念 —— 大白话讲解 + 即时测试 + 诊断反馈。

## 快速开始

### 1. 安装依赖

双击 `scripts/install.bat`，或在项目目录执行：

```bash
pip install -r requirements.txt
```

### 2. 设置 API Key

在项目根目录创建 `.env` 文件（参考 `.env.example`）：

```
MOONSHOT_API_KEY=你的Kimi_API_Key
```

获取 Key：[Moonshot 开放平台](https://platform.moonshot.cn/)

### 3. 启动

双击 `scripts/start.bat`，或在项目目录执行：

```bash
python app.py
```

浏览器会自动打开 `http://127.0.0.1:5001`

## 功能

- 费曼式对话教学
- 文件上传解读（支持 txt / md / docx / pdf / xlsx）
- 消息编辑
- AI 回复重新生成
- 流式输出
- 历史记录

## 项目结构

```
├── app.py              # 后端主程序
├── index.html          # 前端页面
├── requirements.txt    # Python 依赖
├── .env.example        # API Key 模板
├── scripts/            # 启动 & 安装脚本
├── tests/              # 功能测试
└── docs/               # 文档笔记
```

## 依赖

| 库 | 用途 |
|----|------|
| Flask | Web 框架 |
| requests | HTTP 请求 |
| python-docx | Word 文档解析 |
| pypdf | PDF 解析 |
| openpyxl | Excel 解析 |
| chardet | 文本编码检测 |
