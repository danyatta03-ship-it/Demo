#!/bin/sh
# Tutte le prove, in fila. Se una fallisce, fallisce tutto.
set -e
node "$(dirname "$0")/magazzino.test.js"
node "$(dirname "$0")/deposito.test.js"
node "$(dirname "$0")/etichette.test.js"
