import os
import re
import socket
from pathlib import Path
from urllib.parse import quote_plus, urlparse

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(_ROOT / ".env")
load_dotenv(_ROOT / "backend" / ".env")

# 依序嘗試的完整連線字串環境變數
_URL_KEYS = (
    "DATABASE_URL",
    "SUPABASE_DATABASE_URL",
    "DIRECT_URL",
    "SUPABASE_DB_URL",
)


def _normalize_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


def _extract_project_ref(supabase_url: str) -> str | None:
    """https://xxxx.supabase.co → xxxx"""
    m = re.match(r"https?://([a-z0-9-]+)\.supabase\.co", supabase_url.strip(), re.I)
    return m.group(1) if m else None


def _build_pooler_url(project_ref: str, password: str, region: str) -> str:
    """
    Supabase Session pooler（Dashboard → Database → Connection string → Session）
    例：postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
    """
    host = (
        os.getenv("SUPABASE_DB_POOLER_HOST", "").strip()
        or f"aws-0-{region}.pooler.supabase.com"
    )
    port = os.getenv("SUPABASE_DB_PORT", "5432").strip() or "5432"
    db = os.getenv("SUPABASE_DB_NAME", "postgres").strip() or "postgres"
    user = os.getenv("SUPABASE_DB_USER", f"postgres.{project_ref}").strip()
    return (
        f"postgresql+psycopg2://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{db}"
    )


def _host_resolves(hostname: str) -> bool:
    if not hostname:
        return False
    try:
        socket.getaddrinfo(hostname, None)
        return True
    except socket.gaierror:
        return False


def _validate_url_host(url: str) -> None:
    parsed = urlparse(url.replace("postgresql+psycopg2://", "postgresql://", 1))
    host = parsed.hostname or ""
    if host and not _host_resolves(host):
        ref_hint = ""
        m = re.match(r"db\.([a-z0-9-]+)\.supabase\.co", host, re.I)
        if m:
            ref_hint = (
                f"\n\n主機 db.{m.group(1)}.supabase.co 目前無法解析（常見原因：\n"
                "  • 專案已暫停（Paused）— 請到 Dashboard 恢復專案\n"
                "  • 應改用 Dashboard 提供的 Session pooler 連線字串，不要手動拼 db.* 網域\n"
                "  • 請複製 Database → Connect → Session mode 的完整 URI 到 DATABASE_URL"
            )
        raise RuntimeError(
            f"資料庫主機無法解析：{host}\n"
            f"請到 Supabase Dashboard → Project Settings → Database → Connection string，"
            f"複製「Session」或「Direct」的完整 URI 到 .env 的 DATABASE_URL。{ref_hint}"
        )


def get_database_url() -> str:
    for key in _URL_KEYS:
        raw = os.getenv(key, "").strip()
        if raw:
            url = _normalize_url(raw)
            _validate_url_host(url)
            return url

    password = (
        os.getenv("SUPABASE_DB_PASSWORD", "").strip()
        or os.getenv("DB_PASSWORD", "").strip()
    )
    if password:
        base = (
            os.getenv("VITE_SUPABASE_URL", "").strip()
            or os.getenv("SUPABASE_URL", "").strip()
        )
        ref = _extract_project_ref(base) if base else None
        if not ref:
            raise RuntimeError(
                "已設定 SUPABASE_DB_PASSWORD，但無法從 SUPABASE_URL / VITE_SUPABASE_URL "
                "解析專案 ref。請改設完整的 DATABASE_URL（從 Dashboard 複製）。"
            )

        region = os.getenv("SUPABASE_DB_REGION", "").strip()
        if region:
            url = _build_pooler_url(ref, password, region)
            _validate_url_host(url)
            return url

        raise RuntimeError(
            "已設定 SUPABASE_DB_PASSWORD，但無法安全自動組裝連線字串。\n"
            "db.[ref].supabase.co 在許多專案／網路下無法解析。\n\n"
            "請在 .env 改用以下其中一種：\n\n"
            "方式 A（建議）— 從 Dashboard 複製完整 URI：\n"
            "  Database → Connect → Session mode → 複製 URI\n"
            "  DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres\n\n"
            "方式 B — 密碼 + 區域（自動組裝 Session pooler）：\n"
            "  SUPABASE_DB_PASSWORD=[PASSWORD]\n"
            "  SUPABASE_DB_REGION=ap-southeast-1   # 與 Dashboard 顯示的 region 一致\n"
        )

    raise RuntimeError(
        "缺少資料庫連線設定。\n\n"
        "Alembic 需要 PostgreSQL 連線（與 VITE_SUPABASE_ANON_KEY 不同）。\n"
        "請在專案根目錄 .env 設定 DATABASE_URL（從 Supabase Dashboard → Database "
        "→ Connection string 複製 Session 或 Direct 的完整 URI）。"
    )
