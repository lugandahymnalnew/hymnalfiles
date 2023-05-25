function onc(){
    setTimeout(() => {
        function fo(){
    var input = document.getElementById('siz');
    var filter = input.value;
    var f = (filter + "rem");
    var war = document.getElementById('warn');
    var p = war.getElementsByTagName('p');
    for (i = 0; i < p.length; i++){
        p[i].style.fontSize = f
    }
}
    }, 50);
}