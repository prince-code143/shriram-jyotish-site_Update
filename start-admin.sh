#!/bin/sh
# Mac / Linux के लिए: टर्मिनल में  sh start-admin.sh
cd "$(dirname "$0")" || exit 1
python3 serve.py
