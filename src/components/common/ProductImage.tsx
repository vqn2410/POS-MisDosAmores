import React from 'react';
import { Box, Avatar } from '@mui/material';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt?: string;
  size?: number;       // px — used for Avatar variant
  height?: number;     // px — used for Card/grid variant (full-width)
  variant?: 'avatar' | 'card';
  borderRadius?: number;
}

/**
 * ProductImage
 * Displays a product image (Avatar or full-card) with a clean fallback
 * icon (Package / box) when no imageUrl is provided or the image fails to load.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Producto',
  size = 44,
  height = 120,
  variant = 'avatar',
  borderRadius = 2.5,
}) => {
  const [error, setError] = React.useState(false);
  const showFallback = !src || src.trim() === '' || error;

  // ── Avatar variant (small square in tables / lists) ───────────────────────
  if (variant === 'avatar') {
    if (showFallback) {
      return (
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius,
            bgcolor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Package size={Math.round(size * 0.5)} color="#94A3B8" />
        </Box>
      );
    }
    return (
      <Avatar
        src={src}
        alt={alt}
        variant="rounded"
        onError={() => setError(true)}
        sx={{ width: size, height: size, borderRadius }}
      />
    );
  }

  // ── Card variant (full-width image in product grid cards) ─────────────────
  if (showFallback) {
    return (
      <Box
        sx={{
          height,
          bgcolor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <Package size={48} color="#CBD5E1" />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setError(true)}
      sx={{
        width: '100%',
        height,
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
};
