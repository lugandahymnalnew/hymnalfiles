function serFunction(){
    var input = document.getElementById('ser');
    var filter = input.value.toUpperCase();
    var div = document.getElementById('ind');
    var a = div.getElementsByTagName('a');
    if(!null){
        for(i = 0; i < a.length; i++){
            if(a[i].innerHTML.toUpperCase().indexOf(filter)>-1){
                a[i].style.display="";   
            }
            else{
                a[i].style.display="none";
            }
        }
    }
}
