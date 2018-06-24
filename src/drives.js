const driveList = require('drivelist');

module.exports.getDrives = async () => new Promise((resolve, reject) => driveList.list((error, drives) => {
  if (error) {
    return reject(error);
  }
  resolve(drives);
}))