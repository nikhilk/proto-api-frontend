#!/bin/sh

export SRV_HOST=127.0.0.1
export SRV_PORT=6908
export SRV_ADDR=http://$SRV_HOST:$SRV_PORT

export API_HOST=127.0.0.1
export API_PORT=3976
export API_ADDR=http://$API_HOST:$API_PORT

export SHARED_SECRET=secret
export SRV_SECRET=private
