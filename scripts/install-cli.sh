#!/usr/bin/env bash
set -e

# JellyCord CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/shayyz-code/jellycord/main/scripts/install-cli.sh | bash

OWNER="shayyz-code"
REPO="jellycord"
BINARY_NAME="jellycord"

# Detect OS
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "${OS}" in
    linux*)   OS='linux' ;;
    darwin*)  OS='darwin' ;;
    msys*)    OS='windows' ;;
    *)        echo "Error: Unsupported OS ${OS}"; exit 1 ;;
esac

# Detect Architecture
ARCH="$(uname -m)"
case "${ARCH}" in
    x86_64) ARCH='x86_64' ;;
    arm64|aarch64) ARCH='arm64' ;;
    *)      echo "Error: Unsupported architecture ${ARCH}"; exit 1 ;;
esac

# Get latest release tag
echo "Fetching latest release..."
LATEST_TAG=$(curl -s https://api.github.com/repos/${OWNER}/${REPO}/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "${LATEST_TAG}" ]; then
    echo "Error: Could not find latest release tag."
    exit 1
fi

# Construct download URL
EXTENSION="tar.gz"
if [ "${OS}" == "windows" ]; then
    EXTENSION="zip"
fi

FILENAME="${REPO}_${OS}_${ARCH}.${EXTENSION}"
URL="https://github.com/$(echo ${OWNER})/${REPO}/releases/download/${LATEST_TAG}/${FILENAME}"

echo "Downloading ${BINARY_NAME} ${LATEST_TAG} for ${OS}/${ARCH}..."
TEMP_DIR=$(mktemp -d)
curl -L "${URL}" -o "${TEMP_DIR}/${FILENAME}"

# Extract and install
echo "Installing..."
cd "${TEMP_DIR}"
if [ "${EXTENSION}" == "zip" ]; then
    unzip -q "${FILENAME}"
else
    tar -xzf "${FILENAME}"
fi

# Find the binary
INSTALL_DIR="/usr/local/bin"
if [ ! -w "${INSTALL_DIR}" ]; then
    echo "Requesting sudo to install to ${INSTALL_DIR}"
    sudo mv "${BINARY_NAME}" "${INSTALL_DIR}/"
else
    mv "${BINARY_NAME}" "${INSTALL_DIR}/"
fi

echo "Successfully installed ${BINARY_NAME} to ${INSTALL_DIR}"
${BINARY_NAME} help
rm -rf "${TEMP_DIR}"
