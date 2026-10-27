"""Automated Background Scheduler Worker for Bulk WhatsApp Campaigns."""

import asyncio
from datetime import datetime
import json
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.audit_log import ist_now
from app.models.client_list import ClientListMembership
from app.models.contact import HniContact
from app.models.template_campaign import (
    CAMPAIGN_COMPLETED,
    CAMPAIGN_FAILED,
    CAMPAIGN_RUNNING,
    CAMPAIGN_SCHEDULED,
    BulkCampaign,
    WhatsAppTemplate,
)
from app.models.whatsapp_message import DELIVERED, SENT
from app.services import whatsapp_engine

logger = logging.getLogger("subsidyx.scheduler")


def get_contacts_for_campaign(
    db: Session,
    target_list_ids: list[int] | None = None,
    segment: str | None = None,
) -> list[HniContact]:
    """Retrieves and deduplicates opted-in HNI contacts across target client lists and segments."""
    contacts_dict: dict[int, HniContact] = {}

    # 1. Target Client Lists
    if target_list_ids:
        memberships = db.scalars(
            select(ClientListMembership).where(ClientListMembership.list_id.in_(target_list_ids))
        ).all()
        contact_ids = {m.contact_id for m in memberships}
        if contact_ids:
            list_contacts = db.scalars(
                select(HniContact).where(
                    HniContact.id.in_(contact_ids),
                    HniContact.opt_in_status.is_(True),
                )
            ).all()
            for c in list_contacts:
                contacts_dict[c.id] = c

    # 2. If no lists selected or segment also targeted
    if not contacts_dict or (segment and segment.strip() and segment.strip().upper() != "ALL"):
        seg_contacts = whatsapp_engine.contacts_for_segment(db, segment or "ALL")
        for c in seg_contacts:
            if c.opt_in_status:
                contacts_dict[c.id] = c

    return list(contacts_dict.values())


def execute_campaign(db: Session, campaign: BulkCampaign) -> int:
    """Executes a single campaign immediately, sending templates and updating stats."""
    template = db.get(WhatsAppTemplate, campaign.template_id)
    if template is None:
        campaign.status = CAMPAIGN_FAILED
        db.commit()
        logger.error("Campaign #%s failed: Template %s not found", campaign.id, campaign.template_id)
        return 0

    campaign.status = CAMPAIGN_RUNNING
    db.commit()

    contacts = get_contacts_for_campaign(db, campaign.target_list_ids, campaign.segment)
    if not contacts:
        campaign.total_targeted = 0
        campaign.status = CAMPAIGN_COMPLETED
        campaign.executed_at_ist = ist_now()
        db.commit()
        logger.info("Campaign #%s completed: 0 targeted contacts.", campaign.id)
        return 0

    campaign.total_targeted = len(contacts)
    is_mock = whatsapp_engine.mock_active(db)
    msg_status = DELIVERED if is_mock else SENT

    for contact in contacts:
        whatsapp_engine.send_template(
            db,
            contact,
            template,
            campaign_id=campaign.id,
            status=msg_status,
        )

    db.commit()
    whatsapp_engine.refresh_campaign_counters(db, campaign)
    campaign.status = CAMPAIGN_COMPLETED
    campaign.executed_at_ist = ist_now()
    db.commit()

    logger.info("Campaign #%s '%s' executed successfully to %d contacts.", campaign.id, campaign.campaign_name, len(contacts))
    return len(contacts)


async def run_campaign_scheduler_loop() -> None:
    """Background task loop that checks every 10 seconds for due scheduled campaigns."""
    logger.info("SubsidyX Campaign Scheduler Worker initialized (10s polling interval).")
    while True:
        try:
            await asyncio.sleep(10)
            now = ist_now()
            with SessionLocal() as db:
                due_campaigns = list(
                    db.scalars(
                        select(BulkCampaign).where(
                            BulkCampaign.status == CAMPAIGN_SCHEDULED,
                            BulkCampaign.scheduled_at_ist.is_not(None),
                            BulkCampaign.scheduled_at_ist <= now,
                        )
                    ).all()
                )
                for campaign in due_campaigns:
                    logger.info("Triggering scheduled campaign #%s '%s' (scheduled for %s)", campaign.id, campaign.campaign_name, campaign.scheduled_at_ist)
                    execute_campaign(db, campaign)
        except asyncio.CancelledError:
            logger.info("Campaign scheduler loop cancelled.")
            break
        except Exception as e:
            logger.error("Error in campaign scheduler loop: %s", e, exc_info=True)
            await asyncio.sleep(5)
