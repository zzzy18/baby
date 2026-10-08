# 👶 宝宝育儿记录助手 (Baby Care Tracker)

一款专为新手父母设计的宝宝日常养育记录与数据分析应用。界面温馨，操作极简，支持单手快速打卡，全周期基于北京时间自然日统计。

---

## ✨ 核心功能

- 🍼 **喂奶记录**
  - 支持母乳（左侧/右侧/双侧、时长）与奶瓶（毫升量）
  - 自动记录喂奶时间，实时计算“距上次喂奶时长”
  - 自动分析单日喂奶规律与平均喂养间隔
- 💧 **换尿布记录**
  - 支持湿尿布、便便、混合三种类型快速打卡
  - 记录便便颜色与性状备注
  - 统计单日换尿布次数，对比新生儿健康参考频次
- 😴 **睡眠记录**
  - 提供实时计时器：宝宝入睡一键开睡，醒来一键结束
  - 支持手动补录小睡与夜间睡眠
  - 统计当日累计睡眠时长，对比建议达标线（14-17小时）
- 🥛 **母乳存储管理**
  - 支持室温、冷藏、冷冻三种模式
  - 依据医学时限规则**自动计算有效期**
  - 24小时内到期预警与过期告警，避免母乳变质浪费
  - 配套泵奶（挤奶）记录与时长统计

---

## 🛠️ 技术架构

- **前端**：React 18 + Vite，纯 CSS 移动端优先自适应布局
- **后端**：Python FastAPI + SQLAlchemy + Pydantic
- **数据库**：SQLite（轻量开箱即用，可无缝升级为 PostgreSQL / MySQL）
- **时间与时区**：严格采用北京时间（UTC+8），单日数据按 00:00 - 24:00 自然日统计

---

## 🚀 本地快速启动

### 1. 后端启动
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- 后端服务：http://localhost:8000
- 交互式 Swagger API 文档：http://localhost:8000/docs

### 2. 前端启动
```bash
cd frontend
npm install
npm run dev
```
- 前端页面：http://localhost:5173

---

## 📦 生产部署

项目支持将前端构建后的 `dist` 静态资源直接置于后端根目录下，由 FastAPI 一体化提供服务，极大简化云服务器部署：

```bash
# 1. 构建前端
cd frontend && npm run build

# 2. 将 frontend/dist 拷贝至 backend/dist
# 3. 启动 FastAPI
cd ../backend && uvicorn main:app --host 0.0.0.0 --port 8000
```
