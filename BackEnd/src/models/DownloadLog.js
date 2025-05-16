const mongoose = require('mongoose');

const DownloadLogSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true
    },
    requester: {
        username: {
            type: String,
            required: true
        }
    },
    downloadDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    downloadCount: {
        type: Number,
        default: 1,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    ownerDetails: {
        type: String, 
        required: true
    }
});

module.exports = mongoose.model('DownloadLog', DownloadLogSchema);
