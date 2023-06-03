const snackbar = document.getElementById('install-message');
const fileMessage = document.getElementById('file-message');
const btnIn = document.getElementById("ins");
const spin = document.getElementById("spin");
const ovd = document.getElementById("overlay");

const him = `
<div class="instruction">
  <h3>Installing App on Iphone</h3>
  <h5>Step 1</h5>
  <p>Click on the "Share" Icon</p>
  <img src="src/images/step1.jpg" alt="step 1">
  <h5>Step 2</h5>
  <p>Scroll up and select "Add To Home Screen"</p>
  <img src="src/images/step2.jpg" alt="step 2">
  <br>
  <h5>Step 3</h5>
  <p>Open the App</p>
  <img src="src/images/step3.jpg" alt="step 2">
  <br>
  <h5>Step 4</h5>
  <p>Touch "Main Menu" as shown below. If the App doesnt bring the menu page, skip this step.</p>
  <img src="src/images/step4.jpg" alt="step 4">
  <br>
  <h5>Step 5</h5>
  <p>Now press, the "Install button"</p>
  <img src="src/images/step5.jpg" alt="step 5">
  <br>
  <h5>Step 6</h5>
  <p>Sit Back and relax as the app installs</p>
  <img src="src/images/step6.jpg" alt="step 6">
  <br>
  <h5>Step 7</h5>
  <p>Now the app is fully installed, You can have a nice lovely worship</p>
  <img src="src/images/step7.jpg" alt="step 7">
  <br>
  "Keep a song in your heart"
  <hr>
  <h3>How to update the App</h3>
  To update the app, uninstall it, then install again. I wish you a nice worship experience.
  <button onclick="closeD()">Alright</button>
</div>`;

// Check if the browser supports service workers
// function installApp() {
//   ovd.style.display = "block";
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/service-worker.js')
//       .then(function(registration) {
//         // Service worker registration successful
//         console.log('Service Worker registered with scope:', registration.scope);
//         ovd.style.display = "block";
//         snackbar.classList.add('show');
//         snackbar.innerText = "App is Already Installed";
//         snackbar.innerHTML += `<button onclick="addScreen()">Add app icon to home</button>`;
//         snackbar.innerHTML += `<button onclick="closeD()">Close</button>`;

//         // Display installation message to the client
//         registration.addEventListener('updatefound', function() {
//           spin.style.display = "block";
//           const installingWorker = registration.installing;
//           console.log('Service Worker installing');
//           // Display custom installation message to the client
//           snackbar.innerText = 'App is being installed. Please wait...';

//           installingWorker.addEventListener('statechange', function() {
//             if (installingWorker.state === 'installed') {
//               console.log('Service Worker installed');
//               spin.style.display = "none";
//               snackbar.innerText = 'App has been installed successfully. Now click below. Make sure you tick the option which adds an icon to your home screen.';
//               snackbar.innerHTML += `<button onclick="addScreen()">How to add app to home screen</button>`;
//               snackbar.innerHTML += `<button onclick="closeD()">Okay</button>`;
//               promptAddToHomeScreen();

//               // Show the current file being saved
//               installingWorker.addEventListener('get', function(event) {
//                 const fileName = event.request.url;
//                 console.log('Saving file:', fileName);
//                 // Display the current file being saved in the installation message
//               });
//             }
//           });
//         });
//       })
//       .catch(function(error) {
//         // Service worker registration failed
//         snackbar.innerText = "Installation failed";
//         snackbar.innerHTML += `<button onclick="closeD()">Close</button>`;
//         console.log('Service Worker registration failed:', error);
//       });
//   } else {
//     snackbar.innerText = "Sorry, You cannot install the app in this browser.";
//     snackbar.innerHTML += `<button onclick="closeD()">Close</button>`;
//     console.log('Service Worker is not supported');
//   }
// }

function installApp() {
  ovd.style.display = "block";
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        // Service worker registration successful
        console.log('Service Worker registered with scope:', registration.scope);
        ovd.style.display = "block";
        snackbar.classList.add('show');
        snackbar.innerText = "App is Already Installed";
        snackbar.innerHTML += `<button onclick="addScreen()">How to install on Iphone</button>`;
        snackbar.innerHTML += `<button onclick="closeD()">Close</button>`;

        // Display installation message to the client
        registration.addEventListener('updatefound', function() {
          spin.style.display = "block";
          const installingWorker = registration.installing;
          console.log('Service Worker installing');
          // Display custom installation message to the client
          snackbar.innerText = 'App is being installed. Please wait...';

          installingWorker.addEventListener('statechange', function() {
            if (installingWorker.state === 'installed') {
              console.log('Service Worker installed');
              spin.style.display = "none";
              snackbar.innerText = 'App has been installed successfully. Now click below. Make sure you tick the option which adds an icon to your home screen.';
              snackbar.innerHTML += `<button onclick="addScreen()">How to install App on Iphone</button>`;
              snackbar.innerHTML += `<button onclick="closeD()">Okay</button>`;
              promptAddToHomeScreen();

              // Show the current file being saved
              installingWorker.addEventListener('message', function(event) {
                const fileName = event.data.fileName;
                console.log('Saving file:', fileName);
                fileMessage.innerHTML = `Saving file: ${fileName}`;
              });
            }
          });
        });
      })
      .catch(function(error) {
        // Service worker registration failed
        snackbar.innerText = "Installation failed";
        snackbar.innerHTML += `<button onclick="closeD()">Close</button>`;
        console.log('Service Worker registration failed:', error);
      });
  } else {
    snackbar.innerText = "Sorry, You cannot install the app in this browser.";
    snackbar.innerHTML += `<button onclick="closeD()">Close</button>`;
    console.log('Service Worker is not supported');
  }
}


function promptAddToHomeScreen() {
  window.addEventListener('beforeinstallprompt', function(event) {
    event.preventDefault(); // Prevent the default prompt

    const installPrompt = event;
    snackbar.innerText = "Now Add Icon to home screen";
    snackbar.innerHTML += `<button onclick="addScreen()">Click here if iPhone</button>`;
    btnIn.innerText = "Click here if Windows";
    btnIn.style.display = "block";

    // Show a custom install prompt to the user
    btnIn.addEventListener('click', function() {
      installPrompt.prompt(); // Show the browser's install prompt
      btnIn.style.display = 'none';

      // Wait for the user to respond to the prompt
      installPrompt.userChoice.then(function(choiceResult) {
        if (choiceResult.outcome === 'accepted') {
          snackbar.innerText = "Icon Added successfully";
          snackbar.innerHTML += `<button onclick="addScreen()">Ok</button>`;
          console.log('App installed');
        } else {
          snackbar.innerText = "Shortcut not added.";
          console.log('App installation declined');
          snackbar.innerHTML += `<button onclick="addScreen()">Okay</button>`;
        }
      });
    });
  });
}

// function uninstallApp() {
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.getRegistrations()
//       .then(function(registrations) {
//         registrations.forEach(function(registration) {
//           registration.unregister();
//         });

//         // Clear all caches
//         if ('caches' in window) {
//           caches.keys()
//             .then(function(cacheNames) {
//               if(cacheNames.length < 1){
//                 alert("App is not installed")
//               }
//               else{
//                 cacheNames.forEach(function(cacheName) {
//                   ovd.style.display = "block";
//                   spin.style.display = "block";
//                   fileMessage.innerHTML = "please wait, uninstalling app";
//                   setTimeout(function() {
//                     // Your command or code to execute after 15 seconds
//                     spin.style.display = "none";
//                     fileMessage.innerHTML = "Uninstalled successfully";
//                     fileMessage.innerHTML += `<button onclick="closeD()">Ok</button>`;
//                   }, 28000); // 15 seconds delay in milliseconds (1000 milliseconds = 1 second)
//                   caches.delete(cacheName);
//                 });
//               }
//             });
//         }
//       })
//       .catch(function(error) {
//         alert('There was an error during app uninstallation.');
//         console.log('Error during app uninstallation:', error);
//       });
//   }
// }
function uninstallApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function(registrations) {
        registrations.forEach(function(registration) {
          registration.unregister();
        });

        // Clear all caches and data related to the site
        if ('caches' in window) {
          caches.keys()
            .then(function(cacheNames) {
              if (cacheNames.length < 1) {
                alert("App is not installed");
              } else {
                cacheNames.forEach(function(cacheName) {
                  console.log("cache: "+cacheName)
                  ovd.style.display = "block";
                  spin.style.display = "block";
                  fileMessage.innerHTML = "Please wait, uninstalling app";
                  setTimeout(function() {
                    // Your command or code to execute after a delay
                    spin.style.display = "none";
                    fileMessage.innerHTML = "Uninstalled successfully";
                    fileMessage.innerHTML += `<button onclick="closeD()">Ok</button>`;
                  }, 28000); // 28 seconds delay in milliseconds (1000 milliseconds = 1 second)
                  caches.delete(cacheName);
                });

                // Clear indexedDB data
                indexedDB.databases()
                  .then(function(databases) {
                    console.log("db: "+databases)
                    databases.forEach(function(database) {
                      console.log("database: "+database.name);
                      if (database.name === 'Ennyimba Za Kristo') {
                        indexedDB.deleteDatabase(database.name);
                      }
                    });
                  })
                  .catch(function(error) {
                    console.log('Error deleting indexedDB database:', error);
                  });
              }
            });
        }
      })
      .catch(function(error) {
        alert('There was an error during app uninstallation.');
        console.log('Error during app uninstallation:', error);
      });
  }
}


async function getDeviceInfo() {
    var userAgent = navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    var isAndroid = /Android/.test(userAgent);
    if (isIOS) {
      return true;
    } else if (isAndroid) {
      return false;
    } else {
      return true;
    }
}
async function iosCheck(){
    var min = await getDeviceInfo()
    if(min){
        window.location.href = "/"
    }
    else{
        window.location.href = "https://play.google.com/store/apps/details?id=com.LugandaHymnalNew"
    }
}

function closeD(){
  ovd.style.display = "none";
  fileMessage.innerHTML = "";
  snackbar.innerHTML = "";
  snackbar.style.display = "none";
}

function closeDx(){
  fileMessage.innerHTML = "";
  snackbar.classList.remove('show');
}

function MsgBox(msg,btn){
  ovd.style.display = "block";
  fileMessage.innerHTML = `${msg}`;
  fileMessage.innerHTML += `<button onclick="closeD()">${btn}</button>`;
  snackbar.classList.remove('show');
}

function addScreen(){
  ovd.style.display = "block"
  fileMessage.innerHTML = him
}
