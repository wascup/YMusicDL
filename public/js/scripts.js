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

function openSongEdit() {
    window.location.href = "/songs";
}

function openLink(url) {
    socket.emit("openLink",url);
}

function searchSong(songQuery) {
    //change windwo location to /?songName
    window.location.href = `/?songName=${songQuery}`;
    document.getElementById("searchButton").disabled = true;
    document.getElementById("searchButton").innerHTML = "Searching..."
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
        liveUpdateEdit(saveSong);
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

function openSettingsModal() {
    var settings = document.getElementById("settingsModal");
    var songsList = document.getElementsByClassName("songslist")[0]
    var txt_downloadPath = document.getElementById("txt_songDownloadPath")
    var cb_normalizeAudio = document.getElementById("cb_normalizeAudio");
    var nb_normalizeAudioDB = document.getElementById("nb_normalizeAudioDB");
    var saveButton = document.getElementById("settingsSaveButton")

    // Request Settings
    socket.emit("getSettings")

    socket.on("receivedSettings",(data) => {
        txt_downloadPath.value = data.songDownloadPath;
        cb_normalizeAudio.checked = data.mp3gainNormalizeAudio;
        nb_normalizeAudioDB.value = data.mp3gainDB;


        // Display the settings Modal
        settings.style.display = "block";
        songsList.style.display = "none"

        // Check for events when they change
        cb_normalizeAudio.addEventListener('change', () => {
            data.mp3gainNormalizeAudio = cb_normalizeAudio.checked;
        });
        txt_downloadPath.addEventListener('change', () => {
            data.songDownloadPath = txt_downloadPath.value;
        });
        nb_normalizeAudioDB.addEventListener("change", () => {
            data.mp3gainDB = parseInt(nb_normalizeAudioDB.value);
        });

        // Save the settings and display the song list again
        saveButton.onclick = function() {
            socket.emit("saveSettings",data);
            socket.on("savedSettings", (result) => {
                if(result == -1) {
                    showInfo("Failed to save settings","#FF1919")
                    return -1;
                } else {
                    showInfo("Saved settings successfully","#1db954")
                    settings.style.display = "none";
                    songsList.style.display = "block"
                    return 0;
                }
            })
        }
    });
}

function closeModal() {
    var modal = document.getElementById("songModal");
    modal.style.display = "none";
}


function showInfo(message,color) {
    var infoDiv = document.getElementById("infoDiv");
    var infoMessage = document.getElementById("infoMessage");
    infoDiv.style.backgroundColor = color;
    infoMessage.innerText = message;
    infoDiv.style.display = "block";
    setTimeout(() => {
        infoDiv.style.display = "none";
    }, 5000);
}