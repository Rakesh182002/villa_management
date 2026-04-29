import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress,
  Chip, Avatar, Divider, Grid, IconButton, Stack, Card,
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  CameraAlt as CameraAltIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  LocalShipping as DeliveryIcon,
  Shield as ShieldIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { visitorAPI, staffAPI } from '../../services/api';
import { getSocket } from '../../services/api';
import { format, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Premium Tokens ── */
const C = {
  primary: '#4f46e5',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  indigo: '#6366f1',
  slate: '#1e293b',
  gray: '#64748b',
  light: '#f8fafc',
};

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
};

const cardHover = {
  transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }
};

const STAFF_TYPE_COLOR = {
  maid: '#7c3aed', cook: '#f59e0b', driver: '#3b82f6',
  gardener: '#10b981', security: '#ef4444', babysitter: '#ec4899', other: '#64748b',
};

/* ── Helper: format duration ── */
function fmtDur(mins) {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ── Stat Cell ── */
function StatCell({ label, value, color, icon: Icon }) {
  return (
    <Box sx={{
      flex: 1, p: 2,
      bgcolor: `${color}08`, borderRadius: 3,
      border: `1px solid ${color}15`,
      display: 'flex', flexDirection: 'column', gap: 0.5
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {Icon && <Icon sx={{ fontSize: 12, color: C.gray }} />}
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: C.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, color }}>
        {value}
      </Typography>
    </Box>
  );
}

/* ═══════════════════ VISITOR RESULT ═══════════════════ */
function VisitorResult({ data, onEntry, onExit, onReset }) {
  const sc = data.status === 'approved' ? C.success
    : data.status === 'entered' ? C.indigo
      : data.status === 'exited' ? C.gray
        : C.warning;

  const entry = data.actual_entry || data.created_at;
  const exit = data.actual_exit;
  const elapsed = data.status === 'entered' && entry
    ? differenceInMinutes(new Date(), new Date(entry)) : null;
  const total = entry && exit
    ? differenceInMinutes(new Date(exit), new Date(entry)) : null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Paper variant="outlined" sx={{ ...glassStyle, borderRadius: 5, overflow: 'hidden', border: `2px solid ${sc}40` }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: `${sc}10`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeliveryIcon sx={{ fontSize: 18, color: sc }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: sc, letterSpacing: 1 }}>VISITOR SCAN</Typography>
          </Box>
          <Chip label={data.status.toUpperCase()} size="small" sx={{ fontWeight: 900, fontSize: '0.65rem', bgcolor: sc, color: 'white' }} />
        </Box>

        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Avatar sx={{ width: 70, height: 70, bgcolor: `${sc}15`, color: sc, fontWeight: 900, fontSize: '1.8rem', border: `3px solid ${sc}20` }}>
              {data.visitor_name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={900} sx={{ color: C.slate }}>{data.visitor_name}</Typography>
              <Typography variant="body2" sx={{ color: C.gray, fontWeight: 700 }}>{data.visitor_phone}</Typography>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: `${C.primary}10` }}><PersonIcon sx={{ fontSize: 16, color: C.primary }} /></Box>
                  <Typography variant="body2" sx={{ color: C.gray }}>Visiting: <strong>{data.resident_name}</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: `${C.primary}10` }}><HomeIcon sx={{ fontSize: 16, color: C.primary }} /></Box>
                  <Typography variant="body2" sx={{ color: C.gray }}>Apt: <strong>{data.apartment_number}</strong></Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f1f5f9', height: '100%' }}>
                <Typography variant="caption" sx={{ color: C.gray, fontWeight: 800, display: 'block', mb: 0.5 }}>PURPOSE</Typography>
                <Typography variant="body2" fontWeight={800} sx={{ color: C.slate }}>{data.purpose}</Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 1.5, mb: 4 }}>
            <StatCell label="In" value={entry ? format(new Date(entry), 'hh:mm a') : '—'} color={C.success} icon={AccessTimeIcon} />
            <StatCell label="Out" value={exit ? format(new Date(exit), 'hh:mm a') : 'ACTIVE'} color={C.danger} icon={AccessTimeIcon} />
            <StatCell label="Time" value={total !== null ? fmtDur(total) : elapsed !== null ? fmtDur(elapsed) : '—'} color={C.indigo} icon={AccessTimeIcon} />
          </Box>

          <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />

          <Stack direction="row" spacing={2}>
            {data.status === 'approved' && (
              <Button fullWidth variant="contained" disableElevation startIcon={<LoginIcon />} onClick={onEntry}
                sx={{ borderRadius: 3, fontWeight: 900, py: 1.8, bgcolor: C.success, '&:hover': { bgcolor: '#059669' }, flex: 2 }}>
                Confirm Entry
              </Button>
            )}
            {data.status === 'entered' && (
              <Button fullWidth variant="contained" disableElevation startIcon={<LogoutIcon />} onClick={onExit}
                sx={{ borderRadius: 3, fontWeight: 900, py: 1.8, bgcolor: C.danger, '&:hover': { bgcolor: '#b91c1c' }, flex: 2 }}>
                Confirm Exit
              </Button>
            )}
            <Button variant="outlined" onClick={onReset} sx={{ borderRadius: 3, fontWeight: 800, borderColor: '#e2e8f0', color: C.gray, flex: 1 }}>
              Reset
            </Button>
          </Stack>
        </Box>
      </Paper>
    </motion.div>
  );
}

/* ═══════════════════ STAFF RESULT ═══════════════════ */
function StaffResult({ staff, scannedRaw, insideStaff, onCheckIn, onCheckOut, onReset, submitting }) {
  const inside = insideStaff.find(s => s.staff_id === (scannedRaw?.staff_id || staff?.id));
  const typeCol = STAFF_TYPE_COLOR[staff?.staff_type] || C.gray;
  const statusCol = inside ? C.success : typeCol;
  const mins = inside?.duration_minutes
    ?? (inside?.society_entry ? differenceInMinutes(new Date(), new Date(inside.society_entry)) : null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Paper variant="outlined" sx={{ ...glassStyle, borderRadius: 5, overflow: 'hidden', border: `2px solid ${statusCol}40` }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: `${statusCol}10`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon sx={{ fontSize: 18, color: statusCol }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: statusCol, letterSpacing: 1 }}>STAFF SCAN</Typography>
          </Box>
          <Chip label={inside ? 'INSIDE' : 'OUTSIDE'} size="small" sx={{ fontWeight: 900, fontSize: '0.65rem', bgcolor: statusCol, color: 'white' }} />
        </Box>

        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar src={staff?.photo_url} sx={{ width: 70, height: 70, borderRadius: 3, border: `3px solid ${typeCol}20`, bgcolor: `${typeCol}10`, color: typeCol, fontSize: '1.8rem', fontWeight: 900 }}>
                {staff?.full_name?.[0]}
              </Avatar>
              {inside && (
                <Box sx={{ position: 'absolute', bottom: -5, right: -5, width: 20, height: 20, borderRadius: '50%', bgcolor: C.success, border: '3px solid white', boxShadow: `0 0 10px ${C.success}50` }} />
              )}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={900} sx={{ color: C.slate }}>{staff?.full_name}</Typography>
              <Chip label={staff?.staff_type?.toUpperCase()} size="small" sx={{ fontWeight: 800, fontSize: '0.6rem', mt: 0.5, bgcolor: `${typeCol}15`, color: typeCol }} />
            </Box>
          </Box>

          <Stack spacing={2} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
              <ShieldIcon sx={{ color: C.indigo }} />
              <Box>
                <Typography variant="caption" sx={{ color: C.gray, fontWeight: 800 }}>IDENTITY OK</Typography>
                <Typography variant="body2" fontWeight={800} sx={{ color: C.slate }}>{staff?.phone || 'NO PHONE'}</Typography>
              </Box>
            </Box>
          </Stack>

          {inside && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 4 }}>
              <StatCell label="Checked In" value={inside.society_entry ? format(new Date(inside.society_entry), 'hh:mm a') : '—'} color={C.success} icon={AccessTimeIcon} />
              <StatCell label="Status" value="ACTIVE" color={C.indigo} icon={ShieldIcon} />
              <StatCell label="Elapsed" value={fmtDur(mins)} color={C.warning} icon={AccessTimeIcon} />
            </Box>
          )}

          <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />

          <Stack direction="row" spacing={2}>
            {!inside ? (
              <Button fullWidth variant="contained" disableElevation
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
                onClick={onCheckIn} disabled={submitting}
                sx={{ borderRadius: 3, fontWeight: 900, py: 1.8, bgcolor: C.success, '&:hover': { bgcolor: '#059669' }, flex: 2 }}>
                {submitting ? 'Clocking In...' : 'Confirm Clock In'}
              </Button>
            ) : (
              <Button fullWidth variant="contained" disableElevation startIcon={<LogoutIcon />}
                onClick={() => onCheckOut(inside.id, staff?.full_name)}
                sx={{ borderRadius: 3, fontWeight: 900, py: 1.8, bgcolor: C.danger, '&:hover': { bgcolor: '#b91c1c' }, flex: 2 }}>
                Confirm Clock Out
              </Button>
            )}
            <Button variant="outlined" onClick={onReset} sx={{ borderRadius: 3, fontWeight: 800, borderColor: '#e2e8f0', color: C.gray, flex: 1 }}>
              Reset
            </Button>
          </Stack>
        </Box>
      </Paper>
    </motion.div>
  );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */
export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resultType, setResultType] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [staff, setStaff] = useState(null);
  const [scannedRaw, setScannedRaw] = useState(null);
  const [insideStaff, setInsideStaff] = useState([]);

  const scannerRef = useRef(null);

  const fetchInside = useCallback(async () => {
    try {
      const r = await staffAPI.getInside();
      setInsideStaff(r.data.data || []);
    } catch { toast.error('Failed to update traffic logs'); }
  }, []);

  useEffect(() => {
    fetchInside();
    const socket = getSocket();
    socket.on('staff:entered', fetchInside);
    socket.on('staff:exited', fetchInside);
    return () => {
      socket.off('staff:entered');
      socket.off('staff:exited');
    };
  }, [fetchInside]);

  const startScanner = useCallback(() => {
    setError(null);
    setScanning(true);
    setTimeout(() => {
      const s = new Html5QrcodeScanner('unified-qr-reader', { fps: 15, qrbox: { width: 280, height: 280 } }, false);
      s.render(onScanSuccess, () => { });
      scannerRef.current = s;
    }, 150);
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => { });
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const onScanSuccess = async (text) => {
    stopScanner();
    setLoading(true);
    try {
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { }

      if (parsed && parsed.staff_id && parsed.pass_code) {
        const res = await staffAPI.getAll();
        const found = (res.data.data || []).find(s => s.id === parsed.staff_id);
        if (!found) throw new Error('Personnel ID not found in master roster');

        const resolvedResidentId = (parsed.resident_id != null && parsed.resident_id !== 0)
          ? parsed.resident_id : (found.resident_id ?? null);

        setScannedRaw({ ...parsed, resident_id: resolvedResidentId });
        setStaff(found);
        setResultType('staff');
      } else {
        const code = (parsed && parsed.code) ? parsed.code : text;
        const res = await visitorAPI.verify(code);
        setVisitor(res.data.data);
        setResultType('visitor');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or unrecognized QR token');
    } finally {
      setLoading(false);
    }
  };

  const reset = useCallback(() => {
    setVisitor(null); setStaff(null); setScannedRaw(null); setResultType(null); setError(null);
  }, []);

  const handleVisitorEntry = async () => {
    try {
      await visitorAPI.markEntry(visitor.id);
      setVisitor(v => ({ ...v, status: 'entered', actual_entry: new Date().toISOString() }));
      toast.success(`${visitor.visitor_name} checked in!`);
    } catch { toast.error('Entry failed'); }
  };

  const handleVisitorExit = async () => {
    try {
      await visitorAPI.markExit(visitor.id);
      setVisitor(v => ({ ...v, status: 'exited', actual_exit: new Date().toISOString() }));
      toast.success(`${visitor.visitor_name} checked out!`);
    } catch { toast.error('Exit failed'); }
  };

  const handleStaffCheckIn = async () => {
    if (!scannedRaw) return;
    setSubmitting(true);
    try {
      await staffAPI.markEntry(scannedRaw.staff_id, scannedRaw.resident_id, scannedRaw.pass_code);
      toast.success('Personnel check-in recorded');
      await fetchInside();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setSubmitting(false); }
  };

  const handleStaffCheckOut = async (attendanceId, name) => {
    try {
      await staffAPI.markExit(attendanceId);
      toast.success(`${name} checked out`);
      await fetchInside();
    } catch { toast.error('Check-out failed'); }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Toaster position="top-right" />

      {/* Hero Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ color: C.slate, letterSpacing: -1 }}>
            Gate Guard Terminal
          </Typography>
          <Typography variant="body1" fontWeight={600} color="text.secondary">
            Unified QR Processing & Traffic Monitoring
          </Typography>
        </Box>
        <IconButton onClick={fetchInside} sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <AnimatePresence mode="wait">
        {/* Ready State */}
        {!scanning && !resultType && !error && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Paper sx={{ ...glassStyle, borderRadius: 5, overflow: 'hidden', p: 5, textAlign: 'center' }} elevation={0}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
                <Box sx={{ p: 2, borderRadius: 4, bgcolor: `${C.success}10`, border: `1px solid ${C.success}20` }}>
                  <PersonIcon sx={{ color: C.success }} />
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 900, mt: 1 }}>VISITOR</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 4, bgcolor: `${C.indigo}10`, border: `1px solid ${C.indigo}20` }}>
                  <WorkIcon sx={{ color: C.indigo }} />
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 900, mt: 1 }}>STAFF</Typography>
                </Box>
              </Box>
              
              <Box sx={{ 
                width: 100, height: 100, borderRadius: '50%', mx: 'auto', mb: 4, 
                bgcolor: `${C.indigo}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 40px ${C.indigo}30`
              }}>
                <QrCodeScannerIcon sx={{ fontSize: 48, color: C.indigo }} />
              </Box>
              
              <Typography variant="h5" fontWeight={900} gutterBottom>Unified Scanner</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto', fontWeight: 500 }}>
                Point the camera at any system-generated QR code to instantly verify identity and record entry/exit.
              </Typography>
              
              <Button 
                variant="contained" 
                disableElevation 
                size="large" 
                startIcon={<CameraAltIcon />}
                onClick={startScanner}
                sx={{ 
                  borderRadius: 4, px: 6, py: 2, fontWeight: 900, fontSize: '1.1rem',
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.primary})`,
                  boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)'
                }}
              >
                Activate Scanner
              </Button>
            </Paper>

            {/* Currently Inside Grid */}
            <Box sx={{ mt: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: C.success, boxShadow: `0 0 10px ${C.success}` }} />
                  <Typography variant="h6" fontWeight={900}>People Inside</Typography>
                </Box>
                <Chip label={`${insideStaff.length} WORKING`} sx={{ fontWeight: 900, bgcolor: C.slate, color: 'white' }} />
              </Box>

              {insideStaff.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4, borderStyle: 'dashed', bgcolor: 'transparent' }}>
                  <Typography variant="body1" fontWeight={600} color="text.secondary">No personnel currently logged inside the premises.</Typography>
                </Paper>
              ) : (
                <Grid container spacing={1.5}>
                  {insideStaff.map((s) => (
                    <Grid item xs={12} sm={6} md={4} key={s.id}>
                      <Card sx={{ ...glassStyle, ...cardHover, p: 1.5, borderRadius: 3, border: `1px solid ${C.success}20` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Avatar src={s.photo_url} sx={{ borderRadius: 1.5, width: 36, height: 36, border: `1px solid ${C.success}30` }}>{s.staff_name?.[0]}</Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={900} noWrap sx={{ fontSize: '0.85rem' }}>{s.staff_name}</Typography>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem' }}>
                              {s.staff_type} • Unit {s.apartment_number || 'GEN'}
                            </Typography>
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 12, color: C.gray }} />
                            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {format(new Date(s.society_entry), 'hh:mm a')}
                            </Typography>
                          </Box>
                          <Chip label={fmtDur(s.duration_minutes)} size="small" sx={{ fontWeight: 900, fontSize: '0.65rem', height: 18, bgcolor: `${C.primary}10`, color: C.primary }} />
                        </Box>
                        <Button 
                          fullWidth size="small" variant="outlined" color="error" 
                          onClick={() => handleStaffCheckOut(s.id, s.staff_name)}
                          sx={{ borderRadius: 1.5, fontWeight: 800, fontSize: '0.7rem', py: 0.2 }}
                        >
                          Manual Exit
                        </Button>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </motion.div>
        )}

        {/* Scanner View */}
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ ...glassStyle, borderRadius: 5, overflow: 'hidden' }}>
              <Box sx={{ p: 3, bgcolor: `${C.indigo}10`, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={900} color={C.indigo}>Awaiting QR Signal...</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box id="unified-qr-reader" sx={{ width: '100%', maxWidth: 450, mx: 'auto', borderRadius: 4, overflow: 'hidden' }} />
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Button variant="outlined" color="error" size="large" onClick={stopScanner} sx={{ borderRadius: 3, fontWeight: 800, px: 5 }}>
                    Cancel Scan
                  </Button>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        )}

        {/* Loading / Processing */}
        {loading && (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: C.indigo }} />
            <Typography variant="h6" fontWeight={900}>Authenticating Token...</Typography>
            <Typography variant="body2" color="text.secondary">Accessing central registry for verification</Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 5, border: `2px solid ${C.danger}30`, bgcolor: `${C.danger}05` }}>
              <ErrorIcon sx={{ fontSize: 60, color: C.danger, mb: 2 }} />
              <Typography variant="h5" fontWeight={900} color={C.danger} gutterBottom>Access Denied</Typography>
              <Typography variant="body1" sx={{ mb: 4, fontWeight: 600 }}>{error}</Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="contained" disableElevation onClick={() => { setError(null); startScanner(); }} sx={{ borderRadius: 3, bgcolor: C.danger, fontWeight: 900, px: 4 }}>
                  Retry Scan
                </Button>
                <Button variant="outlined" onClick={reset} sx={{ borderRadius: 3, fontWeight: 800, px: 4, borderColor: C.danger, color: C.danger }}>
                  Reset
                </Button>
              </Stack>
            </Paper>
          </motion.div>
        )}

        {/* Results */}
        {resultType === 'visitor' && visitor && (
          <VisitorResult data={visitor} onEntry={handleVisitorEntry} onExit={handleVisitorExit} onReset={reset} />
        )}
        {resultType === 'staff' && staff && (
          <StaffResult staff={staff} scannedRaw={scannedRaw} insideStaff={insideStaff} onCheckIn={handleStaffCheckIn} onCheckOut={handleStaffCheckOut} onReset={reset} submitting={submitting} />
        )}
      </AnimatePresence>

      {resultType && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button startIcon={<ArrowIcon sx={{ transform: 'rotate(180deg)' }} />} onClick={reset} sx={{ fontWeight: 800, color: C.gray }}>
            Back to Dashboard
          </Button>
        </Box>
      )}
    </Box>
  );
}