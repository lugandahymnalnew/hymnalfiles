const Client = require('ftp');
const db = require('./mongoDBApi');

async function renameFile(filename, newFilename) {
  const ext = filename.slice(filename.lastIndexOf('.'));
  return newFilename + ext;
}

async function uploadToFTP(req, res) {
  const files = req.files;
  if (!files || files.length === 0) {
    console.log('No files to upload');
    return {file:[]};
  }

  const ftpClient = new Client();

  // Connect to the FTP server
  ftpClient.connect({
    host: process.env.FTP_HOST,
    port: Number(process.env.FTP_PORT || 21),
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
  });

  // On successful FTP connection
  ftpClient.on('ready', async () => {
    let uploadedCount = 0;

    // Upload each file to the FTP server
    await files.forEach(async (file) => {
      const newFilename = await renameFile(file.originalname, "htdocs/uploads/"+file.originalname);
      const remoteFilePath = newFilename;
      const remoteDirectory = remoteFilePath.substring(0, remoteFilePath.lastIndexOf('/'));

      // Create the subdirectory on the FTP server
      ftpClient.mkdir(remoteDirectory, true, async (err) => {
        if (err) {
          console.log(err.message);
          return;
        }

        // Upload the file to the FTP server
        ftpClient.put(file.path, remoteFilePath, async (err) => {
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
  });

  // On FTP connection error
  ftpClient.on('error', (err) => {
    console.log(err.message);
  });
}

module.exports = uploadToFTP;
