function serFunction() {
    setTimeout(() => {
        var input, filter, div, a, i;
        input = document.getElementsByClassName('ser');
        filter = input.value.toUpperCase();
        a = document.getElementsByTagName('a');
        div = a.document.getElementsByClassName('tittle');
        var tit = div.document.getElementsByTagName('b');
        for (i = 0; i < a.length; i++) {
            var res = a[i].tit[0];
            if (res.innerHTML.toUpperCase().indexOf(filter) == -1) {
                a[i].style.display = "";
                return;
            }
            else {
                a[i].style.display = "none";
                return;
            }
        }
    }, 100);
}
