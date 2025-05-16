// models/WareHouse.js
const mongoose = require('mongoose');


const wareHouseSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    fileName :  { type: String, required: true },
    fileExtension : {type :String , required: true}

});

module.exports = mongoose.model('WareHouse', wareHouseSchema);
