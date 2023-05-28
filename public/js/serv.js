const snackbar = document.getElementById('install-message');
const fileMessage = document.getElementById('file-message');
const installButton = document.getElementById('install-button');
const btnIn = document.getElementById("ins")
const spin = document.getElementById("spin")
const ovd = document.getElementById("overlay")
var him = `
<div class="instruction">
  <h3>Adding app to home screen</h3>
  <h5>step 1</h5>
  <p>Click share Icon as shown bellow</p>
  <img src="src/images/step1.jpg" alt="step 1">
  <h5>step 2</h5>
  <p>select "Add To Home Screen</p>
  <img src="src/images/step2.png" alt="step 2">
  <button onclick="closeD()">Alright</button>
</div>`
      // Check if the browser supports service workers
      function installApp(){
        ovd.style.display = "block"
        if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(function(registration) {
      // Service worker registration successful
      console.log('Service Worker registered with scope:', registration.scope);
      ovd.style.display = "block"
      snackbar.classList.add('show');
      snackbar.innerText = "App is Already Installed";
      snackbar.innerHTML +=`<button onclick="addScreen()">Add app icon to home</button>`;
      // Display installation message to the client
      registration.addEventListener('updatefound', function() {
        installButton.style.display = "none";
        spin.style.display = "block"
        const installingWorker = registration.installing;
        console.log('Service Worker installing');
            // Display custom installation message to the client
            snackbar.innerText = 'App is being installed. Please wait...';

        installingWorker.addEventListener('statechange', function() {
          if (installingWorker.state === 'installed') {
            console.log('Service Worker installed');
            spin.style.display = "none";
            snackbar.innerText = 'App has been installed successfully, Now click below. Make sure you tick the option which adds an icon to your home screen.';
            snackbar.innerHTML +=`<button onclick="addScreen()">How to add app to home screen</button>`;
            promptAddToHomeScreen();

            // Show the current file being saved
            installingWorker.addEventListener('get', function(event) {
              const fileName = event.request.url;
              console.log('Saving file:', fileName);

              // Display the current file being saved in the installation message
            });
          }
        });
      });
    })
    .catch(function(error) {
      // Service worker registration failed
      snackbar.innerText = "Installation failed"
      installButton.style.display = "block"
      console.log('Service Worker registration failed:', error);
    });
} else {
  snackbar.innerText = "Sorry, You can not install the app in this browser."
  installButton.style.display = "block"
  console.log('Service Worker is not supported');
}
      }

      function promptAddToHomeScreen() {
        window.addEventListener('beforeinstallprompt', function(event) {
          event.preventDefault(); // Prevent the default prompt
      
          const installPrompt = event;
          snackbar.innerText = "Now Add Icon to home screen";
          snackbar.innerHTML +=`<button onclick="addScreen()">Click here if Iphone</button>`;
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
                console.log('App installed');
                installButton.style.display = "block";
              } else {
                snackbar.innerText = "Shortcut not added.";
                console.log('App installation declined');
                installButton.style.display = "block";
              }
            });
          });
        });
      }
      

function uninstallApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function(registrations) {
        registrations.forEach(function(registration) {
          registration.unregister();
        });

        // Clear all caches
        if ('caches' in window) {
          caches.keys()
            .then(function(cacheNames) {
              cacheNames.forEach(function(cacheName) {
                console.log(cacheName)
                caches.delete(cacheName);
              });
            });
        }

        alert('App has been uninstalled.');
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
  ovd.style.display = "none"
}

function addScreen(){
  ovd.style.display = "block"
  fileMessage.innerHTML = him
}
