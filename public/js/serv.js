function uninstallApp() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(function(registrations) {
          registrations.forEach(function(registration) {
            registration.unregister();
          });
          alert('App has been uninstalled.');
        })
        .catch(function(error) {
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
    var min = getDeviceInfo()
    if(min){
        window.location.href = "/"
    }
    else{
        window.location.href = "https://play.google.com/store/apps/details?id=com.LugandaHymnalNew"
    }
}