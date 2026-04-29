const db = require('../config/database');

const communicationDao = {
  async createMessage(data) {
    const { 
      sender_id, receiver_id, message, image_url, room_id, 
      status = 'sent', reply_to = null, message_type = 'text' 
    } = data;
    const [result] = await db.query(
      `INSERT INTO messages 
       (sender_id, receiver_id, message, image_url, room_id, status, reply_to, message_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sender_id, receiver_id, message, image_url, room_id, status, reply_to, message_type]
    );
    return result;
  },

  async findMessageWithDetails(id) {
    const [rows] = await db.query(
      `SELECT m.*, 
              s.full_name as sender_name,
              r.full_name as receiver_name
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       JOIN users r ON m.receiver_id = r.id
       WHERE m.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getMessages(roomId, userId) {
    const [rows] = await db.query(
      `SELECT m.*,
              s.full_name as sender_name,
              s.apartment_number as sender_apartment,
              r.full_name as receiver_name
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       JOIN users r ON m.receiver_id = r.id
       WHERE m.room_id = ?
       AND (
         (m.sender_id = ? AND m.deleted_by_sender = FALSE) OR
         (m.receiver_id = ? AND m.deleted_by_receiver = FALSE)
       )
       ORDER BY m.created_at ASC`,
      [roomId, userId, userId]
    );
    return rows;
  },

  async markRead(roomId, userId) {
    await db.query(
      "UPDATE messages SET is_read = TRUE, status = 'seen' WHERE room_id = ? AND receiver_id = ? AND is_read = FALSE",
      [roomId, userId]
    );
  },

  async updateMessageStatus(roomId, receiverId, status) {
    await db.query(
      "UPDATE messages SET status = ? WHERE room_id = ? AND receiver_id = ? AND status != 'seen'",
      [status, roomId, receiverId]
    );
  },

  async getConversations(userId) {
    const [rows] = await db.query(`
      SELECT DISTINCT
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END as user_id,
        CASE 
          WHEN m.sender_id = ? THEN r.full_name
          ELSE s.full_name
        END as user_name,
        CASE 
          WHEN m.sender_id = ? THEN r.apartment_number
          ELSE s.apartment_number
        END as apartment_number,
        CASE 
          WHEN m.is_deleted = TRUE THEN 'This message was deleted'
          ELSE m.message
        END as last_message,
        m.created_at as last_message_time,
        (SELECT COUNT(*) FROM messages 
         WHERE room_id = m.room_id 
         AND receiver_id = ? 
         AND is_read = FALSE
         AND deleted_by_receiver = FALSE) as unread_count
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = ? AND m.deleted_by_sender = FALSE) 
         OR (m.receiver_id = ? AND m.deleted_by_receiver = FALSE)
      ORDER BY m.created_at DESC
    `, [userId, userId, userId, userId, userId, userId]);
    return rows;
  },

  async deleteMessageForEveryone(id) {
    await db.query(
      'UPDATE messages SET is_deleted = TRUE, message = NULL, image_url = NULL WHERE id = ?',
      [id]
    );
  },

  async deleteMessageForMe(id, userId) {
    const [rows] = await db.query('SELECT sender_id, receiver_id FROM messages WHERE id = ?', [id]);
    if (!rows[0]) return;
    const msg = rows[0];

    if (msg.sender_id === userId) {
      await db.query('UPDATE messages SET deleted_by_sender = TRUE WHERE id = ?', [id]);
    } else {
      await db.query('UPDATE messages SET deleted_by_receiver = TRUE WHERE id = ?', [id]);
    }
  },

  async deleteConversation(roomId, userId) {
    // Determine if we are sender or receiver for each message in this room
    await db.query(
      `UPDATE messages 
       SET deleted_by_sender = CASE WHEN sender_id = ? THEN TRUE ELSE deleted_by_sender END,
           deleted_by_receiver = CASE WHEN receiver_id = ? THEN TRUE ELSE deleted_by_receiver END
       WHERE room_id = ?`,
      [userId, userId, roomId]
    );
  },

  async searchResidents(query, currentUserId) {
    const searchTerm = `%${query}%`;
    const [rows] = await db.query(
      `SELECT id as user_id, full_name as user_name, apartment_number, email
       FROM users 
       WHERE role = 'resident' 
       AND id != ? 
       AND (full_name LIKE ? OR apartment_number LIKE ?)
       LIMIT 10`,
      [currentUserId, searchTerm, searchTerm]
    );
    return rows;
  },

  async getNotices(priority) {
    let query = `
      SELECT n.*, u.full_name as posted_by_name
      FROM notices n
      JOIN users u ON n.posted_by = u.id
      WHERE n.is_published = TRUE
    `;
    const params = [];

    if (priority) {
      query += ' AND n.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY n.created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async createNotice(data) {
    const { title, content, image_url, posted_by, priority } = data;
    const [result] = await db.query(
      'INSERT INTO notices (title, content, image_url, posted_by, priority, is_published) VALUES (?, ?, ?, ?, ?, TRUE)',
      [title, content, image_url, posted_by, priority || 'general']
    );
    return result;
  },

  async findNoticeWithDetails(id) {
    const [rows] = await db.query(
      `SELECT n.*, u.full_name as posted_by_name
       FROM notices n
       JOIN users u ON n.posted_by = u.id
       WHERE n.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getForumTopics(category) {
    let query = `
      SELECT ft.*,
             u.full_name as created_by_name,
             u.apartment_number,
             (SELECT COUNT(*) FROM forum_comments WHERE topic_id = ft.id) as comment_count
      FROM forum_topics ft
      JOIN users u ON ft.created_by = u.id
    `;
    const params = [];

    if (category) {
      query += ' WHERE ft.category = ?';
      params.push(category);
    }

    query += ' ORDER BY ft.is_pinned DESC, ft.created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async createForumTopic(data) {
    const { title, content, created_by, category } = data;
    const [result] = await db.query(
      'INSERT INTO forum_topics (title, content, created_by, category) VALUES (?, ?, ?, ?)',
      [title, content, created_by, category]
    );
    return result;
  },

  async findForumTopicWithDetails(id) {
    const [rows] = await db.query(
      `SELECT ft.*, u.full_name as created_by_name, u.apartment_number
       FROM forum_topics ft
       JOIN users u ON ft.created_by = u.id
       WHERE ft.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getForumComments(topicId) {
    const [rows] = await db.query(
      `SELECT fc.*, u.full_name as user_name, u.apartment_number
       FROM forum_comments fc
       JOIN users u ON fc.user_id = u.id
       WHERE fc.topic_id = ?
       ORDER BY fc.created_at ASC`,
      [topicId]
    );
    return rows;
  },

  async addForumComment(data) {
    const { topic_id, user_id, comment } = data;
    const [result] = await db.query(
      'INSERT INTO forum_comments (topic_id, user_id, comment) VALUES (?, ?, ?)',
      [topic_id, user_id, comment]
    );
    return result;
  },

  async findForumCommentWithDetails(id) {
    const [rows] = await db.query(
      `SELECT fc.*, u.full_name as user_name, u.apartment_number
       FROM forum_comments fc
       JOIN users u ON fc.user_id = u.id
       WHERE fc.id = ?`,
      [id]
    );
    return rows[0] || null;
  }
};

module.exports = communicationDao;
