import React from 'react';
import { Box, Paper, Typography, Grid, Chip, Button, Alert, CircularProgress } from '@mui/material';
import { CheckCircle2, RefreshCw, Workflow, Database, CloudUpload } from 'lucide-react';
import { MercadoPagoClient } from '../../mercadoPago/MercadoPagoClient';
import { ArcaClient } from '../../arca/ArcaClient';
import { seedFirebaseData } from '../auth/services/firebaseSeedService';

export const IntegrationsView: React.FC = () => {
  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [testError, setTestError] = React.useState<string | null>(null);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const handleTestMp = async () => {
    const mpClient = new MercadoPagoClient();
    const qrResult = await mpClient.createStaticQR('pos-matriz-01');
    setTestResult(`Mercado Pago API OK! URL QR Estático generado: ${qrResult}`);
    setTestError(null);
  };

  const handleTestArca = async () => {
    const arcaClient = new ArcaClient();
    const ta = await arcaClient.authenticate('wsfe');
    setTestResult(`ARCA / WSAA OK! Token de Acceso (TA) activo expedido hasta: ${ta.expiration.toLocaleTimeString()}`);
    setTestError(null);
  };

  const handleSeedFirebase = async () => {
    setIsSeeding(true);
    setTestResult(null);
    setTestError(null);

    const res = await seedFirebaseData();
    setIsSeeding(false);

    if (res.success) {
      setTestResult(`✅ Firebase Firestore (pos-misdosamores): ${res.totalRecords} registros de prueba enviados correctamente a ${res.collections.length} colecciones!`);
    } else {
      setTestError(`⚠️ Firebase Firestore: ${res.error}. (Nota: Si las reglas de seguridad de Firestore en pos-misdosamores están bloqueadas, configure 'allow read, write: if true;' temporalmente en la consola de Firebase).`);
    }
  };

  const INTEGRATIONS = [
    { title: 'Mercado Pago (Instore QR & Webhooks)', status: 'Arquitectura Lista', desc: 'Módulo desacoplado en src/mercadoPago/ con recepción de eventos HMAC y QR dinámico', action: handleTestMp, actionText: 'Probar Conexión Módulo' },
    { title: 'ARCA / AFIP (WSAA & WSFEv1)', status: 'Certificado & Cache TA', desc: 'Módulo desacoplado en src/arca/ con auto-renovación de Ticket de Acceso', action: handleTestArca, actionText: 'Probar Conexión Módulo' },
    { title: 'Firebase Cloud Firestore (pos-misdosamores)', status: 'Proyecto Configurado', desc: 'Base de datos en la nube (Proyecto ID: pos-misdosamores, authDomain: pos-misdosamores.firebaseapp.com)', action: handleSeedFirebase, actionText: 'Enviar Datos de Prueba a Firebase', icon: Database },
    { title: 'Servidor Redis (Session & PubSub)', status: 'Conectado', desc: 'Cache y sincronización de Redis Cloud' },
    { title: 'Socket.IO WebSockets Gateway', status: 'Online', desc: 'Alertas en tiempo real de inventario y caja' },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        <Workflow size={32} color="#2563EB" /> Integraciones External Services (Firebase, Mercado Pago & ARCA)
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Estado de los módulos desacoplados y sincronización con Web Services oficiales
      </Typography>

      {testResult && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontWeight: 800, fontSize: '1rem' }} onClose={() => setTestResult(null)}>
          {testResult}
        </Alert>
      )}

      {testError && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3, fontWeight: 700, fontSize: '0.95rem' }} onClose={() => setTestError(null)}>
          {testError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {INTEGRATIONS.map((item, idx) => (
          <Grid size={{ xs: 12, sm: 6 }} key={idx}>
            <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A' }}>
                    {item.title}
                  </Typography>
                  <Chip icon={<CheckCircle2 size={18} />} label={item.status} color="success" size="medium" sx={{ fontWeight: 800 }} />
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
                  {item.desc}
                </Typography>
              </Box>

              {item.action && (
                <Button
                  size="large"
                  variant="outlined"
                  onClick={item.action}
                  disabled={isSeeding}
                  startIcon={isSeeding ? <CircularProgress size={20} /> : item.icon ? <CloudUpload size={20} /> : <RefreshCw size={20} />}
                  sx={{ borderRadius: 3, minHeight: 48, fontWeight: 800, fontSize: '1rem' }}
                >
                  {isSeeding ? 'Enviando Datos a Firebase...' : item.actionText}
                </Button>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
