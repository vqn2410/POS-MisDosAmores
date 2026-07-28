import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { Eye, Sun, Moon, Sparkles, RefreshCw, ZoomIn } from 'lucide-react';
import { useAccessibilityStore, type FontSizeOption, type UIScaleOption } from '../../store/useAccessibilityStore';

export const AccessibilityView: React.FC = () => {
  const {
    fontSize,
    setFontSize,
    uiScale,
    setUiScale,
    highContrast,
    setHighContrast,
    largeButtons,
    setLargeButtons,
    largeIcons,
    setLargeIcons,
    reduceAnimations,
    setReduceAnimations,
    themeMode,
    setThemeMode,
    resetDefaults,
  } = useAccessibilityStore();

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            ♿ Centro de Accesibilidad & Ajustes de Legibilidad (WCAG 2.2 AA)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personaliza el tamaño de letra, contraste, botones e interfaz para reducir fatiga y errores
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={resetDefaults}
          sx={{ borderRadius: 2.5, fontWeight: 700, minHeight: 44 }}
        >
          Restablecer
        </Button>
      </Box>

      <Alert severity="info" icon={<Eye size={20} />} sx={{ mb: 3, borderRadius: 3 }}>
        Tus preferencias se guardan automáticamente por usuario y se aplican en todas tus sesiones.
      </Alert>

      <Grid container spacing={3}>
        {/* Tipografía y Escala */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ZoomIn size={22} color="#2563EB" /> Tamaño de Fuente y Escala
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Tamaño mínimo de texto base:
              </Typography>
              <Select
                fullWidth
                size="small"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as FontSizeOption)}
                sx={{ borderRadius: 2.5, height: 48, fontSize: '1rem', fontWeight: 600 }}
              >
                <MenuItem value="16px">16px (Estándar recomendado)</MenuItem>
                <MenuItem value="18px">18px (Grande)</MenuItem>
                <MenuItem value="20px">20px (Muy Grande / Alta Visibilidad)</MenuItem>
              </Select>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Escala global de la interfaz (Zoom):
              </Typography>
              <Select
                fullWidth
                size="small"
                value={uiScale}
                onChange={(e) => setUiScale(Number(e.target.value) as UIScaleOption)}
                sx={{ borderRadius: 2.5, height: 48, fontSize: '1rem', fontWeight: 600 }}
              >
                <MenuItem value={100}>100% (Escala normal)</MenuItem>
                <MenuItem value={125}>125% (Ampliación mediana)</MenuItem>
                <MenuItem value={150}>150% (Ampliación máxima)</MenuItem>
              </Select>
            </Box>
          </Paper>
        </Grid>

        {/* Tema & Contraste */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sun size={22} color="#D97706" /> Color, Tema y Contraste
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={themeMode === 'dark'}
                    onChange={(e) => setThemeMode(e.target.checked ? 'dark' : 'light')}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {themeMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      Modo Oscuro (Por defecto: Tema Claro)
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    Alto Contraste para Baja Visión
                  </Typography>
                }
              />
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={reduceAnimations}
                    onChange={(e) => setReduceAnimations(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    Reducir Animaciones y Transiciones
                  </Typography>
                }
              />
            </Box>
          </Paper>
        </Grid>

        {/* Botones e Íconos Gigantes */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sparkles size={22} color="#16A34A" /> Botones y Áreas de Clic
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={largeButtons}
                      onChange={(e) => setLargeButtons(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      Botones Gigantes ($\ge$ 48px de alto)
                    </Typography>
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={largeIcons}
                      onChange={(e) => setLargeIcons(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      Íconos Grandes junto al texto
                    </Typography>
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
