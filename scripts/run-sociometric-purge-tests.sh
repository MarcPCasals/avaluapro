#!/usr/bin/env bash

set -euo pipefail

if ! java -version >/dev/null 2>&1; then
  if [[ -x /opt/homebrew/opt/openjdk@21/bin/java ]]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
    export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
  else
    echo "No s'ha trobat Java. Instal.la OpenJDK 21 abans d'executar les proves." >&2
    exit 1
  fi
fi

npx firebase emulators:exec \
  --only firestore \
  --project demo-avaluapro-purge \
  "npm --prefix functions test"
