import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { motion } from 'framer-motion';

const PageHeader = ({ title, subtitle, breadcrumbs, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 4,
      }}
    >
      <Box>
        {breadcrumbs && (
          <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 1 }}>
            {breadcrumbs.map((crumb, i) =>
              crumb.href ? (
                <Link key={i} underline="hover" color="inherit" href={crumb.href} sx={{ fontSize: '0.8rem' }}>
                  {crumb.label}
                </Link>
              ) : (
                <Typography key={i} color="text.primary" sx={{ fontSize: '0.8rem' }}>
                  {crumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h4" fontWeight="bold" gutterBottom={!!subtitle}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
    </Box>
  </motion.div>
);

export default PageHeader;