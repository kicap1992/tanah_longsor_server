const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    _id : {
      type : String,
      required : true,
      maxLength : 12,
    },
    lat:{
      type : String
    },
    lng:{
      type : String
    },
    status : {
      type :  String,
      // required : true,
    },

    created_at : {
      type : Date,
      default : Date.now,
    },
    updated_at : {
      type : Date,
      default : Date.now,
    }
  }
)

const newDeviceSchema = new mongoose.Schema(
  {
    _id : {
      type : String,
      required : true,
    },
    lat:{
      type : String
    },
    lng:{
      type : String
    },
    status: {
      type : String,
      default : 'Pending',
    }
  }
)

const notificationSchema = new mongoose.Schema(
  {
    _id : {
      type : String,
      required : true,
    },
    status: {
      type : String,
      required : true,
    }
  }
)

const deviceModel = mongoose.model('device', deviceSchema, 'device');
const newDeviceModel = mongoose.model('new_device', newDeviceSchema, 'new_device');
const notificationModel = mongoose.model('notification', notificationSchema, 'notification');

module.exports = {deviceModel , newDeviceModel, notificationModel};