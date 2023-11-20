var socket = io();
var songs = [];

socket.on("downloadedSongs", (data) => {
    songs = data;
    songs.forEach(function (song) {
        addSong(song);
    });

});

var searchBox = document.getElementById("songName");
var songResults = document.getElementById("songsList");



window.onload = function () {
    clearSongs();
    socket.emit("getSongs");
};

function clearSongs() {
    songResults.innerHTML = "";
}


function openSong(fileLoc) {
    socket.emit("openSong", fileLoc);
}

function openFolder(fileLoc) {
    socket.emit("openFolder", fileLoc);
}

function addSong(song) {
    var songDiv = document.createElement("div");
    var thumbDiv = document.createElement("div");
    var thumbImg = document.createElement("img");
    var songTitleSpan = document.createElement("span");
    var songArtistSpan = document.createElement("span");
    var songYearSpan = document.createElement("span");
    songDiv.className = "songResult";
    songDiv.id = "FILE_" + song.fileLocation;
    thumbDiv.className = "square-container";
    thumbDiv.addEventListener("click", function () {
        openSong(song.fileLocation);
    });
    thumbImg.className = "songTitle square-image";
    thumbImg.src = "data:image/png;base64, " + song.albumArt;
    songTitleSpan.className = "songTitle";
    songTitleSpan.innerHTML = song.title + "<br>";
    songArtistSpan.className = "songArtist";
    songArtistSpan.innerHTML = song.artist + " - (" + song.album + ")<br>";
    songYearSpan.className = "songYear";
    songYearSpan.innerHTML = song.year;
    var newEditElement = document.createElement("button");
    newEditElement.textContent = "EDIT";
    newEditElement.id = song.fileLocation;
    newEditElement.className = "editButton";
    newEditElement.onclick = function () {
        socket.emit("getSongData", song);
        socket.on("songData", (songData) => {
            showModal(songData, song.fileLocation);
        });
    };

    songDiv.appendChild(newEditElement);
    songDiv.appendChild(thumbDiv);
    thumbDiv.appendChild(thumbImg);
    songDiv.appendChild(songTitleSpan);
    songDiv.appendChild(songArtistSpan);
    songDiv.appendChild(songYearSpan);
    songResults.appendChild(songDiv);
    
}

function liveUpdateEdit(song) {
    var songDiv = document.getElementById("FILE_" + song.fileLocation);
    var thumbDiv = songDiv.getElementsByClassName("square-container")[0];
    var thumbImg = thumbDiv.getElementsByClassName("songTitle")[0];
    var songTitleSpan = songDiv.getElementsByClassName("songTitle")[0];
    var songArtistSpan = songDiv.getElementsByClassName("songArtist")[0];
    var songYearSpan = songDiv.getElementsByClassName("songYear")[0];
    if (song.albumArt) {
        thumbImg.src = "data:image/png;base64, " + song.albumArt;
    }
    songTitleSpan.innerHTML = song.title + "<br>";
    songArtistSpan.innerHTML = song.artist + "<br>";
    songYearSpan.innerHTML = song.year;
}


searchBox.addEventListener("keyup", function (event) {
    event.preventDefault();
    clearSongs();
    var query = searchBox.value.toLowerCase();
    var results = [];
    if (query.length > 0) {
        results = songs.filter(function (song) {
            return song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
        });
    } else {
        results = songs;
    }
    results.forEach(function (song) {
        addSong(song);
    });

});
