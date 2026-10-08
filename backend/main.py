"""
FastAPI 主应用入口
API 路由：喂奶、换尿布、睡眠、母乳存储、泵奶
"""
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import crud
from database import engine, get_db

import os
from fastapi.staticfiles import StaticFiles

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


# ===================== 根路由 =====================

@app.get("/api/health")
def health():
    return {"message": "宝宝育儿助手 API 运行中 👶", "version": "1.0.0"}


# ===================== 喂奶记录 =====================

@app.post("/feeding", response_model=schemas.FeedingLogResponse, tags=["喂奶"])
def add_feeding(data: schemas.FeedingLogCreate, db: Session = Depends(get_db)):
    """新增喂奶记录"""
    return crud.create_feeding_log(db, data)


@app.get("/feeding", response_model=List[schemas.FeedingLogResponse], tags=["喂奶"])
def list_feeding(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """获取喂奶记录列表（最近50条）"""
    return crud.get_feeding_logs(db, limit=limit, offset=offset)


@app.delete("/feeding/{log_id}", tags=["喂奶"])
def remove_feeding(log_id: int, db: Session = Depends(get_db)):
    """删除喂奶记录"""
    if not crud.delete_feeding_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@app.get("/feeding/stats", response_model=schemas.FeedingStats, tags=["喂奶"])
def feeding_stats(db: Session = Depends(get_db)):
    """今日喂奶统计"""
    return crud.get_feeding_stats(db)


# ===================== 换尿布记录 =====================

@app.post("/diaper", response_model=schemas.DiaperLogResponse, tags=["换尿布"])
def add_diaper(data: schemas.DiaperLogCreate, db: Session = Depends(get_db)):
    """新增换尿布记录"""
    return crud.create_diaper_log(db, data)


@app.get("/diaper", response_model=List[schemas.DiaperLogResponse], tags=["换尿布"])
def list_diaper(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """获取换尿布记录列表"""
    return crud.get_diaper_logs(db, limit=limit, offset=offset)


@app.delete("/diaper/{log_id}", tags=["换尿布"])
def remove_diaper(log_id: int, db: Session = Depends(get_db)):
    """删除换尿布记录"""
    if not crud.delete_diaper_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@app.get("/diaper/stats", response_model=schemas.DiaperStats, tags=["换尿布"])
def diaper_stats(db: Session = Depends(get_db)):
    """今日换尿布统计"""
    return crud.get_diaper_stats(db)


# ===================== 睡眠记录 =====================

@app.post("/sleep", response_model=schemas.SleepLogResponse, tags=["睡眠"])
def add_sleep(data: schemas.SleepLogCreate, db: Session = Depends(get_db)):
    """新增睡眠记录（可只记录开始时间，表示还在睡中）"""
    return crud.create_sleep_log(db, data)


@app.patch("/sleep/{log_id}/end", response_model=schemas.SleepLogResponse, tags=["睡眠"])
def end_sleep(log_id: int, db: Session = Depends(get_db)):
    """宝宝醒了：标记睡眠结束（以当前北京时间为准）"""
    log = crud.end_sleep_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="记录不存在")
    return log


@app.get("/sleep", response_model=List[schemas.SleepLogResponse], tags=["睡眠"])
def list_sleep(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """获取睡眠记录列表"""
    return crud.get_sleep_logs(db, limit=limit, offset=offset)


@app.delete("/sleep/{log_id}", tags=["睡眠"])
def remove_sleep(log_id: int, db: Session = Depends(get_db)):
    """删除睡眠记录"""
    if not crud.delete_sleep_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@app.get("/sleep/stats", response_model=schemas.SleepStats, tags=["睡眠"])
def sleep_stats(db: Session = Depends(get_db)):
    """睡眠统计（今日总时长、是否达标）"""
    return crud.get_sleep_stats(db)


# ===================== 母乳存储 =====================

@app.post("/milk/storage", response_model=schemas.MilkStorageResponse, tags=["母乳存储"])
def add_milk_storage(data: schemas.MilkStorageCreate, db: Session = Depends(get_db)):
    """新增母乳存储记录（自动计算有效期）"""
    return crud.create_milk_storage(db, data)


@app.get("/milk/storage", response_model=List[schemas.MilkStorageResponse], tags=["母乳存储"])
def list_milk_storage(include_used: bool = False, db: Session = Depends(get_db)):
    """获取母乳库存（默认只返回未使用的，按到期时间升序）"""
    return crud.get_milk_storages(db, include_used=include_used)


@app.patch("/milk/storage/{storage_id}/use", response_model=schemas.MilkStorageResponse, tags=["母乳存储"])
def use_milk_storage(storage_id: int, db: Session = Depends(get_db)):
    """标记母乳已使用"""
    item = crud.mark_milk_used(db, storage_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return item


@app.delete("/milk/storage/{storage_id}", tags=["母乳存储"])
def remove_milk_storage(storage_id: int, db: Session = Depends(get_db)):
    """删除母乳存储记录"""
    if not crud.delete_milk_storage(db, storage_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@app.get("/milk/stats", response_model=schemas.MilkStats, tags=["母乳存储"])
def milk_stats(db: Session = Depends(get_db)):
    """母乳库存统计（冷藏/冷冻/室温总量，即将过期数量）"""
    return crud.get_milk_stats(db)


# ===================== 泵奶记录 =====================

@app.post("/milk/pump", response_model=schemas.PumpLogResponse, tags=["泵奶"])
def add_pump(data: schemas.PumpLogCreate, db: Session = Depends(get_db)):
    """新增泵奶记录"""
    return crud.create_pump_log(db, data)


@app.get("/milk/pump", response_model=List[schemas.PumpLogResponse], tags=["泵奶"])
def list_pump(limit: int = 50, db: Session = Depends(get_db)):
    """获取泵奶记录"""
    return crud.get_pump_logs(db, limit=limit)


@app.delete("/milk/pump/{log_id}", tags=["泵奶"])
def remove_pump(log_id: int, db: Session = Depends(get_db)):
    """删除泵奶记录"""
    if not crud.delete_pump_log(db, log_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


# 挂载前端静态页面（若已打包 dist）
frontend_dist = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"message": "宝宝育儿助手 API 运行中 👶", "version": "1.0.0"}
