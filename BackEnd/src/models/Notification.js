// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  assetId : {type: String , required : true},
  assetType : {type: String , required : true},
  message: { type: String, required: true },
  type : {type:String , required : true},
  time: { type: Date, default: Date.now },
  uploaderName: { type: String, required: true },
  publicKey: { type: String, required: true },
  unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
