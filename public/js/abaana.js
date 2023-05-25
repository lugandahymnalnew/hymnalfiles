$(document).ready(function(){
    var share_div = document.createElement('div');
    share_div.className = 'shareD';
    var share_btn = document.createElement('button');
    share_btn.className = 'share';
    share_btn.innerHTML = 'share';
    share_btn.onclick = 'share_a()';
    $('.txt').prepend(share_div);
    $('.shareD').append(share_btn);
    $(document).on('click','.txt .share', function(){
        //console.log('kikola');
        var ine = $('.txt .share').index(this);
        //console.log("thks");
        var id = "*Mu nnyimba z'abaana*\n\n";
        id = id + $('.txt').eq(ine).html();
        // console.log(id)
        share_a(id);
    });
    function share_a(inm){
        // removing button from text
        inm = inm.replace('<div class="shareD"><button class="share">share</button></div><div class="song-h">','');
		// console.log(inm)
        inm = inm.replace(/<h2>/g,'').replace('<b>', '').replace('</b>','').replace(/<\/h2>/g,'\n').replace(/<h3>/g,'').replace(/<\/h3>/g,'\n');
        // console.log(inm);
        inm = inm.replace('</div>','')
        inm = inm + "\n*Download New Luganda Hymnal from here* \n https://ictgoldenstar.blogspot.com/2022/05/download-new-luganda-hymnal-from-here.html"
        console.log(inm)
        trying("B4A.CallSub('ShareMessage', true ,inm)");
        // let string = ":insertx: :insertx: :inserty: :inserty: :insertz: :insertz:";
        // let newstring = string.replace(/:insertx:/g, 'hello!');
        // console.log(newstring);
        }
});
