"""
Setup script for StoryCore-Engine CLI.

This setup script configures the modular CLI architecture with a single entry point
while properly packaging all CLI modules, handlers, and utilities.

Requirements: 10.1, 10.4
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read long description from README
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

setup(
    name="storycore-engine",
    version="0.1.0",
    description="StoryCore-Engine CLI - Modular AI-powered multimodal content generation pipeline",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="StoryCore Team",
    url="https://github.com/storycore/storycore-engine",
    
    # Package discovery - includes all packages under src/
    packages=find_packages(where="."),
    package_dir={"": "."},
    
    # Include all Python packages in src/
    # This ensures cli/, cli/handlers/, cli/utils/, engines/, etc. are all included
    include_package_data=True,
    
    python_requires=">=3.8",
    
    # Core dependencies
    install_requires=[
        # Image processing
        "Pillow>=10.4.0",
        
        # ComfyUI integration
        "aiohttp>=3.10.0",
        
        # Real-time preview
        "websockets>=13.0.0",
        
        # Security
        "cryptography>=43.0.0",
        "certifi>=2024.8.30",
        
        # API server (optional)
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
        "python-dotenv>=1.0.0",
    ],
    
    # Development dependencies
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "hypothesis>=6.100.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
        "test": [
            "pytest>=8.0.0",
            "hypothesis>=6.100.0",
            "pytest-cov>=4.1.0",
        ],
    },
    
    # Single entry point for CLI
    # This maintains backward compatibility while using modular architecture
    entry_points={
        "console_scripts": [
            "storycore=src.storycore_cli:main",
        ],
    },
    
    # Package metadata
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Multimedia :: Graphics",
        "Topic :: Multimedia :: Video",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    
    keywords="ai video generation cli modular storycore",
    
    project_urls={
        "Documentation": "https://github.com/storycore/storycore-engine/docs",
        "Source": "https://github.com/storycore/storycore-engine",
        "Tracker": "https://github.com/storycore/storycore-engine/issues",
    },
)
