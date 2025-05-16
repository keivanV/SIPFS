// models/User.js
const mongoose = require('mongoose');
//------------------------------------------------
const policySchema = new mongoose.Schema({
    interest  : { 
        type: [String], 
        enum: ['Web Design', 'Windows Development', 'Mobile Apps', 'AI and Machine Learning', 'Cybersecurity'], 
        required: true 
    },
    languages : { 
        type: [String], 
        enum: ['Java', 'Python', 'JavaScript', 'C++', 'Ruby'], 
        required: true 
    }
});
//-------------------------------------------------
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    policySet : {type : [policySchema] , require:true},
    publicKey: { type: String, required: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }

});
//-------------------------------------------------
module.exports = mongoose.model('User', userSchema);
