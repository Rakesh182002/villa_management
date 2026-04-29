const communicationService = require('../services/communicationService');
const logger = require('../utils/Logger');

// @desc    Send message
// @route   POST /api/communication/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const msg = await communicationService.sendMessage(req.userId, req.body, req.file);
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: msg
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error sending message'
    });
  }
};

// @desc    Get messages between two users
// @route   GET /api/communication/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const messages = await communicationService.getMessages(req.userId, req.params.userId);
    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching messages'
    });
  }
};

// @desc    Get all conversations for user
// @route   GET /api/communication/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const conversations = await communicationService.getConversations(req.userId);
    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching conversations'
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/communication/messages/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    await communicationService.markAsRead(req.body.room_id, req.userId);
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error marking messages as read'
    });
  }
};

// @desc    Get all notices
// @route   GET /api/communication/notices
// @access  Private
const getNotices = async (req, res) => {
  try {
    const notices = await communicationService.getNotices(req.query.priority);
    res.json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    logger.error('Get notices error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching notices'
    });
  }
};

// @desc    Create notice
// @route   POST /api/communication/notices
// @access  Private (Management)
const createNotice = async (req, res) => {
  try {
    const notice = await communicationService.createNotice(req.userId, req.body, req.file);
    res.status(201).json({
      success: true,
      message: 'Notice published successfully',
      data: notice
    });
  } catch (error) {
    logger.error('Create notice error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error creating notice'
    });
  }
};

// @desc    Get forum topics
// @route   GET /api/communication/forum/topics
// @access  Private
const getForumTopics = async (req, res) => {
  try {
    const topics = await communicationService.getForumTopics(req.query.category);
    res.json({
      success: true,
      count: topics.length,
      data: topics
    });
  } catch (error) {
    logger.error('Get forum topics error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching forum topics'
    });
  }
};

// @desc    Create forum topic
// @route   POST /api/communication/forum/topics
// @access  Private
const createForumTopic = async (req, res) => {
  try {
    const topic = await communicationService.createForumTopic(req.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      data: topic
    });
  } catch (error) {
    logger.error('Create forum topic error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error creating topic'
    });
  }
};

// @desc    Get forum comments
// @route   GET /api/communication/forum/topics/:id/comments
// @access  Private
const getForumComments = async (req, res) => {
  try {
    const comments = await communicationService.getForumComments(req.params.id);
    res.json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    logger.error('Get forum comments error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching comments'
    });
  }
};

// @desc    Add forum comment
// @route   POST /api/communication/forum/topics/:id/comments
// @access  Private
const addForumComment = async (req, res) => {
  try {
    const comment = await communicationService.addForumComment(req.params.id, req.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    logger.error('Add forum comment error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error adding comment'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/communication/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'me' or 'everyone'
    await communicationService.deleteMessage(req.userId, id, type);
    res.json({
      success: true,
      message: `Message deleted for ${type === 'everyone' ? 'everyone' : 'you'}`
    });
  } catch (error) {
    logger.error('Delete message error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error deleting message'
    });
  }
};

// @desc    Delete entire conversation
// @route   DELETE /api/communication/conversations/:userId
// @access  Private
const deleteConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    await communicationService.deleteConversation(req.userId, userId);
    res.json({ success: true, message: 'Conversation history cleared' });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error clearing conversation' });
  }
};

// @desc    Search residents for new chat
// @route   GET /api/communication/search-residents
// @access  Private
const searchResidents = async (req, res) => {
  try {
    const { q } = req.query;
    const residents = await communicationService.searchResidents(req.userId, q);
    res.json({ success: true, data: residents });
  } catch (error) {
    logger.error('Search residents error:', error);
    res.status(500).json({ success: false, message: 'Error searching residents' });
  }
};

module.exports = { 
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
};