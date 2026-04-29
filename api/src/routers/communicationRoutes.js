const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validation');
const {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  getNotices,
  createNotice,
  getForumTopics,
  createForumTopic,
  getForumComments,
  addForumComment,
  deleteMessage,
  deleteConversation,
  searchResidents
} = require('../controllers/communicationController');

// Validation rules
const sendMessageValidation = [
  body('receiver_id').isInt().withMessage('Valid receiver ID is required'),
  body('message').notEmpty().withMessage('Message is required')
];

const createNoticeValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('priority').optional().isIn(['urgent', 'important', 'general'])
];

const createTopicValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('category').optional().isString()
];

const addCommentValidation = [
  body('comment').notEmpty().withMessage('Comment is required')
];

// Message routes
router.post('/messages', auth, upload.single('image'), sendMessageValidation, validate, sendMessage);
router.get('/messages/:userId', auth, getMessages);
router.get('/conversations', auth, getConversations);
router.put('/messages/read', auth, markAsRead);
router.delete('/messages/:id', auth, deleteMessage);
router.delete('/conversations/:userId', auth, deleteConversation);
router.get('/search-residents', auth, searchResidents);

// Notice routes
router.get('/notices', auth, getNotices);
router.post('/notices', auth, authorize('management'), upload.single('image'), createNoticeValidation, validate, createNotice);

// Forum routes
router.get('/forum/topics', auth, getForumTopics);
router.post('/forum/topics', auth, createTopicValidation, validate, createForumTopic);
router.get('/forum/topics/:id/comments', auth, getForumComments);
router.post('/forum/topics/:id/comments', auth, addCommentValidation, validate, addForumComment);

module.exports = router;