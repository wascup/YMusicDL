var socket = io();

window.addEventListener("load", (event) => {
    document
        .getElementById("songName")
        .addEventListener("keyup", function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                document.getElementById("searchButton").click();
            }
        });
});

function searchSong(songQuery) {
    //change windwo location to /?songName
    window.location.href = `/?songName=${songQuery}`;
    document.getElementById("searchButton").disabled = true;
    document.getElementById("searchButton").innerHTML = "Searching...";
}

function downloadSong(caller, songtitle, songurl) {
    caller.textContent = "DOWNLOADING...";
    var data = {
        songurl,
        songtitle,
    };
    socket.emit("downloadSong", data);
}

socket.on("DownloadComplete", (data) => {
    //get the download button with the id of the video url
    var info = {
        url: data.url,
        fileLocation: data.fileLocation,
    };
    var downloadButton = document.getElementById(info.url);
    downloadButton.textContent = "DOWNLOADED";
    downloadButton.disabled = true;
    downloadButton.style.backgroundColor = "green";
    downloadButton.style.color = "white";
    var mainDiv = downloadButton.parentElement;
    var newEditElement = document.createElement("button");
    newEditElement.textContent = "EDIT";
    newEditElement.id = info.fileLocation;
    newEditElement.className = "editButton";
    newEditElement.onclick = function () {
        socket.emit("getSongData", info);
        socket.on("songData", (songData) => {
            showModal(songData, info.fileLocation);
        });
    };

    mainDiv.prepend(newEditElement);
});


var changedArt = false;

function showModal(Song, fileLocation) {
    changedArt = false;
    console.log(Song);
    var modal = document.getElementById("songModal");
    var songTitleHeader = document.getElementById("songTitleHeader");
    var songAlbumArt = document.getElementById("songAlbumArt");
    var songTitle = document.getElementById("songTitle");
    var songArtist = document.getElementById("songArtist");
    var songAlbum = document.getElementById("songAlbum");
    var songYear = document.getElementById("songYear");

    songTitleHeader.textContent = "Edit Song: " + Song.title;
    songTitle.value = Song.title;
    songArtist.value = Song.artist;
    songAlbum.value = Song.album;
    songYear.value = Song.year;
    songAlbumArt.src = "data:image/png;base64, " + Song.albumArt;

    var saveButton = document.getElementById("saveButton");
    saveButton.onclick = function () {
        if (changedArt) {
            var saveSong = {
                title: songTitle.value,
                artist: songArtist.value,
                album: songAlbum.value,
                year: songYear.value,
                albumArt: songAlbumArt.src,
                fileLocation: fileLocation,
            };
        } else {
            var saveSong = {
                title: songTitle.value,
                artist: songArtist.value,
                album: songAlbum.value,
                year: songYear.value,
                fileLocation: fileLocation,
            };
        }
        socket.emit("saveSongData", saveSong);
        closeModal();
    };
    var changeArtButton = document.getElementById("changeArt");
    changeArtButton.onclick = function () {
        var fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = function () {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function () {
                var base64 = reader.result;
                songAlbumArt.src = base64;
                changedArt = true;
            };
        };
        fileInput.click();

    };

    modal.style.display = "block";
}

function closeModal() {
    var modal = document.getElementById("songModal");
    modal.style.display = "none";
}