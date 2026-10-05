"""
FloodTrace Staff Role-Based Access Control (RBAC) System
Enforces authorization at the API layer for all internal back-office endpoints.

Roles:
- ADMIN: manage staff users, manage permissions, view all reports, assign/reassign reports,
         modify workflow configuration, manage escalation, view audit logs, manage publication state.
- REVIEWER: review reports, view authorized evidence, cross-check system data,
            request additional information, verify observations, escalate reports, resolve reports.
- OPERATOR: view incoming reports, triage, assign reports, update operational status, view operational context.
- READ_ONLY: view reports, view safe evidence, view history; cannot modify workflow, cannot assign,
             cannot verify, cannot publish.
"""

from enum import Enum
import hmac
from typing import List, Optional, Set
from fastapi import Request, HTTPException, Depends, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings
from apps.api.app.core.security import reject_prohibited_staff_inputs
from apps.api.app.models.entities import StaffUser

class StaffRole(str, Enum):
    ADMIN = "ADMIN"
    REVIEWER = "REVIEWER"
    OPERATOR = "OPERATOR"
    READ_ONLY = "READ_ONLY"
    SYSTEM = "SYSTEM"

# Permission definitions mapped to allowed roles
ROLE_PERMISSIONS: dict[str, Set[StaffRole]] = {
    # Workflow mutations
    "triage": {StaffRole.ADMIN, StaffRole.OPERATOR, StaffRole.REVIEWER},
    "assign": {StaffRole.ADMIN, StaffRole.OPERATOR},
    "change_priority": {StaffRole.ADMIN, StaffRole.OPERATOR, StaffRole.REVIEWER},
    "request_info": {StaffRole.ADMIN, StaffRole.REVIEWER},
    "verify_observation": {StaffRole.ADMIN, StaffRole.REVIEWER},
    "confirm_official": {StaffRole.ADMIN, StaffRole.REVIEWER},
    "escalate": {StaffRole.ADMIN, StaffRole.REVIEWER},
    "resolve": {StaffRole.ADMIN, StaffRole.REVIEWER},
    
    # Publication & Governance
    "manage_publication": {StaffRole.ADMIN},
    "manage_staff": {StaffRole.ADMIN},
    "view_audit_logs": {StaffRole.ADMIN, StaffRole.REVIEWER, StaffRole.OPERATOR, StaffRole.READ_ONLY},
    
    # Data access & Privacy
    "view_exact_gps": {StaffRole.ADMIN, StaffRole.REVIEWER, StaffRole.OPERATOR},
    "view_reporter_contact": {StaffRole.ADMIN, StaffRole.REVIEWER},
    "view_internal_notes": {StaffRole.ADMIN, StaffRole.REVIEWER, StaffRole.OPERATOR, StaffRole.READ_ONLY},
    "view_reports": {StaffRole.ADMIN, StaffRole.REVIEWER, StaffRole.OPERATOR, StaffRole.READ_ONLY},
    
    # General mutation gate
    "modify_workflow": {StaffRole.ADMIN, StaffRole.REVIEWER, StaffRole.OPERATOR},
}

api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)
STAFF_CONTAINMENT_USERNAME = "admin_user"

class StaffPrincipal:
    """Authenticated staff context attached to the request."""
    def __init__(
        self,
        user_id: str,
        username: str,
        display_name: str,
        role: StaffRole,
        department: str,
        email: str
    ):
        self.user_id = user_id
        self.username = username
        self.display_name = display_name
        self.role = role
        self.department = department
        self.email = email

    def has_permission(self, permission: str) -> bool:
        allowed_roles = ROLE_PERMISSIONS.get(permission, set())
        return self.role in allowed_roles

    def require_permission(self, permission: str):
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"สิทธิ์ไม่เพียงพอ: บัญชีบทบาท {self.role.value} ไม่ได้รับอนุญาตให้ดำเนินการ '{permission}'"
            )


def get_current_staff_user(
    request: Request,
    header_key: Optional[str] = Security(api_key_header),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    db: Session = Depends(get_db)
) -> StaffPrincipal:
    """Resolve the fixed active staff principal; caller identity and role are never trusted."""
    reject_prohibited_staff_inputs(request)

    provided_credentials = []
    if header_key and header_key.strip():
        provided_credentials.append(header_key)
    if credentials and credentials.credentials:
        provided_credentials.append(credentials.credentials)
    if not provided_credentials or any(not hmac.compare_digest(value, settings.ADMIN_API_KEY) for value in provided_credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff authentication required. Provide valid 'X-Admin-Key' or 'Authorization: Bearer <token>'."
        )
    configured_principal_id = settings.STAFF_CONTAINMENT_PRINCIPAL_ID
    if not configured_principal_id or not configured_principal_id.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Configured staff principal is unavailable.")
    matches = db.query(StaffUser).filter(StaffUser.id == configured_principal_id).all()
    if len(matches) != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Configured staff principal is unavailable.")
    staff_record = matches[0]
    if (
        staff_record.id != configured_principal_id
        or staff_record.username != STAFF_CONTAINMENT_USERNAME
        or staff_record.role != StaffRole.ADMIN.value
        or staff_record.is_active is not True
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Configured staff principal is unavailable.")
    return StaffPrincipal(
        user_id=staff_record.id,
        username=staff_record.username,
        display_name=staff_record.display_name,
        role=StaffRole(staff_record.role),
        department=staff_record.department,
        email=staff_record.email,
    )


def require_roles(allowed_roles: List[StaffRole]):
    """FastAPI dependency to enforce specific roles."""
    def role_checker(staff: StaffPrincipal = Depends(get_current_staff_user)) -> StaffPrincipal:
        if staff.role not in allowed_roles:
            role_names = [r.value for r in allowed_roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"สิทธิ์ไม่เพียงพอ: ต้องเป็นหนึ่งในบทบาท {role_names} แต่บทบาทปัจจุบันคือ {staff.role.value}"
            )
        return staff
    return role_checker


def require_permission(permission: str):
    """FastAPI dependency to enforce specific granular permission."""
    def permission_checker(staff: StaffPrincipal = Depends(get_current_staff_user)) -> StaffPrincipal:
        staff.require_permission(permission)
        return staff
    return permission_checker
