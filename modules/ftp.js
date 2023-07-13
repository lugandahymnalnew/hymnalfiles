const Client = require('ftp');
const con = require('../config.json');

async function uploadToFTP(req, res) {
  const files = req.files;
  if (!files || files.length === 0) {
    console.log('No files to upload');
    return ;
  }

  const ftpClient = new Client();

  // Connect to the FTP server
  ftpClient.connect({
    host: con.ftp.host,
    port: 21,
    user: con.ftp.username,
    password: con.ftp.password,
  });

  // On successful FTP connection
  ftpClient.on('ready',async () => {
    let uploadedCount = 0;

    // Upload each file to the FTP server
    await files.forEach(async (file) => {
       ftpClient.put(file.path, file.originalname, (err) => {
        if (err) {
          console.log(err.message);
          return;
        }

        uploadedCount++;

        if (uploadedCount === files.length) {
          console.log('All files uploaded successfully');
          // Close the FTP connection
          ftpClient.end();
        }
      });
    });
  });

  // On FTP connection error
  ftpClient.on('error', (err) => {
    console.log(err.message);
  });
}

module.exports = uploadToFTP;
