#!/bin/bash

# Quick stop script for CLM Survey
# Just runs ./server.sh stop

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/server.sh" stop