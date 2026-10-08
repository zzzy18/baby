"""
业务逻辑层（CRUD + 统计计算）
所有时间与统计均严格基于北京时间 (UTC+8) 及单日 0点-24点 周期
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models
import schemas

BEIJING_TZ = timezone(timedelta(hours=8))


def get_beijing_now() -> datetime:
    """获取当前北京时间（naive datetime）"""
    return datetime.now(timezone.utc).astimezone(BEIJING_TZ).replace(tzinfo=None)


def get_beijing_today_range():
    """获取北京时间今日 00:00:00 至 24:00:00（次日00:00:00）的时间范围"""
    now_bj = get_beijing_now()
    today_start = datetime(now_bj.year, now_bj.month, now_bj.day, 0, 0, 0)
    today_end = today_start + timedelta(days=1)
    return today_start, today_end


def to_beijing_naive(dt: Optional[datetime]) -> Optional[datetime]:
    """若带有时区信息，转换为北京时间并转为 naive datetime；若本身为 naive 则直接返回"""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(BEIJING_TZ).replace(tzinfo=None)
    return dt


# 母乳存储有效期规则
MILK_EXPIRY_RULES = {
    "room": timedelta(hours=4),
    "fridge": timedelta(days=4),
    "freezer": timedelta(days=180),
}


# ===================== 喂奶记录 =====================

def create_feeding_log(db: Session, data: schemas.FeedingLogCreate) -> models.FeedingLog:
    d = data.model_dump()
    if d.get("feed_time"):
        d["feed_time"] = to_beijing_naive(d["feed_time"])
    else:
        d["feed_time"] = get_beijing_now()
    d["created_at"] = get_beijing_now()

    log = models.FeedingLog(**d)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_feeding_logs(db: Session, limit: int = 50, offset: int = 0) -> List[models.FeedingLog]:
    return (db.query(models.FeedingLog)
            .order_by(desc(models.FeedingLog.feed_time))
            .offset(offset).limit(limit).all())


def delete_feeding_log(db: Session, log_id: int) -> bool:
    log = db.query(models.FeedingLog).filter(models.FeedingLog.id == log_id).first()
    if not log:
        return False
    db.delete(log)
    db.commit()
    return True


def get_feeding_stats(db: Session) -> schemas.FeedingStats:
    now_bj = get_beijing_now()
    today_start, today_end = get_beijing_today_range()

    # 严格按照北京时间今日 0点-24点 过滤今日记录
    today_logs = (db.query(models.FeedingLog)
                  .filter(models.FeedingLog.feed_time >= today_start)
                  .filter(models.FeedingLog.feed_time < today_end)
                  .order_by(desc(models.FeedingLog.feed_time))
                  .all())

    today_count = len(today_logs)
    mins_since_last = None
    avg_interval = None

    # 查询全局最近一次喂奶（即使是跨天的，也能准确计算距离上一次过去了多少分钟）
    latest_log = (db.query(models.FeedingLog)
                  .order_by(desc(models.FeedingLog.feed_time))
                  .first())
    if latest_log and latest_log.feed_time:
        mins_since_last = max(0, int((now_bj - latest_log.feed_time).total_seconds() / 60))

    if len(today_logs) >= 2:
        intervals = []
        for i in range(len(today_logs) - 1):
            diff = (today_logs[i].feed_time - today_logs[i + 1].feed_time).total_seconds() / 3600
            if diff > 0:
                intervals.append(diff)
        if intervals:
            avg_interval = round(sum(intervals) / len(intervals), 1)

    return schemas.FeedingStats(
        today_count=today_count,
        avg_interval_hours=avg_interval,
        mins_since_last=mins_since_last,
    )


# ===================== 换尿布记录 =====================

def create_diaper_log(db: Session, data: schemas.DiaperLogCreate) -> models.DiaperLog:
    d = data.model_dump()
    if d.get("diaper_time"):
        d["diaper_time"] = to_beijing_naive(d["diaper_time"])
    else:
        d["diaper_time"] = get_beijing_now()
    d["created_at"] = get_beijing_now()

    log = models.DiaperLog(**d)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_diaper_logs(db: Session, limit: int = 50, offset: int = 0) -> List[models.DiaperLog]:
    return (db.query(models.DiaperLog)
            .order_by(desc(models.DiaperLog.diaper_time))
            .offset(offset).limit(limit).all())


def delete_diaper_log(db: Session, log_id: int) -> bool:
    log = db.query(models.DiaperLog).filter(models.DiaperLog.id == log_id).first()
    if not log:
        return False
    db.delete(log)
    db.commit()
    return True


def get_diaper_stats(db: Session) -> schemas.DiaperStats:
    today_start, today_end = get_beijing_today_range()

    # 严格按照北京时间今日 0点-24点 过滤今日记录
    logs = (db.query(models.DiaperLog)
            .filter(models.DiaperLog.diaper_time >= today_start)
            .filter(models.DiaperLog.diaper_time < today_end)
            .all())

    wet = sum(1 for l in logs if l.diaper_type in ("wet", "mixed"))
    poop = sum(1 for l in logs if l.diaper_type in ("poop", "mixed"))
    return schemas.DiaperStats(today_total=len(logs), today_wet=wet, today_poop=poop)


# ===================== 睡眠记录 =====================

def create_sleep_log(db: Session, data: schemas.SleepLogCreate) -> models.SleepLog:
    d = data.model_dump()
    d["start_time"] = to_beijing_naive(d["start_time"]) if d.get("start_time") else get_beijing_now()
    if d.get("end_time"):
        d["end_time"] = to_beijing_naive(d["end_time"])
        duration = int((d["end_time"] - d["start_time"]).total_seconds() / 60)
        d["duration_mins"] = max(duration, 0)
    d["created_at"] = get_beijing_now()

    log = models.SleepLog(**d)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def end_sleep_log(db: Session, log_id: int, end_time: Optional[datetime] = None) -> Optional[models.SleepLog]:
    log = db.query(models.SleepLog).filter(models.SleepLog.id == log_id).first()
    if not log:
        return None
    end_bj = to_beijing_naive(end_time) if end_time else get_beijing_now()
    log.end_time = end_bj
    log.duration_mins = max(0, int((end_bj - log.start_time).total_seconds() / 60))
    db.commit()
    db.refresh(log)
    return log


def get_sleep_logs(db: Session, limit: int = 50, offset: int = 0) -> List[models.SleepLog]:
    return (db.query(models.SleepLog)
            .order_by(desc(models.SleepLog.start_time))
            .offset(offset).limit(limit).all())


def delete_sleep_log(db: Session, log_id: int) -> bool:
    log = db.query(models.SleepLog).filter(models.SleepLog.id == log_id).first()
    if not log:
        return False
    db.delete(log)
    db.commit()
    return True


def get_sleep_stats(db: Session) -> schemas.SleepStats:
    now_bj = get_beijing_now()
    today_start, today_end = get_beijing_today_range()

    # 严格按照北京时间今日 0点-24点 过滤今日记录
    logs = (db.query(models.SleepLog)
            .filter(models.SleepLog.start_time >= today_start)
            .filter(models.SleepLog.start_time < today_end)
            .all())

    total_mins = 0
    for l in logs:
        if l.end_time:
            total_mins += (l.duration_mins or 0)
        else:
            # 正在睡眠中，计入截至目前的睡眠时长
            in_progress = max(0, int((now_bj - l.start_time).total_seconds() / 60))
            total_mins += in_progress

    return schemas.SleepStats(
        today_total_mins=total_mins,
        today_count=len(logs),
        meets_recommendation=total_mins >= 14 * 60,
    )


# ===================== 母乳存储 =====================

def _calc_expiry(collected_at: datetime, storage_type: str) -> datetime:
    delta = MILK_EXPIRY_RULES.get(storage_type, timedelta(hours=4))
    return collected_at + delta


def create_milk_storage(db: Session, data: schemas.MilkStorageCreate) -> models.MilkStorage:
    d = data.model_dump()
    collected = to_beijing_naive(d.get("collected_at")) if d.get("collected_at") else get_beijing_now()
    d["collected_at"] = collected
    d["expiry_at"] = _calc_expiry(collected, d["storage_type"])
    d["created_at"] = get_beijing_now()

    log = models.MilkStorage(**d)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_milk_storages(db: Session, include_used: bool = False) -> List[models.MilkStorage]:
    q = db.query(models.MilkStorage).order_by(models.MilkStorage.expiry_at)
    if not include_used:
        q = q.filter(models.MilkStorage.is_used == False)
    return q.all()


def mark_milk_used(db: Session, storage_id: int) -> Optional[models.MilkStorage]:
    item = db.query(models.MilkStorage).filter(models.MilkStorage.id == storage_id).first()
    if not item:
        return None
    item.is_used = True
    db.commit()
    db.refresh(item)
    return item


def delete_milk_storage(db: Session, storage_id: int) -> bool:
    item = db.query(models.MilkStorage).filter(models.MilkStorage.id == storage_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def get_milk_stats(db: Session) -> schemas.MilkStats:
    now_bj = get_beijing_now()
    today_start, today_end = get_beijing_today_range()

    items = (db.query(models.MilkStorage)
             .filter(models.MilkStorage.is_used == False)
             .all())

    fridge = sum(i.amount_ml for i in items if i.storage_type == "fridge")
    freezer = sum(i.amount_ml for i in items if i.storage_type == "freezer")
    room = sum(i.amount_ml for i in items if i.storage_type == "room")

    # 今日到期：到期时间属于北京时间今天 0点-24点（且当前未过期）
    expiring = sum(1 for i in items if now_bj <= i.expiry_at < today_end)
    # 已过期：到期时间已小于当前北京时间
    expired = sum(1 for i in items if i.expiry_at < now_bj)

    return schemas.MilkStats(
        fridge_total_ml=fridge,
        freezer_total_ml=freezer,
        room_total_ml=room,
        expiring_soon_count=expiring,
        expired_count=expired,
    )


# ===================== 泵奶记录 =====================

def create_pump_log(db: Session, data: schemas.PumpLogCreate) -> models.PumpLog:
    d = data.model_dump()
    if d.get("pump_time"):
        d["pump_time"] = to_beijing_naive(d["pump_time"])
    else:
        d["pump_time"] = get_beijing_now()
    d["created_at"] = get_beijing_now()

    log = models.PumpLog(**d)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_pump_logs(db: Session, limit: int = 50) -> List[models.PumpLog]:
    return (db.query(models.PumpLog)
            .order_by(desc(models.PumpLog.pump_time))
            .limit(limit).all())


def delete_pump_log(db: Session, log_id: int) -> bool:
    log = db.query(models.PumpLog).filter(models.PumpLog.id == log_id).first()
    if not log:
        return False
    db.delete(log)
    db.commit()
    return True
