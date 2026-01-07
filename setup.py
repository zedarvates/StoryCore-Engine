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
        # No external dependencies for hackathon mode
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
