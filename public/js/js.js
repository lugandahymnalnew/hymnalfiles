function inser(nu){
    var num = document.getElementById('num');
    
    if(num.value+nu < 251){
        num.value = num.value+nu;
    }
	else{
		document.getElementById('alert_container').style.display='block';
	}
    return;
}