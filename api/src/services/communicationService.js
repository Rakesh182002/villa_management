const communicationDao = require('../dao/communicationDao');
const { getIO, getConnectedUsers } = require('../config/socket');

const communicationService = {
  async sendMessage(senderId, data, file) {
    const { receiver_id, message, reply_to, message_type = 'text' } = data;
    const room_id = [senderId, parseInt(receiver_id)].sort().join('-');

    let image_url = null;
    if (file) {
      image_url = `/uploads/messages/${file.filename}`;
    } else if (data.image_url) {
      image_url = data.image_url;
    }

    // Check if receiver is online to mark as delivered
    const connectedUsers = getConnectedUsers();
    const isOnline = connectedUsers.has(receiver_id.toString());
    const status = isOnline ? 'delivered' : 'sent';

    const result = await communicationDao.createMessage({
      sender_id: senderId,
      receiver_id,
      message,
      image_url,
      room_id,
      status,
      reply_to,
      message_type
    });

    const msg = await communicationDao.findMessageWithDetails(result.insertId);

    // Emit to receiver
    try {
      const io = getIO();
      io.to(`user:${receiver_id}`).emit('chat:newMessage', msg);
    } catch (e) { /* socket not initialized */ }

    return msg;
  },

  async getMessages(currentUserId, otherUserId) {
    const room_id = [currentUserId, parseInt(otherUserId)].sort().join('-');
    const messages = await communicationDao.getMessages(room_id, currentUserId);

    // Mark messages as read (sender is otherUserId, receiver is currentUserId)
    await this.markAsRead(room_id, currentUserId, otherUserId);

    return messages;
  },

  async getConversations(userId) {
    const conversations = await communicationDao.getConversations(userId);

    // Remove duplicates (keep most recent)
    const seen = new Set();
    const unique = conversations.filter(conv => {
      if (seen.has(conv.user_id)) return false;
      seen.add(conv.user_id);
      return true;
    });

    return unique;
  },

  async markAsRead(roomId, userId, senderId) {
    await communicationDao.markRead(roomId, userId);

    // Notify sender that messages were seen
    try {
      const io = getIO();
      const targetId = senderId || roomId.split('-').find(id => id !== userId.toString());
      io.to(`user:${targetId}`).emit('chat:messagesSeen', {
        roomId,
        seenBy: userId,
        seenAt: new Date()
      });
    } catch (e) { /* socket not initialized */ }
  },

  async deleteMessage(userId, messageId, type) {
    const msg = await communicationDao.findMessageWithDetails(messageId);
    if (!msg) throw { status: 404, message: 'Message not found' };

    if (type === 'everyone') {
      if (msg.sender_id !== userId) {
        throw { status: 403, message: 'You can only delete your own messages for everyone' };
      }
      
      const messageAge = (new Date() - new Date(msg.created_at)) / (1000 * 60);
      if (messageAge > 5) {
        throw { status: 400, message: 'Messages older than 5 minutes cannot be deleted for everyone' };
      }

      await communicationDao.deleteMessageForEveryone(messageId);
      
      // Notify receiver via socket
      try {
        const io = getIO();
        io.to(`user:${msg.receiver_id}`).emit('chat:messageDeleted', { 
          messageId, 
          roomId: msg.room_id,
          type: 'everyone' 
        });
      } catch (e) { /* socket not initialized */ }
    } else {
      // Delete for me
      await communicationDao.deleteMessageForMe(messageId, userId);
    }

    return { success: true };
  },

  async deleteConversation(userId, otherUserId) {
    const roomId = [userId, parseInt(otherUserId)].sort().join('-');
    await communicationDao.deleteConversation(roomId, userId);
    return { success: true };
  },

  async searchResidents(userId, query) {
    return await communicationDao.searchResidents(query, userId);
  },

  async getNotices(priority) {
    return await communicationDao.getNotices(priority);
  },

  async createNotice(userId, data, file) {
    const { title, content, priority } = data;

    let image_url = null;
    if (file) {
      image_url = `/uploads/notices/${file.filename}`;
    }

    const result = await communicationDao.createNotice({
      title,
      content,
      image_url,
      posted_by: userId,
      priority
    });

    const notice = await communicationDao.findNoticeWithDetails(result.insertId);

    // Emit to all users
    try {
      const io = getIO();
      io.emit('notice:new', notice);
    } catch (e) { /* socket not initialized */ }

    return notice;
  },

  async getForumTopics(category) {
    return await communicationDao.getForumTopics(category);
  },

  async createForumTopic(userId, data) {
    const { title, content, category } = data;

    const result = await communicationDao.createForumTopic({
      title,
      content,
      created_by: userId,
      category
    });

    const topic = await communicationDao.findForumTopicWithDetails(result.insertId);
    return topic;
  },

  async getForumComments(topicId) {
    return await communicationDao.getForumComments(topicId);
  },

  async addForumComment(topicId, userId, data) {
    const { comment } = data;

    const result = await communicationDao.addForumComment({
      topic_id: topicId,
      user_id: userId,
      comment
    });

    const commentData = await communicationDao.findForumCommentWithDetails(result.insertId);
    return commentData;
  }
};

module.exports = communicationService;
