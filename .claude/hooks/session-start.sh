#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SessionStart hook — ERP Aurelle
# Dos trabajos:
#   1) Instala dependencias (para que build/lint corran en sesiones web).
#   2) GUARDARRAÍL: al iniciar cada sesión imprime el estado y detecta ramas
#      paralelas, para que NADIE empiece a codear sin leer los documentos madre
#      ni sin ver si otra sesión ya avanzó (la bifurcación del 2026-07-06 pasó
#      justo por saltarse esto).
# Síncrono a propósito: su salida entra al contexto de la sesión.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
cd "$DIR" || exit 0

# 1) Dependencias (idempotente; el contenedor cachea node_modules) ─────────────
if [ ! -d node_modules ]; then
  npm install >/tmp/aurelle-session-npm.log 2>&1 || true
fi

# 2) Guardarraíl ──────────────────────────────────────────────────────────────
git fetch --all --prune --quiet 2>/dev/null || true
RAMA="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"

echo "===================================================================="
echo "  PROTOCOLO DE SESION - ERP Aurelle  (LEE ESTO ANTES DE ESCRIBIR CODIGO)"
echo "===================================================================="
echo
echo "DOCUMENTOS MADRE - obligatorio al INICIO y al CIERRE de cada sesion:"
echo "  - docs/ESTADO.md      -> leelo COMPLETO ahora; sobrescribelo al terminar."
echo "  - docs/DECISIONES.md  -> busca antes de decidir; +1 linea por decision."
echo "  - CLAUDE.md (protocolo, reglas duras) -> la constitucion del repo."
echo "  - docs/modulos/<mod>.md -> si tocas un modulo existente, leelo/actualizalo."
echo "  Una sesion que no actualiza estos documentos le cuesta a la siguiente."
echo
echo "-- docs/ESTADO.md (encabezado) -------------------------------------"
sed -n '1,20p' docs/ESTADO.md 2>/dev/null || echo "  (ESTADO.md no encontrado)"
echo
echo "-- Ramas remotas claude/* por fecha (alguien trabajo en paralelo?) --"
git for-each-ref --sort=-committerdate \
  --format='  %(committerdate:short)  %(refname:short)  -  %(contents:subject)' \
  refs/remotes/origin/claude 2>/dev/null | head -6
echo
echo "  Rama actual: ${RAMA}"
echo "  AVISO: si otra rama claude/* tiene commits MAS RECIENTES que esta, hay"
echo "  bifurcacion. PARA y reconcilia (git log HEAD..origin/<rama>) antes de"
echo "  escribir nada. Regla: un solo frente de trabajo por modulo."
echo "===================================================================="

exit 0
