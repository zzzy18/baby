"""
Pydantic Schemas：请求体与响应体的数据校验
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ===== 鉴权请求 =====
class LoginRequest(BaseModel):
    access_code: str


# ===== 喂奶记录 =====
class FeedingLogCreate(BaseModel):
    feed_type: str          # breast | bottle
    side: Optional[str] = None
    duration_mins: Optional[int] = None
    amount_ml: Optional[float] = None
    feed_time: datetime
    note: Optional[str] = ""


class FeedingLogResponse(FeedingLogCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 换尿布记录 =====
class DiaperLogCreate(BaseModel):
    diaper_type: str        # wet | poop | mixed
    diaper_time: datetime
    color: Optional[str] = ""
    note: Optional[str] = ""


class DiaperLogResponse(DiaperLogCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 睡眠记录 =====
class SleepLogCreate(BaseModel):
    sleep_type: str         # nap | night
    start_time: datetime
    end_time: Optional[datetime] = None
    note: Optional[str] = ""


class SleepLogResponse(SleepLogCreate):
    id: int
    duration_mins: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 母乳存储 =====
class MilkStorageCreate(BaseModel):
    amount_ml: float
    storage_type: str       # fridge | freezer | room
    collected_at: datetime
    note: Optional[str] = ""


class MilkStorageResponse(MilkStorageCreate):
    id: int
    expiry_at: datetime
    is_used: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 泵奶记录 =====
class PumpLogCreate(BaseModel):
    amount_ml: float
    side: str               # 左侧 | 右侧 | 双侧
    duration_mins: Optional[int] = None
    pump_time: datetime
    note: Optional[str] = ""


class PumpLogResponse(PumpLogCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 统计汇总响应 =====
class FeedingStats(BaseModel):
    today_count: int
    avg_interval_hours: Optional[float]
    mins_since_last: Optional[int]


class DiaperStats(BaseModel):
    today_total: int
    today_wet: int
    today_poop: int


class SleepStats(BaseModel):
    today_total_mins: int
    today_count: int
    meets_recommendation: bool  # 建议 14-17h


class MilkStats(BaseModel):
    fridge_total_ml: float
    freezer_total_ml: float
    room_total_ml: float
    expiring_soon_count: int    # 24小时内到期
    expired_count: int


# ===== 宝宝档案 =====
class BabyProfileBase(BaseModel):
    name: str
    gender: Optional[str] = "girl"
    birthday: str
    weight_kg: float
    head_circumference_cm: Optional[float] = None
    height_cm: Optional[float] = None


class BabyProfileResponse(BabyProfileBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
