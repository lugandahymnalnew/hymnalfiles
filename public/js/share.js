function share(){
    var No = $(".No").html().trim().replace('<b>', '').replace('</b>','*').replace('<br>', '     ');
    var Song = $(".song").html().trim().replace('<b>', '*').replace('</b>','*').replace('<br>', '\n');
    var text = $("#txt").html().replace('<b>', '').replace('</b>','');
    var ktc="*No. "+No+ "\n\n" + Song + '\n\n' + text;
    var kit; 
    kit = ktc + "\n*Download New Luganda Hymnal from here* \n https://newlugandahymnal.onrender.com/download.html"
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
function ussd(num){
    //console.log("hi")

    trying("B4A.CallSub('Call', true ,num)");
}
function open_link(link){
    trying("B4A.CallSub('Open_web', true ,link)");
}
function play(){
    $('.play').css("display","none");
    $('.stop').css("display","");
    trying("B4A.CallSub('DoLoad', true, song_midi, loop)");
}
function stop(){
    $('.play').css("display","")
    $('.stop').css("display","none")
    trying("B4A.CallSub('Stop', true)")
}
function E_err(){
    console.log('hlo')
    trying("B4A.CallSub('SendError', true, `${pages[Npg]}`,'You can edit the error: ')")
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
	trying("B4A.CallSub('Open_web', true, 'https://pay.wave.com')")
}
function paypal(){
	trying("B4A.CallSub('Open_web', true, 'https://paypal.me/newlugandahymnal?country.x=en_US')")
}
