function share(){
    var No = $(".No").html().trim().replace('<b>', '').replace('</b>','*').replace('<br>', '     ');
    var Song = $(".song").html().trim().replace('<b>', '*').replace('</b>','*').replace('<br>', '\n');
    var text = $("#txt").html().replace('<b>', '').replace('</b>','');
    var ktc="*No. "+No+ "\n\n" + Song + '\n\n' + text;
	var toDB = $('#txt').html();
    var kit; 
    kit = ktc + "\n*Download New Luganda Hymnal from here* \n"
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

var player1 = `<section id="section3">
<!-- <h2>Custom player and visualizer style</h2> -->
<midi-player
  src="../../midi/${pages[Npg]}.mid"
  sound-font visualizer="#section3 midi-visualizer">
</midi-player>
<!-- <midi-visualizer
  src="${pages[Npg]}.mid">
</midi-visualizer> -->
</section>`

function ussd(num){
    // console.log("hi")
    // trying("B4A.CallSub('Call', true ,num)");
    var telUrl = 'tel:' + encodeURIComponent(num);
    open_link(telUrl);
}
function open_link(link){
  var newTab = window.open(link, '_blank');
  newTab.focus();
    // trying("B4A.CallSub('Open_web', true ,link)");
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
    console.log('hlo')
    sEC("kitarogz@gmail.com",`Hymnal ${pages[Npg]}`,"Write your Error here ");
    // trying("B4A.CallSub('SendError', true, `${pages[Npg]}`,'You can edit the error: ')")
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
  open_link("https://www.worldremit.com/en?amountfrom=100.00&selectfrom=us&currencyfrom=usd&selectto=ug&currencyto=ugx&transfer=bnk");
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