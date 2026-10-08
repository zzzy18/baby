"""
FastAPI 主应用入口
API 路由：喂奶、换尿布、睡眠、母乳存储、泵奶
支持访问口令鉴权（同一个设备仅需输入一次）
"""
import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import models
import schemas
import crud
from database import engine, get_db

# 启动时自动建表
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="宝宝育儿助手 API",
    description="新生儿喂奶、换尿布、睡眠、母乳存储管理",
    version="1.0.0",
)

# 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== 访问口令与鉴权逻辑 =====================

def get_access_code() -> str:
    """获取当前生效的访问口令，优先读取环境变量，其次读取 access_code.txt，默认 baby888"""
    env_code = os.getenv("ACCESS_CODE")
    if env_code:
        return env_code
    code_file = os.path.join(os.path.dirname(__file__), "access_code.txt")
    if os.path.exists(code_file):
        try:
            with open(code_file, "r", encoding="utf-8") as f:
                c = f.read().strip()
                if c:
                    return c
        except Exception:
            pass
    return "baby888"


def verify_token(authorization: Optional[str] = Header(None)):
    """校验请求头中的 Token，防止未经授权的外部访问"""
    current_code = get_access_code()
    if not authorization:
        raise HTTPException(status_code=401, detail="请先输入访问口令")
    token = authorization.replace("Bearer ", "").strip()
    if token != current_code:
        raise HTTPException(status_code=401, detail="访问口令错误，请重新输入")
    return token


# 公共路由（无需口令）
@app.get("/api/health")
def health():
    return {"message": "宝宝育儿助手 API 运行中 👶", "version": "1.0.0"}


@app.post("/api/login")
def login(data: schemas.LoginRequest):
    """设备登录校验"""
    current_code = get_access_code()
    if data.access_code.strip() != current_code:
        raise HTTPException(status_code=401, detail="访问口令错误，请重新输入")
    return {"ok": True, "token": current_code}


@app.get("/api/verify")
def verify_auth(token: str = Depends(verify_token)):
    """校验已有设备凭据是否仍然有效"""
    return {"ok": True}


# 受保护的业务路由（必须携带有效 Token）
api = APIRouter(dependencies=[Depends(verify_token)])


# ===================== 喂奶记录 =====================

@api.post("/feeding", response_model=schemas.FeedingLogResponse, tags=["喂奶"])
def add_feeding(data: schemas.FeedingLogCreate, db: Session = Depends(get_db)):
    """新增喂奶记录"""
    return crud.create_feeding_log(db, data)


@api.get("/feeding", response_model=List[schemas.FeedingLogResponse], tags=["喂奶"])
def list_feeding(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """获取喂奶记录列表（最近50条）"""
    return crud.get_feeding_logs(db, limit=limit, offset=offset)


@api.delete("/feeding/{log_id}", tags=["喂奶"])
def remove_feeding(log_id: int, db: Session = Depends(get_db)):
    """删除喂奶记录"""
    if not crud.delete_feeding_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@api.get("/feeding/stats", response_model=schemas.FeedingStats, tags=["喂奶"])
def feeding_stats(db: Session = Depends(get_db)):
    """今日喂奶统计"""
    return crud.get_feeding_stats(db)


# ===================== 换尿布记录 =====================

@api.post("/diaper", response_model=schemas.DiaperLogResponse, tags=["换尿布"])
def add_diaper(data: schemas.DiaperLogCreate, db: Session = Depends(get_db)):
    """新增换尿布记录"""
    return crud.create_diaper_log(db, data)


@api.get("/diaper", response_model=List[schemas.DiaperLogResponse], tags=["换尿布"])
def list_diaper(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """获取换尿布记录列表"""
    return crud.get_diaper_logs(db, limit=limit, offset=offset)


@api.delete("/diaper/{log_id}", tags=["换尿布"])
def remove_diaper(log_id: int, db: Session = Depends(get_db)):
    """删除换尿布记录"""
    if not crud.delete_diaper_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@api.get("/diaper/stats", response_model=schemas.DiaperStats, tags=["换尿布"])
def diaper_stats(db: Session = Depends(get_db)):
    """今日换尿布统计"""
    return crud.get_diaper_stats(db)


# ===================== 睡眠记录 =====================

@api.post("/sleep", response_model=schemas.SleepLogResponse, tags=["睡眠"])
def add_sleep(data: schemas.SleepLogCreate, db: Session = Depends(get_db)):
    """新增睡眠记录（可只记录开始时间，表示还在睡中）"""
    return crud.create_sleep_log(db, data)


@api.patch("/sleep/{log_id}/end", response_model=schemas.SleepLogResponse, tags=["睡眠"])
def end_sleep(log_id: int, db: Session = Depends(get_db)):
    """宝宝醒了：标记睡眠结束（以当前北京时间为准）"""
    log = crud.end_sleep_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="记录不存在")
    return log


@api.get("/sleep", response_model=List[schemas.SleepLogResponse], tags=["睡眠"])
def list_sleep(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """获取睡眠记录列表"""
    return crud.get_sleep_logs(db, limit=limit, offset=offset)


@api.delete("/sleep/{log_id}", tags=["睡眠"])
def remove_sleep(log_id: int, db: Session = Depends(get_db)):
    """删除睡眠记录"""
    if not crud.delete_sleep_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@api.get("/sleep/stats", response_model=schemas.SleepStats, tags=["睡眠"])
def sleep_stats(db: Session = Depends(get_db)):
    """睡眠统计（今日总时长、是否达标）"""
    return crud.get_sleep_stats(db)


# ===================== 母乳存储 =====================

@api.post("/milk/storage", response_model=schemas.MilkStorageResponse, tags=["母乳存储"])
def add_milk_storage(data: schemas.MilkStorageCreate, db: Session = Depends(get_db)):
    """新增母乳存储记录（自动计算有效期）"""
    return crud.create_milk_storage(db, data)


@api.get("/milk/storage", response_model=List[schemas.MilkStorageResponse], tags=["母乳存储"])
def list_milk_storage(include_used: bool = False, db: Session = Depends(get_db)):
    """获取母乳库存（默认只返回未使用的，按到期时间升序）"""
    return crud.get_milk_storages(db, include_used=include_used)


@api.patch("/milk/storage/{storage_id}/use", response_model=schemas.MilkStorageResponse, tags=["母乳存储"])
def use_milk_storage(storage_id: int, db: Session = Depends(get_db)):
    """标记母乳已使用"""
    item = crud.mark_milk_used(db, storage_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return item


@api.delete("/milk/storage/{storage_id}", tags=["母乳存储"])
def remove_milk_storage(storage_id: int, db: Session = Depends(get_db)):
    """删除母乳存储记录"""
    if not crud.delete_milk_storage(db, storage_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@api.get("/milk/stats", response_model=schemas.MilkStats, tags=["母乳存储"])
def milk_stats(db: Session = Depends(get_db)):
    """母乳库存统计（冷藏/冷冻/室温总量，即将过期数量）"""
    return crud.get_milk_stats(db)


# ===================== 泵奶记录 =====================

@api.post("/milk/pump", response_model=schemas.PumpLogResponse, tags=["泵奶"])
def add_pump(data: schemas.PumpLogCreate, db: Session = Depends(get_db)):
    """新增泵奶记录"""
    return crud.create_pump_log(db, data)


@api.get("/milk/pump", response_model=List[schemas.PumpLogResponse], tags=["泵奶"])
def list_pump(limit: int = 50, db: Session = Depends(get_db)):
    """获取泵奶记录"""
    return crud.get_pump_logs(db, limit=limit)


@api.delete("/milk/pump/{log_id}", tags=["泵奶"])
def remove_pump(log_id: int, db: Session = Depends(get_db)):
    """删除泵奶记录"""
    if not crud.delete_pump_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


# ===================== 宝宝档案（跨设备共享） =====================

@api.get("/baby/profile", response_model=schemas.BabyProfileResponse, tags=["宝宝档案"])
def get_baby_profile(db: Session = Depends(get_db)):
    """获取宝宝档案（跨设备共享）"""
    return crud.get_baby_profile(db)


@api.put("/baby/profile", response_model=schemas.BabyProfileResponse, tags=["宝宝档案"])
def update_baby_profile(data: schemas.BabyProfileBase, db: Session = Depends(get_db)):
    """更新宝宝档案（跨设备共享）"""
    return crud.update_baby_profile(db, data)


# 挂载受保护的 API
app.include_router(api)


# 挂载前端静态页面（若已打包 dist）
frontend_dist = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"message": "宝宝育儿助手 API 运行中 👶", "version": "1.0.0"}
