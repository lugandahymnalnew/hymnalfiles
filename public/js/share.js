function share(){
    var No = $(".No").html().trim().replace('<b>', '').replace('</b>','*').replace('<br>', '     ');
    var Song = $(".song").html().trim().replace('<b>', '*').replace('</b>','*').replace('<br>', '\n');
    var text = $("#txt").html().replace('<b>', '').replace('</b>','');
    var ktc="*No. "+No+ "\n\n" + Song + '\n\n' + text;
    var kit; 
    kit = ktc + "\n*Download New Luganda Hymnal from here* \n"
    //console.log(ktc); 
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