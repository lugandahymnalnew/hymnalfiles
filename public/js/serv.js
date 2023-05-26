const snackbar = document.getElementById('install-message');
const fileMessage = document.getElementById('file-message');
const installButton = document.getElementById('install-button');
const ovd = document.getElementById("overlay")
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
      snackbar.innerText = "Already Installed"
      
      // Display installation message to the client
      registration.addEventListener('updatefound', function() {
        installButton.style.display = "none";
        const installingWorker = registration.installing;
        console.log('Service Worker installing');
            // Display custom installation message to the client
            snackbar.innerText = 'App is being installed. Please wait...';

        installingWorker.addEventListener('statechange', function() {
          if (installingWorker.state === 'installed') {
            console.log('Service Worker installed');
            snackbar.innerText = 'App has been installed successfully, Now click below. Make sure you tick the option which adds an icon to your home screen.';
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
      console.log('Service Worker registration failed:', error);
    });
} else {
  snackbar.innerText = "Sorry, for some reason you cant use this feature."
  console.log('Service Worker is not supported');
}
      }

function promptAddToHomeScreen() {
  window.addEventListener('beforeinstallprompt', function(event) {
    event.preventDefault(); // Prevent the default prompt
    snackbar.innerText = "Now Adding Icon to home screen"
    const installPrompt = event;
    installButton.innerText = "Click here, "
    installButton.style.display = "block";
    // Show a custom install prompt to the user

    installButton.addEventListener('click', function() {
      installPrompt.prompt(); // Show the browser's install prompt
      installButton.style.display = 'none';

      // Wait for the user to respond to the prompt
      installPrompt.userChoice.then(function(choiceResult) {
        if (choiceResult.outcome === 'accepted') {
          snackbar.innerText = "Icon Added succesfully"
          console.log('App installed');
          ovd.style.display = "none"
        } else {
          snackbar.innerText = "Shortcut not added."
          console.log('App installation declined');
          ovd.style.display = "none"
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
                caches.delete(cacheName);
              });
            });
        }

        alert('App has been uninstalled.');
          window.location.href = "/"
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

