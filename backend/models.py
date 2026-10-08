"""
SQLAlchemy 数据库模型定义
所有时间字段默认统一使用北京时间 (UTC+8)
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from database import Base

BEIJING_TZ = timezone(timedelta(hours=8))

def get_beijing_now():
    """获取当前北京时间（naive datetime）"""
    return datetime.now(timezone.utc).astimezone(BEIJING_TZ).replace(tzinfo=None)


class FeedingLog(Base):
    """喂奶记录"""
    __tablename__ = "feeding_logs"

    id = Column(Integer, primary_key=True, index=True)
    feed_type = Column(String(20), nullable=False)        # breast | bottle
    side = Column(String(10), nullable=True)              # 左侧 | 右侧 | 双侧
    duration_mins = Column(Integer, nullable=True)        # 母乳：时长（分钟）
    amount_ml = Column(Float, nullable=True)              # 奶瓶：奶量（ml）
    feed_time = Column(DateTime, default=get_beijing_now) # 喂奶时间（北京时间）
    note = Column(Text, default="")
    created_at = Column(DateTime, default=get_beijing_now)


class DiaperLog(Base):
    """换尿布记录"""
    __tablename__ = "diaper_logs"

    id = Column(Integer, primary_key=True, index=True)
    diaper_type = Column(String(20), nullable=False)      # wet | poop | mixed
    diaper_time = Column(DateTime, default=get_beijing_now)
    color = Column(String(50), default="")               # 便便颜色
    note = Column(Text, default="")
    created_at = Column(DateTime, default=get_beijing_now)


class SleepLog(Base):
    """睡眠记录"""
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True, index=True)
    sleep_type = Column(String(20), nullable=False)       # nap | night
    start_time = Column(DateTime, nullable=False, default=get_beijing_now)
    end_time = Column(DateTime, nullable=True)            # None 表示还在睡眠中
    duration_mins = Column(Integer, nullable=True)        # 自动计算
    note = Column(Text, default="")
    created_at = Column(DateTime, default=get_beijing_now)


class MilkStorage(Base):
    """母乳存储"""
    __tablename__ = "milk_storages"

    id = Column(Integer, primary_key=True, index=True)
    amount_ml = Column(Float, nullable=False)             # 容量（ml）
    storage_type = Column(String(20), nullable=False)     # fridge | freezer | room
    collected_at = Column(DateTime, nullable=False, default=get_beijing_now) # 挤奶/存入时间
    expiry_at = Column(DateTime, nullable=False)          # 有效期（自动计算）
    is_used = Column(Boolean, default=False)              # 是否已使用
    note = Column(Text, default="")
    created_at = Column(DateTime, default=get_beijing_now)


class PumpLog(Base):
    """泵奶记录"""
    __tablename__ = "pump_logs"

    id = Column(Integer, primary_key=True, index=True)
    amount_ml = Column(Float, nullable=False)
    side = Column(String(10), nullable=False)             # 左侧 | 右侧 | 双侧
    duration_mins = Column(Integer, nullable=True)
    pump_time = Column(DateTime, default=get_beijing_now)
    note = Column(Text, default="")
    created_at = Column(DateTime, default=get_beijing_now)
