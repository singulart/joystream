#!/usr/bin/env bash

set -e

if ! command -v docker-compose &> /dev/null
then
  echo "docker-compose not found. Skipping docker image builds."
  exit 0
fi

# Build or fetch cached joystream/node docker image
if [[ "$SKIP_JOYSTREAM_NODE" = 1 || "$SKIP_JOYSTREAM_NODE" = "true" ]]; then
  echo "Skipping build of joystream/node docker image."
else
  # Fetch a cached joystream/node image if one is found matching code shasum instead of building
  CODE_HASH=`scripts/runtime-code-shasum.sh`
  IMAGE=joystream/node:${CODE_HASH}
  echo "Trying to fetch cached ${IMAGE} image"
  docker pull ${IMAGE} || :

  if ! docker inspect ${IMAGE} > /dev/null;
  then
    echo "Fetch failed, building image locally"
    docker-compose build joystream-node
  else
    echo "Tagging cached image as 'latest'"
    docker image tag ${IMAGE} joystream/node:latest
  fi
fi

# Build colossus docker image
echo "Building colossus docker image..."
docker-compose build colossus

# Build distributor docker image
echo "Building distributor docker image..."
docker-compose build distributor-node

if [[ "$OSTYPE" == "linux-gnu" ]]; then
    IP_ADDRESS=$(ip addr show | grep "\binet\b.*\bdocker0\b" | awk '{print $2}' | cut -d '/' -f 1)
    # Run a local development chain
    docker-compose -f docker-compose.linux-gnu-build.yml up -d joystream-node

    # Build processor/graphql-server docker image
    echo "Building joystream/apps docker image..."
    WS_PROVIDER_ENDPOINT_URI=ws://${IP_ADDRESS}:9944/ docker-compose build graphql-server
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Run a local development chain
    docker-compose up -d joystream-node

    # Build processor/graphql-server docker image
    echo "Building joystream/apps docker image..."
    WS_PROVIDER_ENDPOINT_URI=ws://host.docker.internal:9944/ docker-compose build graphql-server
fi

docker-compose down

# Build the pioneer docker image
# echo "Building pioneer docker image"
# docker-compose build pioneer
