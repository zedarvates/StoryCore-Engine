"""
Setup script for StoryCore-Engine CLI.
"""

from setuptools import setup, find_packages

setup(
    name="storycore-engine",
    version="0.1.0",
    description="StoryCore-Engine CLI - MVP Bootstrap for AI-powered multimodal content generation",
    author="StoryCore Team",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "python-multipart>=0.0.6",
        "redis>=5.0.0",
        "slowapi>=0.1.9",
        "pydantic>=2.5.0",
        "pydantic-settings>=2.1.0",
        "aiofiles>=23.2.1",
        "structlog>=23.2.0",
        "httpx>=0.25.0",
        "websockets>=12.0",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "storycore=src.storycore_cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
