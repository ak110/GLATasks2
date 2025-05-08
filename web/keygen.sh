#!/bin/bash -x
SCRIPT_DIR="$(cd $(dirname $0); pwd)"
mkdir -p "$SCRIPT_DIR/ssl"
if [ ! -e "$SCRIPT_DIR/ssl/server.key" ] ; then
    openssl genrsa -out $SCRIPT_DIR/ssl/server.key 2048
fi
openssl req -utf8 -new -key $SCRIPT_DIR/ssl/server.key -out $SCRIPT_DIR/ssl/server.csr -config "$SCRIPT_DIR/openssl.cnf"
openssl x509 -days 3650 -req -signkey $SCRIPT_DIR/ssl/server.key -in $SCRIPT_DIR/ssl/server.csr -out $SCRIPT_DIR/ssl/server.crt -extfile "$SCRIPT_DIR/openssl.cnf" -extensions req_ext
