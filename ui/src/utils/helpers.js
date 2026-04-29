// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// Format datetime
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Format time
export const formatTime = (time) => {
  if (!time) return '-';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};

// Get initials
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Get status color
export const getStatusColor = (status) => {
  const colors = {
    // Visitor statuses
    pending: 'warning',
    approved: 'info',
    denied: 'error',
    entered: 'success',
    exited: 'default',
    // Bill statuses
    unpaid: 'error',
    paid: 'success',
    overdue: 'error',
    // Complaint statuses
    open: 'error',
    'in-progress': 'warning',
    resolved: 'success',
    closed: 'default',
    // Booking statuses
    confirmed: 'success',
    cancelled: 'error',
    completed: 'default',
    // SOS statuses
    active: 'error',
    acknowledged: 'warning',
    // Generic
    high: 'error',
    medium: 'warning',
    low: 'success',
    urgent: 'error',
    important: 'warning',
    general: 'info',
  };
  return colors[status] || 'default';
};

// Get priority color
export const getPriorityColor = (priority) => {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e',
    urgent: '#ef4444',
  };
  return colors[priority] || '#6b7280';
};

// Truncate text
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Calculate duration
export const getDuration = (start, end) => {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate - startDate;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
};

// Generate room ID for chat
export const getRoomId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('-');
};

// Debounce
export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// Validate phone
export const isValidPhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

// Validate email
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Get file size label
export const getFileSizeLabel = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Month names
export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Current month/year
export const getCurrentMonthYear = () => {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

// Category labels
export const COMPLAINT_CATEGORIES = [
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'parking', label: 'Parking' },
  { value: 'noise', label: 'Noise' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export const STAFF_TYPES = [
  { value: 'maid', label: 'Maid' },
  { value: 'cook', label: 'Cook' },
  { value: 'driver', label: 'Driver' },
  { value: 'gardener', label: 'Gardener' },
  { value: 'other', label: 'Other' },
];

export const BILL_TYPES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'water', label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'amenity', label: 'Amenity' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'other', label: 'Other' },
];