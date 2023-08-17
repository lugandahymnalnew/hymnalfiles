function onc(){
    var input = document.getElementById('siz');
    var filter = input.value;
    var f = (filter + "rem");
	var sh = document.getElementById('txt')
    sh.style.fontSize = f
}
//console.log($('#txt').text().match(/\d+/))
// sorting the text to be shared
//console.log($('.No').html())

// making reference for number of stanzas
var stanzas = ['9','8','7','6','5','4','3','2',];
var loop;
for(var i=0; i<stanzas.length; i++){
    if(!$('#txt').text().match(stanzas[i])){
        //console.log('hi')
    }
    else{
        loop = $('#txt').text().match(stanzas[i])[0];
        break;
    }
}
if(!loop){
    loop = 1;
}
//console.log(loop)
$(document).ready(function(){
    document.title = $('.song b').text();
// creating the control buttons area
var btn_cont = document.createElement('div');
btn_cont.className = "btn_cont";

var play_cont = document.createElement('div');
play_cont.className = "play_cont";
//play button
var btn_play = document.createElement('button');
btn_play.className = "play";
btn_play.innerHTML = 'play';
$(document).on('click','.play',function(){
    play();
});
//stop button
var btn_stop = document.createElement('button');
btn_stop.className = "stop";
btn_stop.innerHTML = 'stop';
$(document).on('click','.stop',function(){
    stop();
});
//share button
var btn_share = document.createElement('button');
btn_share.className = "share";
btn_share.innerHTML = 'share';
$(document).on('click','.share',function(){
    share();
});
//Error button
var btn_err = document.createElement('button');
btn_err.className = "err";
btn_err.innerHTML = 'Report Error';
$(document).on('click','.err',function(){
    E_err();
});

// var btn_nxt = document.createElement('button');
// btn_err.className = "nxt";
// btn_err.innerHTML = 'next';
// $(document).on('click','.nxt',function(){
//     window.location.href = nextR;
// });
// puting buttons in place
$('.tittle-1').after(btn_cont);
$('.tittle-1').after(play_cont);
//(btn_cont).after($('.tittle'))
$(".btn_cont").append(btn_play);
$(".btn_cont").append(btn_stop);
$(".btn_cont").append(btn_share);
$(".btn_cont").append(btn_err);
//console.log(btn_cont.className)
$('.stop').css("display","none")
});
//B4A.CallSub('Display_Menu', true );