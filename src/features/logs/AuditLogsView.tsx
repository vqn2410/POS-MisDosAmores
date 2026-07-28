import React from 'react';
import { Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { History } from 'lucide-react';
import { ArcaLogger } from '../../arca/logs/ArcaLogger';

export const AuditLogsView: React.FC = () => {
  const logs = ArcaLogger.getLogs();

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <History size={28} color="#2563EB" />
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
          Logs de Auditoría (ARCA)
        </Typography>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid #E2E8F0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Nivel</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Servicio</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Acción</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Mensaje</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No hay logs registrados aún.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              [...logs].reverse().map((log, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Chip
                      label={log.level.toUpperCase()}
                      color={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info'}
                      size="small"
                      sx={{ fontWeight: 800, minWidth: 64 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{log.service}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{log.action}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{log.message}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{new Date(log.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};
