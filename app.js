const express = require('express');
const path = require('path');

const app = express();

// Serve all files in the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3300, () => {
  console.log('Server connected at port 3300');
});
