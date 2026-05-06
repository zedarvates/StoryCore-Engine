/**
 * Input Validation Models
 * 
 * Requirements: 107
 * Security Level: 🟡 HAUTE
 * 
 * Pydantic-style validation models for Python backend
 */

import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator, EmailStr, constr
from enum import Enum


class GenerationType(str, Enum):
    GRID = "grid"
    PROMOTION = "promotion"
    REFINE = "refine"
    QA = "qa"


class AssetType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DATA = "data"


class Status(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProjectCreateModel(BaseModel):
    """Validation model for project creation"""
    
    name: constr(min_length=1, max_length=100, strip_whitespace=True)
    description: Optional[constr(max_length=500)] = None
    type: GenerationType
    
    @validator('name')
    def validate_project_name(cls, v):
        """Validate project name for security"""
        if not v or not v.strip():
            raise ValueError('Project name cannot be empty')
        
        # Check for path traversal
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Invalid characters in project name')
        
        # Check for SQL injection patterns
        sql_patterns = [r"[';]", r"(drop|delete|insert|update|alter)", r"union\s+select"]
        for pattern in sql_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Invalid characters in project name')
        
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "My Story Project",
                "description": "A creative story generation project",
                "type": "grid"
            }
        }


class AssetCreateModel(BaseModel):
    """Validation model for asset creation"""
    
    name: constr(min_length=1, max_length=200, strip_whitespace=True)
    type: AssetType
    url: str
    thumbnail: Optional[str] = None
    size: Optional[int] = Field(None, ge=0)
    format: Optional[constr(max_length=50)] = None
    width: Optional[int] = Field(None, ge=0)
    height: Optional[int] = Field(None, ge=0)
    duration: Optional[float] = Field(None, ge=0)
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('name')
    def validate_asset_name(cls, v):
        """Validate asset name for security"""
        if not v or not v.strip():
            raise ValueError('Asset name cannot be empty')
        
        # Check for path traversal
        if '..' in v or '../' in v:
            raise ValueError('Invalid characters in asset name')
        
        return v.strip()
    
    @validator('url')
    def validate_url(cls, v):
        """Validate URL format"""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if not url_pattern.match(v):
            raise ValueError('Invalid URL format')
        
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "generated_image.png",
                "type": "image",
                "url": "https://example.com/image.png",
                "width": 1920,
                "height": 1080,
                "size": 1024000
            }
        }


class GenerationTaskCreateModel(BaseModel):
    """Validation model for generation task creation"""
    
    project_name: constr(min_length=1, max_length=100)
    type: GenerationType
    prompt: constr(min_length=1, max_length=5000)
    parameters: Optional[Dict[str, Any]] = None
    priority: Optional[int] = Field(5, ge=1, le=10)
    
    @validator('prompt')
    def validate_prompt(cls, v):
        """Validate prompt for security"""
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        
        # Check for prompt injection patterns
        injection_patterns = [
            r'ignore\s+previous\s+instructions',
            r'forget\s+all\s+previous\s+instructions',
            r'you\s+are\s+now\s+a\s+different',
            r'system:',
            r'act\s+as\s+if',
        ]
        
        for pattern in injection_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Prompt contains potentially harmful content')
        
        # Check length
        if len(v) > 5000:
            raise ValueError('Prompt too long (max 5000 characters)')
        
        return v.strip()
    
    @validator('parameters')
    def validate_parameters(cls, v):
        """Validate parameters for security"""
        if v is not None:
            # Limit parameter size
            import json
            param_str = json.dumps(v)
            if len(param_str) > 10000:
                raise ValueError('Parameters too large')
        
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "project_name": "My Story Project",
                "type": "grid",
                "prompt": "Create a 2x2 grid of story scenes",
                "parameters": {
                    "style": "cinematic",
                    "resolution": "1920x1080"
                },
                "priority": 5
            }
        }


class ResultCreateModel(BaseModel):
    """Validation model for result creation"""
    
    task_id: constr(min_length=1, max_length=100)
    shot_id: constr(min_length=1, max_length=100)
    type: GenerationType
    status: Status
    assets: List[AssetCreateModel]
    generated_at: datetime
    processing_time: Optional[float] = Field(None, ge=0)
    quality_score: Optional[int] = Field(None, ge=0, le=100)
    metrics: Optional[Dict[str, float]] = None
    error: Optional[constr(max_length=500)] = None
    
    @validator('task_id', 'shot_id')
    def validate_ids(cls, v):
        """Validate ID format"""
        if not v or not v.strip():
            raise ValueError('ID cannot be empty')
        
        # Check for valid characters
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Invalid characters in ID')
        
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "task_id": "task-123",
                "shot_id": "shot-1",
                "type": "grid",
                "status": "completed",
                "assets": [{
                    "name": "output.png",
                    "type": "image",
                    "url": "https://example.com/output.png"
                }],
                "generated_at": "2024-01-01T12:00:00Z",
                "processing_time": 120.5,
                "quality_score": 95
            }
        }


class UserCreateModel(BaseModel):
    """Validation model for user creation"""
    
    username: constr(min_length=3, max_length=50, strip_whitespace=True)
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    full_name: Optional[constr(max_length=100)] = None
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username format"""
        if not v or not v.strip():
            raise ValueError('Username cannot be empty')
        
        # Check for valid characters
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        # Check for at least one uppercase, one lowercase, one digit, one special char
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "password": "SecurePass123!",
                "full_name": "John Doe"
            }
        }


class LoginModel(BaseModel):
    """Validation model for user login"""
    
    username: constr(min_length=1, max_length=50)
    password: constr(min_length=1, max_length=128)
    
    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "password": "SecurePass123!"
            }
        }


class ApiKeyCreateModel(BaseModel):
    """Validation model for API key creation"""
    
    name: constr(min_length=1, max_length=100)
    description: Optional[constr(max_length=200)] = None
    scopes: Optional[List[str]] = None
    
    @validator('name')
    def validate_name(cls, v):
        """Validate API key name"""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Production API Key",
                "description": "Used for production deployments",
                "scopes": ["read", "write", "generate"]
            }
        }


class AuditLogCreateModel(BaseModel):
    """Validation model for audit log creation"""
    
    user_id: Optional[int] = None
    action: constr(min_length=1, max_length=100)
    resource_type: constr(min_length=1, max_length=50)
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[constr(max_length=45)] = None
    user_agent: Optional[constr(max_length=500)] = None
    
    @validator('action')
    def validate_action(cls, v):
        """Validate action name"""
        if not v or not v.strip():
            raise ValueError('Action cannot be empty')
        
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": 1,
                "action": "create_project",
                "resource_type": "project",
                "resource_id": "proj-123",
                "details": {
                    "project_name": "My Project",
                    "type": "grid"
                },
                "ip_address": "192.168.1.1"
            }
        }


class SettingsUpdateModel(BaseModel):
    """Validation model for settings update"""
    
    key: constr(min_length=1, max_length=100)
    value: Any
    description: Optional[constr(max_length=200)] = None
    
    @validator('key')
    def validate_key(cls, v):
        """Validate settings key"""
        if not v or not v.strip():
            raise ValueError('Key cannot be empty')
        
        # Check for valid characters
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Invalid characters in settings key')
        
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "key": "max_project_size",
                "value": 100,
                "description": "Maximum number of projects per user"
            }
        }


# Response models
from pydantic import BaseModel as ResponseModel


class ApiResponse(ResponseModel):
    """Generic API response model"""
    
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Operation completed successfully",
                "data": {"id": "123"}
            }
        }


class RateLimitInfoResponse(ResponseModel):
    """Rate limit information response model"""
    
    limit: int
    remaining: int
    reset: int
    
    class Config:
        schema_extra = {
            "example": {
                "limit": 100,
                "remaining": 95,
                "reset": 1704067200
            }
        }
