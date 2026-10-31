#!/usr/bin/env python3
"""AperioLibrum - Library Management System entry point."""

import uvicorn
from backend.main import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
