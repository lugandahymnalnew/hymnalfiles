function nextSong(){
    // console.log(nextR)
    loadSong(nextR.replace('/',"").replace(".html",""));
}
function prevSong(){
    // console.log(prevL)
    loadSong(prevL.replace('/',"").replace(".html",""));
}

function changeLanguage(){
    // Retrieve the current language from localStorage or default to 'english'
    let currentLanguage = localStorage.getItem('language') || 'english';

    // Toggle the language between 'english' and 'luganda'
    currentLanguage = currentLanguage === 'english' ? 'luganda' : 'english';

    // Update the button text
    $('.lang').text(currentLanguage == 'english' ? 'luganda' : 'english');

    // Save the updated language to localStorage
    localStorage.setItem('language', currentLanguage);
    loadSong(hymnal);

}