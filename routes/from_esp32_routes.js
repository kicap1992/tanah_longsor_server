const express = require('express');
const router = express.Router();
require('dotenv/config');
const { deviceModel, newDeviceModel, notificationModel } = require('../models/device_model');
const io_sock = require("socket.io-client");
// const socket = io_sock(`https://tanah-longosor-be.herokuapp.com/`);
const socket = io_sock(`http://192.168.43.125:3004/`);


function send_notif(message, id, status, lat, lng) {
  // console.log(lat, "ini lat");
  // console.log(lng , "ini lng");
  console.log("disini sebelum send notif")
  socket.emit('notif_to_phone', {
    message: message,
    id: id,
    status: status,
    lat: lat,
    lng: lng
  })
}


async function update_device_data(device_id, lat, lng, status) {
  // console.log("disini update device data")

  const device = await deviceModel.findOne({ _id: device_id });
  let statusnya, message;
  if (lat != '' && lng != '') {
    let cek_lng = parseFloat(device_id.lng) - parseFloat(lng);
    let cek_lat = parseFloat(device_id.lat) - parseFloat(lat);
    // change cek_lng and cek_lat to positive value
    cek_lng = Math.abs(cek_lng);
    cek_lat = Math.abs(cek_lat);


    // console.log(status, "ini status");
    if (status > 100) {
      statusnya = "Danger";
      message = "Bahaya tanah longsor, berhati-hati lewati jalur yang berdekatan dengan titik lokasi";
    }
    else if (cek_lng > 0.0007 && cek_lat > 0.0007 && status > 100) {
      statusnya = "Danger Area";
      message = "Bahaya tanah longsor berdekatan dengan titik lokasi";
    }
    else if (cek_lng > 0.0007 && cek_lat > 0.0007) {
      statusnya = "Danger Area";
      message = "Bahaya tanah longsor berdekatan dengan titik lokasi";
    }
    else if (status > 80) {
      statusnya = "Warning";
      message = "Amaran tanah longsor, berhati-hati lewati jalur yang berdekatan dengan titik lokasi";
    } else {
      statusnya = "Normal";
      message = "ini normal";
    }
  } else {
    // if (status > 100) {
    //   statusnya = "Danger";
    //   message = "Bahaya tanah longsor, berhati-hati lewati jalur yang berdekatan dengan titik lokasi";
    // }
    // else 
    if (status > 80) {
      statusnya = "Warning";
      message = "Amaran tanah longsor, berhati-hati lewati jalur yang berdekatan dengan titik lokasi";
    } else {
      statusnya = "Normal";
      message = "ini normal";
    }

  }
  cek_data_notif = await notificationModel.findOne({ device_id: device_id });
  // console.log("disini ada kah1")
  if (!cek_data_notif) {
    // console.log("disini ada kah2")
    // insert data notification
    if (statusnya != "Normal") {
      send_notif(message, device_id.id, statusnya, device_id.lat, device_id.lng);
      // console.log(message);
    }
    const new_notif = new notificationModel({
      _id: device_id,
      status: statusnya,
    })
    await new_notif.save();
  } else {
    // console.log("disini ada kah3")
    if (cek_data_notif.status != statusnya) {
      // update data notification
      await notificationModel.updateOne({ id: device_id.id }, { status: statusnya });
      if (statusnya != "Normal") {
        send_notif(message, device_id.id, statusnya, device_id.lat, device_id.lng);
        // console.log(message);
      } else {
        socket.emit('notif_to_phone', {
          message: '',
          id: device_id.id,
          status: statusnya,
          lat: device_id.lat,
          lng: device_id.lng
        })
      }
    }
  }
  const current_time = new Date();
  device.updated_at = current_time;
  device.status = statusnya
  await device.save();
  // console.log(status, "ini status");
  // console.log(device, " ini device");

  return device;
}

router.post('/', async (req, res) => {
  try {
    const { id, latitude, longitude, soilMoistureValue } = req.body;
    // console.log(req.body , "ini req.body");

    // res.status(200).send({ status: 0, message: "Success" , id: id , derajat: derajat , jarak: jarak , lembab: lembab });

    // check if device id exist
    const cek_device_db = await deviceModel.findOne({ _id: id });
    if (!cek_device_db) {
      // insert data to  newDeviceModel
      const cek_new_device_db = await newDeviceModel.findOne({ _id: id });
      if (!cek_new_device_db) {
        const device_baru = new newDeviceModel({
          _id: id,
          lat: latitude,
          lng: longitude,
          status: "Waiting Calibration",
        });
        await device_baru.save();
        socket.emit("new_device", { id: id });
      } else {
        if (cek_new_device_db.status != "Waiting Calibration") {
          socket.emit("new_device", { id: id });
        }
        await newDeviceModel.updateOne({ _id: id }, { $set: { lat: latitude, lng: longitude, status: "Waiting Calibration", } });
      }




      return res.status(200).send({ status: 'new device detected, need calibration', message: "Success" });
    } else {
      // console.log("di sini dia");
      if (cek_device_db.status === 'calibration') {
        console.log("sini calibrate")
        const lat = latitude;
        const lng = longitude;
        if (lat != '' && lng != '') {

          // update device data
          await deviceModel.findOneAndUpdate({ _id: id }, { $set: { lat: lat, lng: lng } });

          await update_device_data(cek_device_db, lat, lng, soilMoistureValue);
          socket.emit('reload_calibation');
          console.log("sini calibrate aman")
          return res.status(200).send({ status: 'calibration right', message: "Success" });
        } else {
          console.log("sini calibrate tidak aman")
          // if (check_device_db.lat != '' && check_device_db.lng != '') {
          return res.status(200).send({ status: 'calibration wrong', message: "Success" });

        }
      } else {
        // console.log("sini normal dia lagi")
        // check curren time and last update time if it's more than 12 hours
        const current_time = new Date();
        const last_update_time = cek_device_db.updated_at;
        const diff_time = current_time.getTime() - last_update_time.getTime();
        const diff_hours = diff_time / (1000 * 3600);
        if (diff_hours > 12) {
          // console.log("sini dia lagi 3");
          // cross check if the data is same as last update
          if (longitude != "" && latitude != "") {
            let cek_lng = parseFloat(cek_device_db.lng) - parseFloat(longitude);
            let cek_lat = parseFloat(cek_device_db.lat) - parseFloat(latitude);
            cek_lng = Math.abs(cek_lng);
            cek_lat = Math.abs(cek_lat);
            if (cek_lng > 0.0007 && cek_lat > 0.0007) {
              // update last update time
              // update status
              const current_time = new Date();
              cek_device_db.lat = '';
              cek_device_db.lng = '';
              cek_device_db.status = "calibration";
              // cek_device_db.created_at = current_time;
              // cek_device_db.updated_at = current_time;

              await cek_device_db.save();
              return res.status(200).send({ status: 'device data changed, need calibration', message: "Success" });
            } else {
              const datanya = await update_device_data(cek_device_db, latitude, longitude, soilMoistureValue);
              return res.status(200).send({ status: 'device data updated', message: "Success", data: datanya });
            }
          } else {
            const datanya = await update_device_data(cek_device_db, latitude, longitude, soilMoistureValue);
            return res.status(200).send({ status: 'device data updated', message: "Success", data: datanya });
          }

        } else {
          const datanya = await update_device_data(cek_device_db, latitude, longitude, soilMoistureValue);
          return res.status(200).send({ status: 'device data updated', message: "Success", data: datanya });
        }
      }

    }


  } catch (error) {
    console.log(error);
    res.status(500).send({ status: 2, message: error })
  }
})


router.post('/calibration', async (req, res) => {
  try {
    const id = req.body.id;
    console.log(id);
    if (!id) return res.status(400).send({ status: 2, message: "id is required" });
    // check if device id exist
    const cek_device_db = await deviceModel.findOne({ _id: id });
    if (!cek_device_db) {
      // insert new device
      const new_device = new deviceModel({
        _id: id,
        lat: '',
        lng: '',
        status: "calibration",
      })
      await new_device.save();
    } else {
      // update status
      const current_time = new Date();
      cek_device_db.lat = '';
      cek_device_db.lng = '';
      cek_device_db.status = "calibration";
      cek_device_db.created_at = current_time;
      cek_device_db.updated_at = current_time;

      await cek_device_db.save();
    }

    await newDeviceModel.deleteOne({ _id: id });

    res.status(200).send({ status: 0, message: "Success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: 2, message: err })
  }
})

router.post('/calibrate_map', async (req, res) => {
  const id = req.query.id;
  const lat = -4.007484879014992; //-4.007484879014992, 119.62836226144522
  const lng = 119.62836226144522;

  const update_device_db = await deviceModel.findOneAndUpdate({ _id: id }, { $set: { lat: lat, lng: lng } });


  const cek_device_db = await deviceModel.findOne({ _id: id });
  const datanya = await update_device_data(cek_device_db, '', '', 0);

  res.status(200).send({ status: 0, message: "Success", datanya: datanya });

})


router.get('/device_list', async (req, res) => {
  const device_list = await deviceModel.find({});
  res.status(200).send({ status: true, message: "success", data: device_list });
})

router.get('/device_baru', async (req, res) => {
  const device_list = await newDeviceModel.find({});
  res.status(200).send({ status: true, message: "success", data: device_list });
})

router.get('/hehe', async (req, res) => {
  socket.emit("hehe", { id: "123" });
  res.status(200).send("hahah");
})
module.exports = router;