import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Button, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    CircularProgress, IconButton, Tabs, Tab, Avatar, List, ListItem, ListItemText, ListItemAvatar,
    Divider, Tooltip, Paper, Switch, FormControlLabel
} from '@mui/material';
import {
    Weekend, Pool, FitnessCenter, SportsTennis,
    Refresh, Add, Edit, Delete, AttachMoney, Schedule,
    ThumbUp, ThumbDown, AssignmentLate,
    BarChart as BarChartIcon,
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
    ToggleOn, ToggleOff, InfoOutlined, CheckCircle
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useNotification } from '../../contexts/NotificationContext';
import { amenityAPI } from '../../services/api';
import PageHeader from '../../components/Common/PageHeader';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import socketService from '../../services/socket';

const AMENITY_ICONS = {
    Clubhouse: <Weekend />, Gym: <FitnessCenter />, 'Swimming Pool': <Pool />, 'Tennis Court': <SportsTennis />
};

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

const AmenityManagement = () => {
    const { showSnackbar } = useNotification();
    const [amenities, setAmenities] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [analytics, setAnalytics] = useState({ usage: [], hourly: [] });
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);

    // States for Amenity CRUD
    const [amenityOpen, setAmenityOpen] = useState(false);
    const [editingAmenity, setEditingAmenity] = useState(null);
    const [amenityForm, setAmenityForm] = useState({
        name: '', description: '', capacity: 5, price_per_hour: 0,
        opening_time: '06:00', closing_time: '22:00'
    });

    const [statusDialog, setStatusDialog] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [adminRemark, setAdminRemark] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [amenRes, bookRes, anyRes] = await Promise.all([
                amenityAPI.managementGetAll(),
                amenityAPI.getAllBookings(),
                amenityAPI.getAnalytics()
            ]);
            setAmenities(amenRes.data.data);
            setBookings(bookRes.data.data);
            setAnalytics(anyRes.data.data);
        } catch { showSnackbar('Error loading data', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const refresh = () => fetchData();
        socketService.on('amenity:booked', refresh);
        socketService.on('amenity:cancelled', refresh);
        socketService.on('amenity:status_updated', refresh);
        return () => {
            socketService.off('amenity:booked', refresh);
            socketService.off('amenity:cancelled', refresh);
            socketService.off('amenity:status_updated', refresh);
        };
    }, []);

    const handleSaveAmenity = async () => {
        try {
            if (editingAmenity) {
                await amenityAPI.update(editingAmenity.id, amenityForm);
                showSnackbar('Amenity updated', 'success');
            } else {
                await amenityAPI.create(amenityForm);
                showSnackbar('Amenity created', 'success');
            }
            setAmenityOpen(false);
            fetchData();
        } catch { showSnackbar('Failed to save amenity', 'error'); }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await amenityAPI.toggleStatus(id, !currentStatus);
            showSnackbar(`Facility ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
            fetchData();
        } catch { showSnackbar('Failed to toggle status', 'error'); }
    };

    const handleUpdateBookingStatus = async (status) => {
        try {
            await amenityAPI.updateStatus(selectedBooking.id, status, adminRemark);
            showSnackbar(`Booking ${status}`, 'success');
            setStatusDialog(false);
            fetchData();
        } catch { showSnackbar('Error updating status', 'error'); }
    };

    const openAmenityDialog = (a = null) => {
        if (a) {
            setEditingAmenity(a);
            setAmenityForm({
                name: a.name, description: a.description, capacity: a.capacity,
                price_per_hour: a.price_per_hour,
                opening_time: a.opening_time.slice(0, 5),
                closing_time: a.closing_time.slice(0, 5)
            });
        } else {
            setEditingAmenity(null);
            setAmenityForm({ name: '', description: '', capacity: 5, price_per_hour: 0, opening_time: '06:00', closing_time: '22:00' });
        }
        setAmenityOpen(true);
    };

    return (
        <>
            <Helmet><title>Amenity Management</title></Helmet>
            <Box>
                <PageHeader
                    title="Facility Center"
                    subtitle="Industrial-grade facility control and occupancy management"
                    actions={<Button variant="contained" startIcon={<Add />} onClick={() => openAmenityDialog()} sx={{ borderRadius: '12px', px: 3, fontWeight: 800 }}>New Amenity</Button>}
                />

                <Card sx={{ borderRadius: '24px', overflow: 'hidden', mb: 4, border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc/50', px: 3 }}>
                        <Tab label="Manage Facilities" sx={{ fontWeight: 900, py: 3, textTransform: 'none', fontSize: '1rem' }} />
                        <Tab label={`Pending Approval (${bookings.filter(b => b.status === 'waiting').length})`} sx={{ fontWeight: 900, py: 3, textTransform: 'none', fontSize: '1rem' }} />
                        <Tab label="Activity Stream" sx={{ fontWeight: 900, py: 3, textTransform: 'none', fontSize: '1rem' }} />
                        <Tab label="Insights" sx={{ fontWeight: 900, py: 3, textTransform: 'none', fontSize: '1rem' }} />
                    </Tabs>

                    <AnimatePresence mode="wait">
                        {tabValue === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '32px' }}>
                                <Grid container spacing={4}>
                                    {amenities.map((a) => (
                                        <Grid item xs={12} md={4} key={a.id}>
                                            <Card variant="outlined" sx={{ borderRadius: '16px', transition: '0.2s', '&:hover': { border: '1px solid #7c3aed', boxShadow: '0 8px 30px rgba(124, 58, 237, 0.05)' }, opacity: a.is_active ? 1 : 0.65 }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                                        <Avatar sx={{ bgcolor: a.is_active ? '#7c3aed' : '#cbd5e1', width: 48, height: 48 }}>
                                                            {AMENITY_ICONS[a.name] || <Weekend />}
                                                        </Avatar>
                                                        <Switch checked={!!a.is_active} onChange={() => handleToggleActive(a.id, a.is_active)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#7c3aed' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#7c3aed' } }} />
                                                    </Box>
                                                    <Typography variant="h6" fontWeight={900}>{a.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, height: 40, lineHeight: 1.6 }}>{a.description}</Typography>
                                                    <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, display: 'block' }}>CAPACITY / HR</Typography>
                                                            <Typography fontWeight={900}>{a.capacity} Members</Typography>
                                                        </Box>
                                                        <IconButton size="small" onClick={() => openAmenityDialog(a)} sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}><Edit fontSize="small" /></IconButton>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </motion.div>
                        )}

                        {tabValue === 1 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <List sx={{ p: 0 }}>
                                    {bookings.filter(b => b.status === 'waiting').length === 0 ? (
                                        <Box sx={{ p: 10, textAlign: 'center' }}><CheckCircle sx={{ fontSize: 64, color: '#f1f5f9', mb: 2 }} /><Typography color="text.secondary" fontWeight={800}>Queue is Clear</Typography></Box>
                                    ) : (
                                        bookings.filter(b => b.status === 'waiting').map((b) => (
                                            <ListItem key={b.id} divider sx={{ py: 4, px: 5, '&:hover': { bgcolor: '#fbfcfd' } }}>
                                                <ListItemAvatar><Avatar sx={{ width: 56, height: 56, bgcolor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', fontWeight: 900 }}>{b.amenity_name?.charAt(0)}</Avatar></ListItemAvatar>
                                                <ListItemText
                                                    sx={{ ml: 3 }}
                                                    primary={<Typography variant="h6" fontWeight={900}>{b.amenity_name} <Chip label="Action Required" size="small" sx={{ ml: 1, fontSize: '0.65rem', fontWeight: 900, bgcolor: '#fff7ed', color: '#c2410c' }} /></Typography>}
                                                    secondary={<Typography variant="body2" color="text.secondary" fontWeight={600}>Resident: {b.resident_name} • Unit {b.apartment_number} • Slot: {formatDate(b.booking_date)} ({b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)})</Typography>}
                                                />
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <Button variant="contained" color="success" onClick={() => { setSelectedBooking(b); setAdminRemark('Approved'); setStatusDialog(true); }} sx={{ borderRadius: '12px', fontWeight: 800, textTransform: 'none', px: 3 }}>Approve</Button>
                                                    <Button variant="outlined" color="error" onClick={() => { setSelectedBooking(b); setAdminRemark(''); setStatusDialog(true); }} sx={{ borderRadius: '12px', fontWeight: 800, textTransform: 'none', px: 3 }}>Reject</Button>
                                                </Box>
                                            </ListItem>
                                        ))
                                    )}
                                </List>
                            </motion.div>
                        )}

                        {tabValue === 2 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <List sx={{ p: 0 }}>
                                    {bookings.map((b) => (
                                        <ListItem key={b.id} divider sx={{ py: 3, px: 5 }}>
                                            <ListItemText
                                                primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Typography fontWeight={900}>{b.amenity_name}</Typography><Chip label={b.status} size="small" sx={{ fontWeight: 900, height: 20, fontSize: '0.6rem', bgcolor: getStatusColor(b.status) === 'success' ? '#f0fdf4' : '#f8fafc', color: getStatusColor(b.status) === 'success' ? '#16a34a' : '#64748b' }} /></Box>}
                                                secondary={<Typography variant="caption" sx={{ fontWeight: 600 }}>{b.resident_name} • Unit {b.apartment_number} • {formatDate(b.booking_date)} • REF {b.booking_number}</Typography>}
                                            />
                                            <Typography variant="body2" fontWeight={800} color="primary.main">{formatCurrency(b.total_amount)}</Typography>
                                        </ListItem>
                                    ))}
                                </List>
                            </motion.div>
                        )}

                        {tabValue === 3 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '32px' }}>
                                <Grid container spacing={4}>
                                    <Grid item xs={12} md={8}><Paper variant="outlined" sx={{ p: 4, borderRadius: '24px', height: 400 }}><Typography variant="subtitle2" fontWeight={900} gutterBottom>Volume Analysis</Typography><ResponsiveContainer><BarChart data={analytics.usage}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><RechartsTooltip cursor={{ fill: '#f8fafc' }} /><Bar dataKey="count" fill="#7c3aed" radius={[8, 8, 0, 0]} barSize={40} /></BarChart></ResponsiveContainer></Paper></Grid>
                                    <Grid item xs={12} md={4}>
                                        <Paper variant="outlined" sx={{ p: 4, borderRadius: '24px', height: 400, bgcolor: '#7c3aed', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <Box><Typography variant="h5" fontWeight={900}>Trend Intelligence</Typography><Typography variant="body2" sx={{ opacity: 0.8 }}>Facility peak hour distribution tracking</Typography></Box>
                                            <Box sx={{ height: 200 }}><ResponsiveContainer><LineChart data={analytics.hourly}><Line type="monotone" dataKey="count" stroke="white" strokeWidth={4} dot={false} /></LineChart></ResponsiveContainer></Box>
                                            <Typography variant="caption" sx={{ opacity: 0.7 }}>Data refreshes in real-time via society sockets</Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </Box>

            {/* AMENITY CREATE/EDIT DIALOG */}
            <Dialog open={amenityOpen} onClose={() => setAmenityOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 900, px: 3 }}>{editingAmenity ? 'Edit' : 'Create'} Facility</DialogTitle>
                <DialogContent sx={{ pt: 1, px: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}><TextField fullWidth label="Name" value={amenityForm.name} onChange={e => setAmenityForm({ ...amenityForm, name: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={amenityForm.description} onChange={e => setAmenityForm({ ...amenityForm, description: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} /></Grid>
                        <Grid item xs={6}><TextField fullWidth label="Slots (Max Members)" type="number" value={amenityForm.capacity} onChange={e => setAmenityForm({ ...amenityForm, capacity: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} /></Grid>
                        <Grid item xs={6}><TextField fullWidth label="Price (₹/Hr)" type="number" value={amenityForm.price_per_hour} onChange={e => setAmenityForm({ ...amenityForm, price_per_hour: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} /></Grid>
                        <Grid item xs={6}><TextField fullWidth label="Opening" type="time" value={amenityForm.opening_time} onChange={e => setAmenityForm({ ...amenityForm, opening_time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} /></Grid>
                        <Grid item xs={6}><TextField fullWidth label="Closing" type="time" value={amenityForm.closing_time} onChange={e => setAmenityForm({ ...amenityForm, closing_time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 4, pt: 1 }}><Button onClick={() => setAmenityOpen(false)} sx={{ fontWeight: 800 }}>Discard</Button><Button variant="contained" onClick={handleSaveAmenity} sx={{ px: 4, borderRadius: '12px', py: 1.2, fontWeight: 800 }}>Save Changes</Button></DialogActions>
            </Dialog>

            {/* BOOKING STATUS DIALOG */}
            <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} PaperProps={{ sx: { borderRadius: '24px', width: 420 } }}>
                <DialogTitle sx={{ fontWeight: 900, px: 4, pt: 4 }}>Verdict Decision</DialogTitle>
                <DialogContent sx={{ px: 4 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Provide a reason for the resident regarding this reservation verdict.</Typography>
                    <TextField fullWidth autoFocus multiline rows={3} value={adminRemark} onChange={(e) => setAdminRemark(e.target.value)} placeholder="Decision justification..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: '#f8fafc' } }} />
                </DialogContent>
                <DialogActions sx={{ p: 4, pt: 1, gap: 1 }}>
                    <Button onClick={() => handleUpdateBookingStatus('rejected')} variant="outlined" color="error" sx={{ borderRadius: '12px', flex: 1, py: 1.2, fontWeight: 800 }}>Reject</Button>
                    <Button variant="contained" color="success" onClick={() => handleUpdateBookingStatus('confirmed')} sx={{ borderRadius: '12px', flex: 1, py: 1.2, fontWeight: 800 }}>Approve</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AmenityManagement;
