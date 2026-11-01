#!/usr/bin/env python3
"""AperioLibrum - Flask entry point."""

from backend.flask_app import app

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000, debug=True)
