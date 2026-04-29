import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Avatar, TextField, IconButton,
  List, ListItemButton, ListItemAvatar, ListItemText,
  CircularProgress, Menu, MenuItem, Paper, 
  InputAdornment, Chip, Fade,  Dialog,
  DialogTitle, DialogContent,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Image as ImageIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, differenceInMinutes, isSameDay } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { communicationAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';

/* ─────────────────────── helpers ───────────────────────────── */
const getRoomId = (a, b) => [a, b].sort().join('-');
const getInitials = (n = '') => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'hh:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yy');
};

const getDateSeparator = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM dd, yyyy');
};

const COLORS = ['#ef4444','#4cc0e4ff','#f59e0b','#22c55e','#83de1bff','#2964e4ff','#ec4899','#14b8a6','#f97316'];
const colorFor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ─────────────────────── components ────────────────────── */

const StatusIcon = ({ status, isMine }) => {
  if (!isMine) return null;
  const color = '#ffffff';
  if (status === 'seen') return <DoneAllIcon sx={{ fontSize: 14, color, ml: 0.5 }} />;
  return <DoneIcon sx={{ fontSize: 14, color, ml: 0.5, opacity: 0.6 }} />;
};

const MessageBubble = React.memo(({ msg, isMine, onCtxMenu }) => {
  const isDeleted = msg?.is_deleted;

  return (
    <Box sx={{ position: 'relative', mb: 1, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
        <Box sx={{ maxWidth: '80%', position: 'relative' }}>
          {msg?.reply_to_message && !isDeleted && (
            <Box sx={{ 
              bgcolor: 'rgba(0,0,0,0.04)', borderLeft: '3px solid #3b82f6',
              p: '4px 8px', mb: -0.5, pb: 1, borderRadius: '8px 8px 0 0',
              opacity: 0.8
            }}>
              <Typography variant="caption" fontWeight={700} color="#3b82f6" sx={{ fontSize: '0.65rem' }}>Replying to</Typography>
              <Typography variant="caption" noWrap sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.7 }}>{msg.reply_to_message}</Typography>
            </Box>
          )}

          <Paper 
            elevation={0}
            onContextMenu={(e) => onCtxMenu(e, msg)}
            sx={{
              p: 1.2,
              px: 1.5,
              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              bgcolor: isMine ? (isDeleted ? '#f1f5f9' : '#3b82f6') : (isDeleted ? '#f8fafc' : 'white'),
              color: isMine && !isDeleted ? 'white' : 'text.primary',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              position: 'relative',
              border: isDeleted ? '1px dashed #cbd5e1' : 'none'
            }}
          >
            {isDeleted ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
                <BlockIcon sx={{ fontSize: 14 }} />
                <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                  This message was deleted
                </Typography>
              </Box>
            ) : (
              <>
                {msg.image_url && (
                  <Box component="img" src={`${API_BASE}${msg.image_url}`} 
                    sx={{ width: '100%', maxHeight: 300, borderRadius: 2, mb: msg.message ? 1 : 0, objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => window.open(`${API_BASE}${msg.image_url}`, '_blank')}
                  />
                )}
                {msg.message && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                    {msg.message}
                  </Typography>
                )}
              </>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.3, gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.55rem', opacity: (isMine && !isDeleted) ? 0.8 : 0.5 }}>
                {msg?.created_at ? format(new Date(msg.created_at), 'hh:mm a') : ''}
              </Typography>
              {!isDeleted && <StatusIcon status={msg?.status} isMine={isMine} />}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
});
MessageBubble.displayName = 'MessageBubble';

/* ─────────────────────── MAIN COMPONENT ────────────────────── */

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobileChat, setIsMobileChat] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [replyTo, setReplyTo] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [headerMenu, setHeaderMenu] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await communicationAPI.getConversations();
      setConversations(res.data?.data || []);
    } catch { /* ignored */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (newChatOpen) handleSearch('');
  }, [newChatOpen]);

  useEffect(() => {
    loadConversations();

    const handleNewMessage = (msg) => {
      const currentActive = activeChatRef.current;
      const roomId = getRoomId(user.id, msg.sender_id);
      
      if (msg.room_id === roomId) {
        if (msg.sender_id !== user.id) {
          if (currentActive?.user_id === msg.sender_id) {
            communicationAPI.markAsRead(roomId);
            setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
          }
        }
      } else if (msg.sender_id !== user.id) {
        toast((t) => (
          <Box onClick={() => { openChat({ user_id: msg.sender_id, user_name: msg.sender_name }); toast.dismiss(t.id); }} sx={{ cursor: 'pointer' }}>
            <Typography variant="caption" fontWeight={800} color="#3b82f6">{msg.sender_name}</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }} noWrap>{msg.message || 'Sent an image'}</Typography>
          </Box>
        ), { duration: 4000, position: 'top-right' });
      }
      loadConversations();
    };

    const handleMessageDeleted = ({ messageId, type }) => {
      if (type === 'everyone') {
        setMessages(prev => prev.map(m => m.id === parseInt(messageId) ? { ...m, is_deleted: true, message: null, image_url: null } : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== parseInt(messageId)));
      }
      loadConversations();
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.on('chat:messageDeleted', handleMessageDeleted);
    socketService.onMessagesSeen(({ roomId }) => {
      const currentActive = activeChatRef.current;
      if (currentActive && getRoomId(user.id, currentActive.user_id) === roomId) {
        setMessages(prev => prev.map(m => m.sender_id === user.id ? { ...m, status: 'seen' } : m));
      }
    });
    socketService.onUserTyping(({ userId, isTyping }) => {
      if (activeChatRef.current?.user_id === userId) setTyping(isTyping);
    });

    return () => {
      socketService.off('chat:newMessage', handleNewMessage);
      socketService.off('chat:messageDeleted', handleMessageDeleted);
      socketService.off('chat:messagesSeen');
      socketService.off('chat:userTyping');
    };
  }, [user.id, loadConversations]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const openChat = async (conv) => {
    if (!conv?.user_id) return;
    setActiveChat(conv);
    setIsMobileChat(true);
    setNewChatOpen(false);
    setMsgLoading(true);
    setMessages([]);
    try {
      const res = await communicationAPI.getMessages(conv.user_id);
      setMessages(res.data?.data || []);
      socketService.joinChat(getRoomId(user.id, conv.user_id));
      loadConversations();
    } catch { toast.error('Failed to load history'); }
    finally { setMsgLoading(false); }
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    setSearching(true);
    try {
      const res = await communicationAPI.searchResidents(val);
      setSearchResults(res.data?.data || []);
    } catch { /* silent */ }
    finally { setSearching(false); }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedImage) || !activeChat) return;
    const formData = new FormData();
    formData.append('receiver_id', activeChat.user_id);
    formData.append('message', text.trim());
    if (replyTo) formData.append('reply_to', replyTo.id);
    if (selectedImage) formData.append('image', selectedImage);

    const tempText = text;
    setText(''); setReplyTo(null); setSelectedImage(null); setImagePreview(null);

    try {
      const res = await communicationAPI.sendMessage(formData);
      setMessages(prev => [...prev.filter(m => m.id !== res.data?.data?.id), res.data?.data].filter(Boolean));
      loadConversations();
    } catch { toast.error('Failed to send'); setText(tempText); }
  };

  const handleDeleteConversation = async () => {
    if (!activeChat) return;
    try {
      await communicationAPI.deleteConversation(activeChat.user_id);
      setMessages([]);
      toast.success('Conversation cleared');
      loadConversations();
    } catch { toast.error('Error clearing history'); }
    setHeaderMenu(null);
  };

  const filtered = conversations.filter(c => c?.user_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', borderRadius: 2, overflow: 'hidden', bgcolor: 'white', border: '1px solid #f1f5f9' }}>
      <Toaster position="top-right" />

      {/* ────────────────── Sidebar ────────────────── */}
      <Box sx={{ width: { xs: isMobileChat ? 0 : '100%', md: 320 }, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', transition: '0.3s' }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>Messages</Typography>
            <IconButton onClick={() => setNewChatOpen(true)} color="primary" size="small"><PersonAddIcon /></IconButton>
          </Box>
          <TextField 
            fullWidth size="small" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ 
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              sx: { borderRadius: 3, bgcolor: '#f8fafc', '& fieldset': { border: 'none' } }
            }}
          />
        </Box>
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={20} /></Box> :
          filtered.map(c => (
            <ListItemButton onClick={() => openChat(c)} key={c.user_id} selected={activeChat?.user_id === c.user_id} sx={{ py: 1.5, borderBottom: '1px solid #f8fafc' }}>
               <ListItemAvatar>
                 <Avatar sx={{ bgcolor: colorFor(c.user_name), fontWeight: 700 }}>{getInitials(c.user_name)}</Avatar>
               </ListItemAvatar>
               <ListItemText
                  primary={<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{c.user_name}</Typography>
                    <Typography variant="caption" color="text.disabled">{fmtTime(c.last_message_time)}</Typography>
                  </Box>}
                  secondary={<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" noWrap sx={{ fontSize: '0.75rem', fontWeight: c.unread_count > 0 ? 600 : 400 }}>{c.last_message || 'Start chat'}</Typography>
                    {c.unread_count > 0 && <Chip label={c.unread_count} size="small" color="primary" sx={{ height: 18, fontSize: '0.6rem' }} />}
                  </Box>}
               />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* ────────────────── Chat Window ────────────────── */}
      <Box sx={{ flex: 1, display: { xs: isMobileChat ? 'flex' : 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#f8fafc', position: 'relative' }}>
        {!activeChat ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: '#cbd5e1' }}><ImageIcon sx={{ fontSize: 40 }} /></Avatar>
            <Typography variant="h6" fontWeight={700}>Select a conversation</Typography>
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ p: '12px 16px', bgcolor: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setIsMobileChat(false)}><ArrowBackIcon /></IconButton>
              <Avatar sx={{ bgcolor: colorFor(activeChat.user_name), fontWeight: 700 }}>{getInitials(activeChat.user_name)}</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>{activeChat.user_name}</Typography>
                <Typography variant="caption" color={typing ? 'primary' : 'text.disabled'}>{typing ? 'typing...' : (activeChat.apartment_number || 'Resident')}</Typography>
              </Box>
              <IconButton size="small" onClick={e => setHeaderMenu(e.currentTarget)}><MoreVertIcon /></IconButton>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', py: 2, display: 'flex', flexDirection: 'column', backgroundImage: 'radial-gradient(circle, #e2e8f0 0.5px, transparent 1px)', backgroundSize: '24px 24px' }}>
              {msgLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box> : (
                <AnimatePresence>
                  {messages.map((m, idx) => {
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showDate = !prev || !isSameDay(new Date(m.created_at), new Date(prev.created_at));
                    
                    return (
                      <React.Fragment key={m.id}>
                        {showDate && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <Chip 
                              label={getDateSeparator(m.created_at)} 
                              size="small" 
                              sx={{ 
                                bgcolor: 'rgba(0,0,0,0.05)', 
                                color: 'text.secondary', 
                                fontWeight: 700, 
                                fontSize: '0.65rem',
                                borderRadius: 1 
                              }} 
                            />
                          </Box>
                        )}
                        <MessageBubble msg={m} isMine={m.sender_id === user.id} onCtxMenu={(e, msg) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, msg }); }} />
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input Overlay */}
            <AnimatePresence>
              {imagePreview && (
                <Fade in={!!imagePreview}>
                  <Box sx={{ position: 'absolute', bottom: 85, left: 16, right: 16, bgcolor: 'white', p: 1, borderRadius: 2, boxShadow: '0 -4px 15px rgba(0,0,0,0.1)', border: '1px solid #3b82f6', zIndex: 10 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><IconButton size="small" onClick={() => { setSelectedImage(null); setImagePreview(null); }}><CloseIcon fontSize="small" /></IconButton></Box>
                    <Box component="img" src={imagePreview} sx={{ width: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 1 }} />
                  </Box>
                </Fade>
              )}
            </AnimatePresence>

            {/* Input */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderTop: '1px solid #f1f5f9' }}>
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                 {/* <input type="file" hidden ref={fileInputRef} onChange={e => {
                   const file = e.target.files?.[0];
                   if (file) { setSelectedImage(file); const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result); reader.readAsDataURL(file); }
                 }} accept="image/*" />
                 <IconButton size="small" sx={{ mb: 0.5 }} onClick={() => fileInputRef.current?.click()}><ImageIcon /></IconButton> */}
                 <TextField
                   fullWidth multiline maxRows={4} placeholder="Type a message..." value={text}
                   onChange={e => {
                     setText(e.target.value);
                     if (activeChat) {
                       socketService.sendTyping({ roomId: getRoomId(user.id, activeChat.user_id), isTyping: true });
                       clearTimeout(typingTimeoutRef.current);
                       typingTimeoutRef.current = setTimeout(() => socketService.sendTyping({ roomId: getRoomId(user.id, activeChat.user_id), isTyping: false }), 2000);
                     }
                   }}
                   onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                   sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: '#f8fafc', '& fieldset': { border: 'none' } } }}
                 />
                 <IconButton onClick={handleSend} disabled={!text.trim() && !selectedImage} sx={{ bgcolor: '#3b82f6', color: 'white', mb: 0.5, '&:hover': { bgcolor: '#2563eb' } }} size="small"><SendIcon fontSize="small" /></IconButton>
               </Box>
            </Box>
          </>
        )}
      </Box>

      {/* New Chat Modal */}
      <Dialog open={newChatOpen} onClose={() => setNewChatOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Start New Chat</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <TextField fullWidth size="small" placeholder="Name or Apartment..." value={searchQuery} onChange={e => handleSearch(e.target.value)} autoFocus />
          </Box>
          <List sx={{ minHeight: 200 }}>
            {searching ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={20} /></Box> :
            searchResults.length === 0 ? <Typography sx={{ p: 3, textAlign: 'center', opacity: 0.5 }} variant="caption">Search residents to start...</Typography> :
            searchResults.map(r => (
              <ListItemButton onClick={() => openChat(r)} key={r?.user_id}>
                <ListItemAvatar><Avatar sx={{ bgcolor: colorFor(r?.user_name) }}>{getInitials(r?.user_name)}</Avatar></ListItemAvatar>
                <ListItemText primary={r?.user_name} secondary={`Apartment: ${r?.apartment_number || 'N/A'}`} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      <Menu open={!!ctxMenu} onClose={() => setCtxMenu(null)} anchorReference="anchorPosition" anchorPosition={ctxMenu ? { top: ctxMenu.y, left: ctxMenu.x } : undefined}>
        {!ctxMenu?.msg?.is_deleted && ctxMenu?.msg?.message && <MenuItem onClick={() => { navigator.clipboard.writeText(ctxMenu?.msg?.message); toast.success('Copied'); setCtxMenu(null); }}><CopyIcon sx={{ mr: 1.5 }} /> Copy</MenuItem>}      
        <MenuItem onClick={async () => {
          try {
            await communicationAPI.deleteMessage(ctxMenu.msg.id, 'me');
            setMessages(prev => prev.filter(m => m.id !== ctxMenu.msg.id));
            toast.success('Deleted for you');
          } catch { toast.error('Error deleting'); }
          setCtxMenu(null);
        }}><DeleteIcon sx={{ mr: 1.5 }} /> Delete for me</MenuItem>
       
        {ctxMenu?.msg?.sender_id === user?.id && !ctxMenu?.msg?.is_deleted && differenceInMinutes(new Date(), new Date(ctxMenu.msg.created_at)) <= 15 && (
          <MenuItem sx={{ color: 'error.main' }} onClick={async () => {
            try {
              await communicationAPI.deleteMessage(ctxMenu.msg.id, 'everyone');
              setMessages(prev => prev.map(m => m.id === ctxMenu.msg.id ? { ...m, is_deleted: true, message: null, image_url: null } : m));
              toast.success('Deleted for everyone');
            } catch { toast.error('Error deleting'); }
            setCtxMenu(null);
          }}><DeleteIcon sx={{ mr: 1.5 }} /> Delete for everyone</MenuItem>
        )}
      </Menu>

      {/* Header Menu */}
      <Menu open={!!headerMenu} anchorEl={headerMenu} onClose={() => setHeaderMenu(null)}>
        <MenuItem onClick={handleDeleteConversation} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1.5 }} /> Delete Chat
        </MenuItem>
      </Menu>
    </Box>
  );
}