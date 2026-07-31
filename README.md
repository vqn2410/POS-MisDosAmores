# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Mercado Pago QR local

1. Create `.env.mercadopago.local` from `.env.mercadopago.example` and set the test access token and registered QR POS external ID.
2. Run `npm run dev:mp` in one terminal.
3. Run `npm run dev` in another terminal.

The local Mercado Pago server keeps the access token out of the browser. The POS generates a dynamic QR and confirms the payment only after Mercado Pago reports it as approved.

## Despliegue en Vercel

La API (Mercado Pago + ARCA) corre como función serverless en `api/[...slug].mjs` reutilizando `server/appHandler.mjs`. En Vercel, configurá en **Settings → Environment Variables**:

**Mercado Pago (producción):**
- `MP_PRODUCTION_ACCESS_TOKEN` — access token `APP_USR-...`
- `MP_PRODUCTION_EXTERNAL_POS_ID` — external id de la caja
- `MP_PRODUCTION_COLLECTOR_ID` — id del vendedor (opcional, se autodescubre)

**ARCA:**
- `ARCA_CUIT`, `ARCA_ENVIRONMENT=production`, `ARCA_SALES_POINT`
- `ARCA_CERT_PEM` y `ARCA_PRIVATE_KEY_PEM` — el contenido del `.crt` y `.key` (los archivos no están en el repo; se cargan desde estas variables si `ARCA_CERTIFICATE_PATH`/`ARCA_PRIVATE_KEY_PATH` no existen)
- `ARCA_EMITTER_NAME`, `ARCA_EMITTER_ADDRESS`, `ARCA_EMITTER_TAX_CONDITION` (opcionales)

En desarrollo local se siguen usando los archivos `server/arca/certs/*` con `npm run dev:mp`.
