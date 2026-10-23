"""Custom chatbot builder rules — keyword triggers mapped to replies and auto-tagging."""

import re
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

KEYWORD_MATCH = "KEYWORD_MATCH"
FIRST_INBOUND_WELCOME = "FIRST_INBOUND_WELCOME"
BUTTON_PAYLOAD = "BUTTON_PAYLOAD"
ANY_UNMATCHED = "ANY_UNMATCHED"
TRIGGER_TYPES = (KEYWORD_MATCH, FIRST_INBOUND_WELCOME, BUTTON_PAYLOAD, ANY_UNMATCHED)

TEXT = "TEXT"
TEMPLATE = "TEMPLATE"
INTERACTIVE_MENU = "INTERACTIVE_MENU"
RESPONSE_TYPES = (TEXT, TEMPLATE, INTERACTIVE_MENU)


class ChatbotFlow(Base):
    __tablename__ = "chatbot_flows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bot_name: Mapped[str] = mapped_column(String(160))
    trigger_type: Mapped[str] = mapped_column(String(32), default=KEYWORD_MATCH, index=True)
    trigger_keywords: Mapped[str] = mapped_column(String(255), default="")
    response_type: Mapped[str] = mapped_column(String(24), default=TEXT)
    response_content: Mapped[str] = mapped_column(Text, default="")
    template_id: Mapped[int | None] = mapped_column(Integer, default=None)
    auto_assign_sector: Mapped[str] = mapped_column(String(60), default="")
    auto_assign_ca: Mapped[str] = mapped_column(String(120), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    hit_count: Mapped[int] = mapped_column(Integer, default=0)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    @property
    def keyword_list(self) -> list[str]:
        return [word.strip().lower() for word in self.trigger_keywords.split(",") if word.strip()]

    def match_score(self, text: str) -> int:
        """0 = no match. Longer matched keywords win, so 'textile' beats 'hi'."""
        haystack = (text or "").lower()
        if self.trigger_type == BUTTON_PAYLOAD:
            payload = haystack.strip()
            return max((len(word) for word in self.keyword_list if word == payload), default=0)
        score = 0
        for word in self.keyword_list:
            if re.search(rf"\b{re.escape(word)}\b", haystack):
                score = max(score, len(word))
        return score

    def public(self) -> dict:
        return {
            "id": self.id,
            "bot_name": self.bot_name,
            "trigger_type": self.trigger_type,
            "trigger_keywords": self.trigger_keywords,
            "keyword_list": self.keyword_list,
            "response_type": self.response_type,
            "response_content": self.response_content,
            "template_id": self.template_id,
            "auto_assign_sector": self.auto_assign_sector,
            "auto_assign_ca": self.auto_assign_ca,
            "is_active": self.is_active,
            "hit_count": self.hit_count,
            "is_mock": self.is_mock,
            "created_at": self.created_at.isoformat(),
        }
