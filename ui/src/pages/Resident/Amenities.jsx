import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, Grid, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress, Tabs, Tab, Divider, Avatar, 
  Tooltip, Paper, Rating, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, Stack
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Pool as PoolIcon,
  SportsTennis as SportsTennisIcon,
  MeetingRoom as MeetingRoomIcon,
  AccessTime as AccessTimeIcon,
  SportsCricket as SportsCricketIcon,
  SportsSoccer as SportsSoccerIcon,
  DirectionsRun as DirectionsRunIcon,
  Park as ParkIcon,
  ChildCare as ChildCareIcon,
  Celebration as CelebrationIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  LocalParking as LocalParkingIcon,
  ElectricCar as ElectricCarIcon,
  SelfImprovement as SelfImprovementIcon,
  SportsBasketball as SportsBasketballIcon,
  People as PeopleIcon,
  Cancel as CancelIcon,
  QrCode2 as QrCodeIcon,
  ContentCopy as ContentCopyIcon,
  Search,
  CloseOutlined as CloseOutlinedIcon,
  FiberManualRecord
} from '@mui/icons-material';
import { useFormik } from 'formik';
import { format, isToday, isBefore, isAfter, addDays, startOfDay } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react'; 
import { amenityAPI } from '../../services/api';
import socketService from '../../services/socket';
import { motion, AnimatePresence } from 'framer-motion';

const AMENITY_ICONS = {
  Clubhouse: <MeetingRoomIcon />,
  Gym: <FitnessCenterIcon />,
  'Swimming Pool': <PoolIcon />,
  'Tennis Court': <SportsTennisIcon />,
  'Badminton Court': <SportsTennisIcon />,
  'Basketball Court': <SportsBasketballIcon />,
  'Cricket Ground': <SportsCricketIcon />,
  'Football Ground': <SportsSoccerIcon />,
  'Jogging Track': <DirectionsRunIcon />,
  'Garden / Park': <ParkIcon />,
  'Children Play Area': <ChildCareIcon />,
  'Party Hall': <CelebrationIcon />,
  'BBQ Area': <LocalFireDepartmentIcon />,
  'Parking': <LocalParkingIcon />,
  'EV Charging Station': <ElectricCarIcon />,
  'Yoga Room': <SelfImprovementIcon />,
};

const AMENITY_COLORS = {
  Clubhouse: '#8b5cf6',
  Gym: '#3b82f6',
  'Swimming Pool': '#06b6d4',
  'Tennis Court': '#22c55e',
  'Badminton Court': '#f59e0b',
  'Basketball Court': '#ef4444',
  'Cricket Ground': '#16a34a',
  'Football Ground': '#0ea5e9',
  'Jogging Track': '#84cc16',
  'Garden / Park': '#4ade80',
  'Children Play Area': '#f97316',
  'Party Hall': '#ec4899',
  'BBQ Area': '#dc2626',
  'Parking': '#6b7280',
  'EV Charging Station': '#10b981',
  'Yoga Room': '#a855f7',
};

const COLORS = {
  primary: '#7197efff',
  secondary: '#64748b',
  background: '#f8fafc'
};

export default function Amenities() {
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [tab, setTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);

  const [passOpen, setPassOpen] = useState(false);
  const [activeBookingForPass, setActiveBookingForPass] = useState(null);
  
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [bookingForFeedback, setBookingForFeedback] = useState(null);
  const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: '' });

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelRemark, setCancelRemark] = useState('');

  const [dateStrip, setDateStrip] = useState([]);

  useEffect(() => {
    const dates = [];
    for (let i = 0; i < 14; i++) dates.push(addDays(startOfDay(new Date()), i));
    setDateStrip(dates);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [ameRes, bokRes] = await Promise.all([
        amenityAPI.getAll(),
        amenityAPI.getMyBookings()
      ]);
      setAmenities(ameRes.data.data);
      setBookings(bokRes.data.data);
    } catch { toast.error('Check server status'); }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
    const refresh = () => {
        fetchData();
        if (bookingOpen && selectedAmenity) updateAvailability(formik.values.booking_date);
    };
    socketService.on('amenity:booked', refresh);
    socketService.on('amenity:cancelled', refresh);
    socketService.on('amenity:status_updated', refresh);
    return () => {
      socketService.off('amenity:booked', refresh);
      socketService.off('amenity:cancelled', refresh);
      socketService.off('amenity:status_updated', refresh);
    };
  }, [fetchData, bookingOpen, selectedAmenity]);

  const generateTimeSlots = (amenity, date, bookedSlots) => {
    const startHour = parseInt(amenity.opening_time?.split(':')[0] || '6');
    const endHour = parseInt(amenity.closing_time?.split(':')[0] || '22');
    const slots = [];
    const now = new Date();
    const targetDate = new Date(date);

    for (let h = startHour; h < endHour; h++) {
      const slotStart = `${h.toString().padStart(2, '0')}:00`;
      const slotStartTime = new Date(`${date}T${slotStart}`);
      const isPast = isToday(targetDate) && isBefore(slotStartTime, now);
      const isBooked = bookedSlots.some(s => {
          const sH = parseInt(s.start_time?.split(':')[0]);
          const eH = parseInt(s.end_time?.split(':')[0]);
          return h >= sH && h < eH;
      });

      slots.push({ start: slotStart, end: `${(h + 1).toString().padStart(2, '0')}:00`, hour: h, isPast, isFull: isBooked });
    }
    return slots;
  };

  const handleSlotToggle = (slot) => {
    if (slot.isPast || slot.isFull) return;
    setSelectedSlots(prev => {
      const isSelected = prev.find(s => s.start === slot.start);
      if (isSelected) return prev.filter(s => s.start !== slot.start);
      const newSelection = [...prev, slot].sort((a, b) => a.hour - b.hour);
      if (newSelection.length > 1) {
        if (newSelection[newSelection.length - 1].hour - newSelection[0].hour + 1 !== newSelection.length) {
            toast.error('Please select continuous hours');
            return prev;
        }
      }
      return newSelection;
    });
  };

  const formik = useFormik({
    initialValues: { booking_date: format(new Date(), 'yyyy-MM-dd') },
    onSubmit: async (values, { resetForm }) => {
      if (selectedSlots.length === 0) return toast.error('Pick hours');
      const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
      try {
        await amenityAPI.book(selectedAmenity.id, { 
          booking_date: values.booking_date,
          start_time: sorted[0].start,
          end_time: sorted[sorted.length - 1].end,
          duration_hours: sorted.length,
          total_amount: selectedAmenity.price_per_hour * sorted.length
        });
        fetchData();
        setBookingOpen(false);
        resetForm();
        setSelectedSlots([]);
        toast.success('Booked!');
      } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    },
  });

  const updateAvailability = async (date, amenityObj = null) => {
    const target = amenityObj || selectedAmenity;
    if (!target) return;
    setCheckingAvailability(true);
    setSelectedSlots([]);
    try {
      const res = await amenityAPI.getAvailability(target.id, date);
      setAvailableSlots(generateTimeSlots(target, date, res.data.data.booked_slots || []));
    } catch { toast.error('Sync fail'); }
    finally { setCheckingAvailability(false); }
  };

  const handleOpenBooking = (amenity) => {
    setSelectedAmenity(amenity);
    setBookingOpen(true);
    updateAvailability(formik.values.booking_date, amenity);
  };

  const handleCancelBooking = async () => {
    if (!cancelRemark.trim()) return toast.error('Reason required');
    try {
      await amenityAPI.cancel(bookingToCancel.id, cancelRemark);
      toast.success('Cancelled');
      setCancelDialogOpen(false);
      setCancelRemark('');
      fetchData();
    } catch { toast.error('Error'); }
  };

  const handleSubmitFeedback = async () => {
    try {
        await amenityAPI.submitFeedback(bookingForFeedback.id, {
            rating: feedbackData.rating,
            feedback: feedbackData.comment
        });
        toast.success('Feedback saved');
        setFeedbackOpen(false);
        setFeedbackData({ rating: 5, comment: '' });
        fetchData();
    } catch { toast.error('Submit fail'); }
  }

  const getStatus = (b) => {
    if (b.status === 'cancelled' || b.status === 'rejected') return b.status;
    const end = new Date(`${format(new Date(b.booking_date), 'yyyy-MM-dd')}T${b.end_time}`);
    if (isBefore(end, new Date())) return 'completed';
    return b.status || 'confirmed';
  };

  const active = bookings.filter(b => getStatus(b) === 'confirmed');
  const past = bookings.filter(b => getStatus(b) === 'completed');
  const cancelled = bookings.filter(b => getStatus(b) === 'cancelled' || getStatus(b) === 'rejected');
  const filteredAmenities = amenities.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
          <CircularProgress sx={{ color: COLORS.primary }} size={40} thickness={5} />
          <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 1.5 }}>SYNCHRONIZING FACILITIES...</Typography>
      </Box>
  );

  return (
    <Box>
      <Toaster position="top-right" />
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={900} color="black">Amenities Booking</Typography>
        <TextField placeholder="Search facilities..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 2 }} elevation={0}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="FACILITIES" sx={{ fontWeight: 800 }} />
            <Tab label={`ACTIVE (${active.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`COMPLETED (${past.length})`} sx={{ fontWeight: 800 }} />
            <Tab label={`CANCELLED (${cancelled.length})`} sx={{ fontWeight: 800 }} />
          </Tabs>
      </Paper>

      <AnimatePresence mode="wait">
        {tab === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Grid container spacing={2}>
              {filteredAmenities.map((a) => {
                const accent = AMENITY_COLORS[a.name] || COLORS.secondary;
                return (
                  <Grid item xs={12} sm={6} md={4} key={a.id}>
                    <Card variant="outlined" sx={{ borderRadius: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                         <Avatar sx={{ bgcolor: `${accent}15`, color: accent, borderRadius: 2 }}>{AMENITY_ICONS[a.name]}</Avatar>
                         <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={800}>{a.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>{a.description}</Typography>
                         </Box>
                      </Box>
                      <Divider />
                      <Box sx={{ p: 1.5, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: COLORS.background }}>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: COLORS.secondary }} />
                            <Typography variant="caption" fontWeight={700}>{a.opening_time?.slice(0,5)} - {a.closing_time?.slice(0,5)}</Typography>
                         </Box>
                         <Typography variant="subtitle2" fontWeight={800} color={COLORS.primary}>₹{a.price_per_hour}/hr</Typography>
                      </Box>
                      <Box sx={{ px: 2, py: 0.8, bgcolor: COLORS.background, display: 'flex', alignItems: 'center', gap: 1 }}>
                         <PeopleIcon sx={{ fontSize: 13, color: COLORS.secondary }} />
                         <Typography variant="caption" fontWeight={700} color="text.secondary">{a.capacity} Members Limit</Typography>
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                         <Button fullWidth variant="contained" disableElevation onClick={() => handleOpenBooking(a)} sx={{ bgcolor: COLORS.primary, borderRadius: 2, fontWeight: 800, textTransform: 'none' }}>Check Slots</Button>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
               {filteredAmenities.length === 0 && <Box sx={{ width: '100%', textAlign: 'center',py:10 }}><Typography color="text.secondary" fontWeight={700}>No amenities found</Typography></Box>}
                
            </Grid>
          </motion.div>
        )}

        {tab === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Grid container spacing={2}>
                    {active.map(b => (
                        <Grid item xs={12} md={6} key={b.id}>
                            <Card variant="outlined" sx={{ borderRadius: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: COLORS.background, color: COLORS.primary }}>{AMENITY_ICONS[b.amenity_name]}</Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>{b.amenity_name}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{format(new Date(b.booking_date), 'EEEE, MMM do')}</Typography>
                                    <Typography variant="caption" fontWeight={700}>{b.start_time?.slice(0,5)} - {b.end_time?.slice(0,5)}</Typography>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    {isToday(new Date(b.booking_date)) && (
                                        <IconButton size="small" sx={{ border: '1px solid #eee' }} onClick={() => { setActiveBookingForPass(b); setPassOpen(true); }}>
                                            <Tooltip title="Scan this QR code to check-in"><QrCodeIcon fontSize="small" /></Tooltip>
                                        </IconButton>
                                    )}
                                    {isAfter(new Date(`${format(new Date(b.booking_date), 'yyyy-MM-dd')}T${b.start_time}`), new Date()) && (
                                        <IconButton size="small" color="error" sx={{ border: '1px solid #fee2e2' }} onClick={() => { setBookingToCancel(b); setCancelDialogOpen(true); }}>
                                            <Tooltip title="Cancel booking"><CancelIcon fontSize="small" /></Tooltip>
                                        </IconButton>
                                    )}
                                </Stack>
                            </Card>
                        </Grid>
                    ))}
                    {active.length === 0 && <Box sx={{ width: '100%', textAlign: 'center',py:10 }}><Typography color="text.secondary" fontWeight={700}>No active reservations</Typography></Box>}
                </Grid>
            </motion.div>
        )}

        {tab === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: COLORS.background }}>
                            <TableRow><TableCell sx={{ fontWeight: 800 }}>Amenity</TableCell><TableCell sx={{ fontWeight: 800 }}>Date</TableCell><TableCell sx={{ fontWeight: 800 }}>Rating</TableCell><TableCell sx={{ fontWeight: 800 }} align="right">Feedback</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {past.map(b => (
                                <TableRow key={b.id}>
                                    <TableCell sx={{ fontWeight: 700 }}>{b.amenity_name}</TableCell>
                                    <TableCell><Typography variant="caption" fontWeight={700}>{format(new Date(b.booking_date), 'MMM do')}</Typography></TableCell>
                                    <TableCell><Rating value={b.rating || 0} readOnly size="small" /></TableCell>
                                    <TableCell align="right">
                                        {!b.rating ? (
                                            <Button size="small" variant="outlined" onClick={() => { setBookingForFeedback(b); setFeedbackOpen(true); }} sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}>Rate Now</Button>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">{b.feedback || 'Shared'}</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {past.length === 0 && <Box sx={{ py: 10, textAlign: 'center' }}><Typography color="text.secondary" fontWeight={700}>No completed history</Typography></Box>}
            </motion.div>
        )}

        {tab === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: COLORS.background }}>
                            <TableRow><TableCell sx={{ fontWeight: 800 }}>Amenity</TableCell><TableCell sx={{ fontWeight: 800 }}>Date</TableCell><TableCell sx={{ fontWeight: 800 }}>Reason</TableCell><TableCell sx={{ fontWeight: 800 }} align="right">Status</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {cancelled.map(b => (
                                <TableRow key={b.id}>
                                    <TableCell sx={{ fontWeight: 700 }}>{b.amenity_name}</TableCell>
                                    <TableCell><Typography variant="caption" fontWeight={700}>{format(new Date(b.booking_date), 'MMM do')}</Typography></TableCell>
                                    <TableCell><Typography variant="caption" color="text.secondary">{b.cancel_remark || '--'}</Typography></TableCell>
                                    <TableCell align="right"><Chip label={getStatus(b)} size="small" color="error" variant="outlined" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {cancelled.length === 0 && <Box sx={{ py: 10, textAlign: 'center' }}><Typography color="text.secondary" fontWeight={700}>No cancelled bookings</Typography></Box>}
            </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box><Typography variant="subtitle1" fontWeight={900}>Reserve {selectedAmenity?.name}</Typography><Typography variant="caption" color="text.secondary">Select preferred date & hours</Typography></Box>
            <IconButton onClick={() => setBookingOpen(false)} size="small"><CloseOutlinedIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, py: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
              {dateStrip.map((d, idx) => {
                  const val = format(d, 'yyyy-MM-dd');
                  const isS = formik.values.booking_date === val;
                  return (
                      <Paper key={idx} variant="outlined" onClick={() => { formik.setFieldValue('booking_date', val); updateAvailability(val); }} sx={{ p: 1, px: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 2, bgcolor: isS ? COLORS.primary : 'white', color: isS ? 'white' : 'inherit', transition: '0.2s', minWidth: 60 }}>
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, fontWeight: 800 }}>{format(d, 'EEE')}</Typography>
                          <Typography variant="body2" fontWeight={800}>{format(d, 'dd')}</Typography>
                      </Paper>
                  );
              })}
          </Box>
          <Box sx={{ mt: 2, minHeight: 180, position: 'relative' }}>
             {checkingAvailability && (<Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 2 }}><CircularProgress size={24} /></Box>)}
             <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mb: 1, display: 'block' }}>Availability Schedule</Typography>
             <Grid container spacing={1}>
               {availableSlots.map((s, i) => {
                 const isS = selectedSlots.find(sl => sl.start === s.start);
                 const isL = s.isPast || s.isFull;
                 return (
                   <Grid item xs={3} key={i}>
                     <Paper variant="outlined" onClick={() => handleSlotToggle(s)} sx={{ p: 1, textAlign: 'center', cursor: isL ? 'not-allowed' : 'pointer', borderRadius: 2, bgcolor: isS ? COLORS.primary : (isL ? '#f8f9fa' : 'white'), color: isS ? 'white' : (isL ? '#e1e2e3' : COLORS.primary), position: 'relative' }}>
                       <Typography variant="caption" fontWeight={800}>{s.start}</Typography>
                       {isS && <FiberManualRecord sx={{ position: 'absolute', top: 1, right: 1, fontSize: 6, color: 'white' }} />}
                     </Paper>
                   </Grid>
                 );
               })}
             </Grid>
          </Box>
          {selectedSlots.length > 0 && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: COLORS.primary, color: 'white' }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="caption" fontWeight={900}>RESERVATION</Typography><Typography variant="caption" fontWeight={900} sx={{ bgcolor: 'rgba(255,255,255,0.14)', px: 1, borderRadius: 1 }}>{selectedSlots.length} HR</Typography></Box>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 0.5 }}>
                    <Typography variant="h6" fontWeight={800}>{selectedSlots[0].start} - {selectedSlots[selectedSlots.length-1].end}</Typography>
                    <Typography variant="h5" fontWeight={900}>₹{selectedAmenity.price_per_hour * selectedSlots.length}</Typography>
                 </Box>
              </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button fullWidth variant="contained" disableElevation onClick={formik.handleSubmit} disabled={selectedSlots.length === 0 || checkingAvailability} sx={{ py: 1.5, borderRadius: 2, fontWeight: 800, bgcolor: COLORS.primary }}>Confirm Booking</Button></DialogActions>
      </Dialog>

      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: 350 } }}>
         <DialogTitle sx={{ fontWeight: 900 }}>Rate Experience</DialogTitle>
         <DialogContent>
             <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}><Rating value={feedbackData.rating} onChange={(_, v) => setFeedbackData({ ...feedbackData, rating: v })} size="large" /></Box>
             <TextField fullWidth multiline rows={2} placeholder="Any comments..." value={feedbackData.comment} onChange={e => setFeedbackData({ ...feedbackData, comment: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: COLORS.background } }} />
         </DialogContent>
         <DialogActions sx={{ p: 2 }}><Button fullWidth variant="contained" disableElevation onClick={handleSubmitFeedback} sx={{ py: 1.2, borderRadius: 2, bgcolor: COLORS.primary, fontWeight: 800 }}>Submit Review</Button></DialogActions>
      </Dialog>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: 350 } }}>
         <DialogTitle sx={{ fontWeight: 900 }}>Cancel Booking?</DialogTitle>
         <DialogContent><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Provide a reason for releasing this slot.</Typography><TextField fullWidth multiline rows={2} placeholder="Reason..." value={cancelRemark} onChange={e => setCancelRemark(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: COLORS.background } }} /></DialogContent>
         <DialogActions sx={{ p: 2 }}><Button color="inherit" onClick={() => setCancelDialogOpen(false)}>No</Button><Button variant="contained" color="error" disableElevation onClick={handleCancelBooking} sx={{ borderRadius: 2, px: 3, fontWeight: 800 }}>Yes, Cancel</Button></DialogActions>
      </Dialog>

      <Dialog open={passOpen} onClose={() => setPassOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: 300 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 900, pt: 3 }}>Check-In Pass</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: COLORS.background, borderRadius: 3, mb: 2, border: '1px solid #eee' }}>
            <QRCodeSVG value={`${activeBookingForPass?.booking_number}`} size={160} /> 
          </Paper>
          <Typography variant="subtitle2" fontWeight={900}>{activeBookingForPass?.amenity_name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{activeBookingForPass?.booking_number}</Typography>
              <IconButton size="small" onClick={() => { navigator.clipboard.writeText(activeBookingForPass?.booking_number); toast.success('Copied'); }}><ContentCopyIcon sx={{ fontSize: 13, ml: 1 }} /></IconButton>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button fullWidth variant="outlined" onClick={() => setPassOpen(false)} sx={{ borderRadius: 2, fontWeight: 800 }}>Dismiss</Button></DialogActions>
      </Dialog>
    </Box>
  );
}