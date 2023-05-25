$('.share').on("click", function() {
    var restorepage = document.body.innerHTML;
    var printcontent = $('a')[34].innerHTML;
    document.body.innerHTML = printcontent;
    window.print();
    document.body.innerHTML = restorepage;
    var title = document.createElement('div');
})