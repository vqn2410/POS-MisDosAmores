#!/usr/bin/env bash
#
# Genera la clave privada y el CSR para el certificado WSAA de ARCA (ex AFIP).
# Uso:
#   bash server/arca/generateCsr.sh
#
# Salida:
#   server/arca/certs/comercio.key   -> clave privada (NUNCA subir a Git; ya está ignorada)
#   server/arca/certs/comercio.csr   -> solicitud a pegar en el sitio de ARCA
#
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$OUT_DIR"

CUIT=""
RAZON=""
PASSPHRASE=""

read -r -p "CUIT del comercio (solo números, 11 dígitos): " CUIT
read -r -p "Razón social exacta del titular del certificado: " RAZON
read -r -s -p "Passphrase para la clave privada (Enter = sin passphrase): " PASSPHRASE
echo

CUIT="$(echo "$CUIT" | tr -d '.-')"
if ! [[ "$CUIT" =~ ^[0-9]{11}$ ]]; then
  echo "ERROR: CUIT inválido. Debe tener 11 dígitos numéricos." >&2
  exit 1
fi
if [ -z "$RAZON" ]; then
  echo "ERROR: la razón social no puede estar vacía." >&2
  exit 1
fi

KEY="$OUT_DIR/comercio.key"
CSR="$OUT_DIR/comercio.csr"

echo ""
echo "Generando clave RSA 2048..."
if [ -n "$PASSPHRASE" ]; then
  openssl genrsa -des3 -passout "pass:$PASSPHRASE" -out "$KEY" 2048 2>/dev/null
else
  openssl genrsa -out "$KEY" 2048 2>/dev/null
fi

echo "Generando CSR con las extensiones que exige ARCA (SAML URI)..."
if [ -n "$PASSPHRASE" ]; then
  PASSIN=( -passin "pass:$PASSPHRASE" )
else
  PASSIN=( -nodes )
fi

openssl req -new -key "$KEY" "${PASSIN[@]}" -out "$CSR" \
  -subj "/C=AR/O=$CUIT/CN=$RAZON/serialNumber=$CUIT" \
  -addext "subjectAltName=URI:urn:oasis:names:tc:SAML:2.0:assertion" \
  -addext "keyUsage=digitalSignature,nonRepudiation" \
  -addext "extendedKeyUsage=clientAuth"

chmod 600 "$KEY"

echo ""
echo "================================================================"
echo "  GENERADOS OK"
echo "    Clave privada: $KEY"
echo "    CSR:           $CSR"
echo ""
echo "  Pegá el contenido COMPLETO del CSR en el sitio de ARCA."
echo "  El CSR empieza con '-----BEGIN CERTIFICATE REQUEST-----'"
echo "================================================================"
echo ""
openssl req -in "$CSR" -noout -subject
echo ""
echo "---------- COMIENZA EL CSR ----------"
cat "$CSR"
echo "---------- FIN DEL CSR ----------"
echo ""
echo "La clave privada NO se sube a ARCA: solo se usa el CSR."
echo "Cuando ARCA te entregue el .crt, guardalo como $OUT_DIR/comercio.crt"
echo "y completá ARCA_CUIT / ARCA_CERTIFICATE_PATH / ARCA_PRIVATE_KEY_PATH"
echo "en .env.arca.local."
