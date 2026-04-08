const express = require('express');
const joi = require('joi');
const Message = require('../src/models/Message');
const authMiddleware = require('../src/middleware/auth');
const { getNextSequence } = require('../src/models/Counter');

const router = express.Router();

// Validation: allow A-Z, a-z, 0-9, space, . , ? !
const safeTextPattern = /^[A-Za-z0-9 .,?!]+$/;

const createMessageSchema = joi.object({
  name: joi.string().pattern(safeTextPattern).min(2).max(100).required()
    .messages({ 'string.pattern.base': 'Name may only contain letters, digits, spaces, and . , ? !' }),
  email: joi.string().email().max(200).required(),
  subject: joi.string().valid('general', 'support', 'feedback', 'other').required(),
  message: joi.string().pattern(safeTextPattern).min(5).max(2000).required()
    .messages({ 'string.pattern.base': 'Message may only contain letters, digits, spaces, and . , ? !' }),
});

const closeMessageSchema = joi.object({
  adminComment: joi.string().pattern(safeTextPattern).max(2000).allow('').optional()
    .messages({ 'string.pattern.base': 'Comment may only contain letters, digits, spaces, and . , ? !' }),
});

const addCommentSchema = joi.object({
  adminComment: joi.string().pattern(safeTextPattern).min(1).max(2000).required()
    .messages({
      'string.empty': 'Comment is required',
      'string.pattern.base': 'Comment may only contain letters, digits, spaces, and . , ? !',
    }),
});

function ensureLegacyAdminComments(message) {
  if (!message.adminComment || message.adminComments.length > 0) {
    return;
  }

  message.adminComments.push({
    text: message.adminComment,
    adminId: message.closedBy || null,
    createdAt: message.closedAt || message.updatedAt || message.createdAt || new Date(),
  });
}

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function canUseMailbox(req) {
  return !!req.user?._id;
}

function requireMailboxAccess(req, res) {
  if (!canUseMailbox(req)) {
    res.status(403).json({ message: 'Access denied' });
    return false;
  }

  return true;
}

function canAccessMessage(req, message) {
  if (isAdmin(req)) return true;
  if (!message?.userId) return false;
  return String(message.userId) === String(req.user?._id);
}

function getValidationError(schema, payload) {
  const { error } = schema.validate(payload);
  return error ? error.details[0].message : null;
}

async function findMessageByIdOrSend404(res, id) {
  const message = await Message.findById(String(id));
  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return null;
  }

  return message;
}

async function ensureMessageNumber(message) {
  if (!message.messageNumber) {
    message.messageNumber = await getNextSequence('messageNumber');
  }
}

function sendServerError(res, context, error) {
  console.error(context, error);
  res.status(500).json({ message: 'Server error' });
}

function getStatusFilter(statusParam) {
  if (statusParam === 'closed') return 'closed';
  if (statusParam === 'open') return 'open';
  if (statusParam === 'reopened') return 'reopened';
  return { $in: ['open', 'reopened'] };
}

function getSubjectFilter(subjectParam) {
  if (!subjectParam) return null;

  const subjectAliases = {
    general: ['general', 'General Inquiry'],
    support: ['support', 'Technical Support'],
    feedback: ['feedback', 'Feedback'],
    other: ['other', 'Other'],
  };

  const normalized = String(subjectParam).trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(subjectAliases, normalized)) {
    return null;
  }

  return subjectAliases[normalized];
}

// POST /api/messages – submit a contact message (logged-in users only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const validationError = getValidationError(createMessageSchema, req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const msg = new Message({
      name: String(req.body.name).trim(),
      email: String(req.body.email).trim().toLowerCase(),
      subject: String(req.body.subject).trim(),
      message: String(req.body.message).trim(),
      userId: req.user._id || null,
    });

    await msg.save();
    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        _id: msg._id,
        messageNumber: msg.messageNumber,
      },
    });
  } catch (err) {
    sendServerError(res, 'Error saving contact message:', err);
  }
});

// GET /api/messages – list messages (admin/main_brunch/user)
// Query: status (active|open|reopened|closed), subject (general|support|feedback|other), page (1-based), search
router.get('/', authMiddleware, async (req, res) => {
  if (!requireMailboxAccess(req, res)) return;

  try {
    await Message.assignMissingNumbers();

    const statusParam = String(req.query.status || 'active');
    const subjectParam = String(req.query.subject || '').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const LIMIT = 25;
    const skip = (page - 1) * LIMIT;

    // Sanitise search term: keep only safe characters to protect against ReDoS
    const rawSearch = String(req.query.search || '').trim();
    const safeSearch = rawSearch.replace(/[^A-Za-z0-9 @._-]/g, '');

    const query = {
      status: getStatusFilter(statusParam),
    };

    if (!isAdmin(req)) {
      query.userId = req.user._id;
    }

    const subjectFilterValues = getSubjectFilter(subjectParam);
    if (subjectFilterValues) {
      query.subject = { $in: subjectFilterValues };
    }

    if (safeSearch) {
      const regex = new RegExp(safeSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(LIMIT)
        .populate('userId', 'name email'),
      Message.countDocuments(query),
    ]);

    res.json({
      messages,
      total,
      page,
      pages: Math.ceil(total / LIMIT),
    });
  } catch (err) {
    sendServerError(res, 'Error fetching messages:', err);
  }
});

// PATCH /api/messages/:id/close – close a message with optional comment
router.patch('/:id/close', authMiddleware, async (req, res) => {
  if (!requireMailboxAccess(req, res)) return;

  try {
    const validationError = getValidationError(closeMessageSchema, req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const msg = await findMessageByIdOrSend404(res, req.params.id);
    if (!msg) return;
    if (!canAccessMessage(req, msg)) return res.status(403).json({ message: 'Access denied' });
    if (msg.status === 'closed') return res.status(400).json({ message: 'Message is already closed' });

    await ensureMessageNumber(msg);

    ensureLegacyAdminComments(msg);

    const nextComment = req.body.adminComment ? String(req.body.adminComment).trim() : '';
    if (nextComment) {
      msg.adminComments.push({
        text: nextComment,
        adminId: req.user._id,
        createdAt: new Date(),
      });
    }

    msg.status = 'closed';
    msg.adminComment = nextComment || msg.adminComment || '';
    msg.closedAt = new Date();
    msg.closedBy = req.user._id;

    await msg.save();
    res.json({ message: 'Message closed', data: msg });
  } catch (err) {
    sendServerError(res, 'Error closing message:', err);
  }
});

// PATCH /api/messages/:id/comment – add a comment without changing status
router.patch('/:id/comment', authMiddleware, async (req, res) => {
  if (!requireMailboxAccess(req, res)) return;

  try {
    const validationError = getValidationError(addCommentSchema, req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const msg = await findMessageByIdOrSend404(res, req.params.id);
    if (!msg) return;
    if (!canAccessMessage(req, msg)) return res.status(403).json({ message: 'Access denied' });

    await ensureMessageNumber(msg);

    ensureLegacyAdminComments(msg);

    const nextComment = String(req.body.adminComment).trim();
    msg.adminComments.push({
      text: nextComment,
      adminId: req.user._id,
      createdAt: new Date(),
    });
    msg.adminComment = nextComment;

    await msg.save();
    res.json({ message: 'Comment added', data: msg });
  } catch (err) {
    sendServerError(res, 'Error adding message comment:', err);
  }
});

// PATCH /api/messages/:id/reopen – reopen a closed message
router.patch('/:id/reopen', authMiddleware, async (req, res) => {
  if (!requireMailboxAccess(req, res)) return;

  try {
    const msg = await findMessageByIdOrSend404(res, req.params.id);
    if (!msg) return;
    if (!canAccessMessage(req, msg)) return res.status(403).json({ message: 'Access denied' });
    if (msg.status !== 'closed') {
      return res.status(400).json({ message: 'Only closed messages can be reopened' });
    }

    ensureLegacyAdminComments(msg);

    msg.status = 'reopened';
    msg.closedAt = null;
    msg.closedBy = null;

    await msg.save();
    res.json({ message: 'Message reopened', data: msg });
  } catch (err) {
    sendServerError(res, 'Error reopening message:', err);
  }
});

module.exports = router;
