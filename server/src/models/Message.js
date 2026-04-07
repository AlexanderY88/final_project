const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const adminCommentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const messageSchema = new mongoose.Schema(
  {
    messageNumber: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      maxlength: 200,
    },
    subject: {
      type: String,
      required: true,
      enum: ['general', 'support', 'feedback', 'other'],
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'reopened', 'closed'],
      default: 'open',
    },
    adminComment: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    adminComments: {
      type: [adminCommentSchema],
      default: [],
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.pre('save', async function assignMessageNumber(next) {
  if (!this.isNew || this.messageNumber) {
    return next();
  }

  try {
    this.messageNumber = await getNextSequence('messageNumber');
    next();
  } catch (error) {
    next(error);
  }
});

messageSchema.statics.assignMissingNumbers = async function assignMissingNumbers() {
  const missingMessages = await this.find({
    $or: [{ messageNumber: { $exists: false } }, { messageNumber: null }],
  })
    .sort({ createdAt: 1, _id: 1 })
    .select('_id messageNumber');

  for (const message of missingMessages) {
    message.messageNumber = await getNextSequence('messageNumber');
    await message.save();
  }
};

module.exports = mongoose.model('Message', messageSchema);
