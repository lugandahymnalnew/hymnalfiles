function share(){
    // var No = $(".No").html().trim().replace('<b>', '').replace('</b>','*').replace('<br>', '     ');
    var No = $('#number').text().trim()+"* \n"+$('#EngNo').text();
    // var Song = $(".song").html().trim().replace('<b>', '*').replace('</b>','*').replace('<br>', '\n');
    var Song = "*"+$('#song').text().trim()+"* \n"+$('#EngTit').text(); // $(".song").text();
    var text = $("#txt").html().replace('<b>', '').replace('</b>','');
    var ktc="*No. "+No+ "\n\n" + Song + '\n' + text;
	var toDB = $('#txt').html();
    var kit; 
    kit = ktc + "*Download New Luganda Hymnal from here* \n"
    // console.log(ktc); 
	
// 	const lines = toDB.trim().split('\n');



// let jsonData = {};
// let currentKey = "";
// let currentStanza = [];
// let counting = 0;

//   jsonData['number'] = $('.No b').text();
//   jsonData['EngNo'] = $('.No').html().split('<br>')[1].trim();

//   jsonData['An'] = $('.an').text().trim();

//   jsonData['signUp'] = $('.sign').html().split('<br>')[0].trim();
//   jsonData['signDown'] = $('.sign').html().split('<br>')[1].trim();

//   jsonData['song'] = $('.song b').text();
//   jsonData['EngTit'] = $('.song').html().split('<br>')[1].trim();

//   jsonData['doh'] = $('.comp b').text();
//   jsonData['composer'] = $('.comp').html().split('<br>')[0].trim();

  
// jsonData['lyrics'] = {};

// lines.forEach(line => {
//   if(/^\s*$/.test(line)){
//     jsonData['lyrics'][currentKey] = currentStanza;
//     currentKey = "";
//     currentStanza = [];
//   }
//   else{
//     if(/^\d+\./.test(line)){
//       if (!currentKey) {
//         currentKey = "stanza "+ parseInt(line.match(/^\d+/));
//       }
//     }
//     else{
//       if(!currentKey) {
//         if (counting > 0){
//           currentKey = "chorus "+ (counting+1);
//           counting++;
//         }
//         else{
//           currentKey = "chorus 1";
//           counting++;
//         }
//       }
//     }
//     currentStanza.push(line.replace(/\d+\./, "").trim());
//   }
// });

// // Add the last stanza
// jsonData['lyrics'][currentKey] = currentStanza;

// console.log(JSON.stringify(jsonData, null, 2));
	
  if(trying("B4A.CallSub('ShareMessage', true ,kit);")){
    console.log('shared');
		return
	}
	else{
		if (navigator.share) {
		navigator.share({
		  title: 'Sharing Hymn',
		  text: kit,
		  url: 'https://newlugandahymnal.onrender.com/download.html'
		})
		  .then(function () {
			console.log('Kit shared successfully.');
		  })
		  .catch(function (error) {
			console.error('Error sharing kit:', error);
		  });
	  }
    else {
      console.log(kit)
      alert('Your device does not support sharing.');
    }
	}

  // ... Code to populate jsonData ...
  
  // Convert jsonData to a JSON string
  // const jsonDataString = JSON.stringify(jsonData);
  
  // // Define the URL of the server route
  // const url = '/sendSong';  // Change this to the actual route URL
  
  // Make a POST request using the fetch API
  // fetch(url, {
  //     method: 'POST',
  //     headers: {
  //         'Content-Type': 'application/json'
  //     },
  //     body: jsonDataString
  // })
  // .then(response => {
  //     if (response.ok) {
  //         return response.json();
  //     } else {
  //         throw new Error('Failed to send JSON data.');
  //     }
  // })
  // .then(data => {
  //     console.log('Server response:', data);
  // })
  // .catch(error => {
  //     console.error('Error:', error);
  // });
  
}

// The player markup is only used on the hymn pages, where swipe.js defines
// "pages" and "Npg" and is loaded before this file. On the donate page neither
// exists, so this must not throw: an error here would stop the rest of this
// file from running, which is where ussd(), wave() and paypal() live.
var player1 = (typeof pages === 'undefined' || typeof Npg === 'undefined') ? '' : `<section id="section3">
<!-- <h2>Custom player and visualizer style</h2> -->
<midi-player
  src="../../midi/${pages[Npg]}.mid"
  sound-font visualizer="#section3 midi-visualizer">
</midi-player>
<!-- <midi-visualizer
  src="${pages[Npg]}.mid">
</midi-visualizer> -->
</section>`

function player1Update(){
  if (typeof pages === 'undefined' || typeof Npg === 'undefined') { return ''; }
  player1 = `<section id="section3">
  <!-- <h2>Custom player and visualizer style</h2> -->
  <midi-player
    src="../../midi/${pages[Npg]}.mid"
    sound-font visualizer="#section3 midi-visualizer">
  </midi-player>
  <!-- <midi-visualizer
    src="${pages[Npg]}.mid">
  </midi-visualizer> -->
  </section>`
  return player1
}

function ussd(num){
    // The '#' terminator is encoded only where the platform needs it: iOS
    // rejects a raw '#' inside a tel: href, while Android accepts one.
    // A plain anchor is used rather than window.open, which popup blockers
    // stop and which opens a blank tab on most phones.
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var code = ios ? String(num).replace(/#/g, '%23') : String(num);
    var link = document.createElement('a');
    link.href = 'tel:' + code;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function open_link(link){
    var newTab = window.open(link, '_blank');
    // A blocked popup leaves newTab null, and calling focus() on it throws.
    if (newTab && typeof newTab.focus === 'function') { newTab.focus(); }
}

function play(){
    $('.play').css("display","none");
    $('.stop').css("display","");
    $('.play_cont').html(player1);
    // trying("B4A.CallSub('DoLoad', true, song_midi, loop)");
}
function stop(){
    $('.play').css("display","")
    $('.stop').css("display","none")
    $('.play_cont').html("");
    // trying("B4A.CallSub('Stop', true)")
}
function E_err(){
    var hymnNumber = pages[Npg];
    window.location.href = '/hymns/' + encodeURIComponent(hymnNumber) + '/edit';
}
function N_next(){
    //console.log("next link: "+next)
	window.location.href = next;
}
function P_prev(){
    //console.log("prev link: "+prev)
	window.location.href = prev;
}
function wave(){
	// trying("B4A.CallSub('Open_web', true, 'https://pay.wave.com')")
  // No amount and no forced corridor: the donor chooses both. The old link
  // pre-loaded every visitor with a $100 gift and locked the USD to UGX
  // corridor, which excluded donors paying from another country.
  open_link("https://www.worldremit.com/en");
}
function paypal(){
	// trying("B4A.CallSub('Open_web', true, 'https://paypal.me/newlugandahymnal?country.x=en_US')")
  open_link('https://paypal.me/newlugandahymnal?country.x=en_US');
}

function sEC(rec, sub, bod) {
  var mailtoUrl = 'mailto:' + rec +
    '?subject=' + encodeURIComponent(sub) +
    '&body=' + encodeURIComponent(bod);
    open_link(mailtoUrl);
}
