const express = require("express");
const webviewApp = express();
const port = 9239;
const {
    app,
    BrowserWindow
} = require("electron");
const NodeID3 = require("node-id3");
const bodyParser = require("body-parser");
const ytsearch = require("yt-search");
const fs = require("fs");
const Path = require("path");
const http = require("http");
const server = http.createServer(webviewApp);
const {
    Server
} = require("socket.io");
const io = new Server(server);
var settings = require("./config.json")

var debug = false;

if (!debug) {
    const createWindow = () => {
        const win = new BrowserWindow({
            width: 1000,
            height: 800,
            title: "YMusicDL",
            autoHideMenuBar: true,
            resizable: false,
        });

        win.loadURL(`http://localhost:${port}/`);
    };

    app.whenReady().then(() => {
        createWindow();
    });
}

webviewApp.set("view engine", "ejs");
webviewApp.use(express.static("public"));
webviewApp.use(express.static("views"));
webviewApp.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
webviewApp.use(bodyParser.json());

webviewApp.get("/", (req, res) => {
    var query = req.query.songName;
    if (query == undefined || query == "" || query == null || query == " ") {
        res.render("main", {
            results: [],
        });
        return;
    }
    try {
        searchYoutube(query, (results) => {
            res.render("main", {
                results: results,
                query: query,
            });
        });
    } catch (error) {
        console.log(error);
        res.render("main", {
            results: [],
        });
    }
});

webviewApp.get("/songs", (req, res) => {
    res.render("songs");
});

server.listen(port, () => console.log(`http://localhost:${port}`));

///////////////
// SOCKETIO  //
///////////////

var userSocket = null;

io.on("connect", (socket) => {
    userSocket = socket;
    socket.on("downloadSong", (data) => {
        downloadVideo(data.songurl, data.songtitle);
    });
    socket.on("getSongData", (data) => {
        getSongData(data.fileLocation).then((songData) => {
            socket.emit("songData", songData);
        });
    });
    //saveSongData
    socket.on("saveSongData", async (data) => {
        var song = NodeID3.read(data.fileLocation);
        song.title = data.title;
        song.artist = data.artist;
        song.album = data.album;
        if (song.albumArt) {
            base64toIMG(data.albumArt, songPath + "\\temp.jpg").then((path) => {
                song.image = {
                    mime: "jpeg",
                    type: {
                        id: 3,
                        name: "front cover",
                    },
                    description: "description",
                    imageBuffer: fs.readFileSync(path),
                };
                fs.unlinkSync(path);
                NodeID3.update(song, data.fileLocation);
            });
        }
        song.year = data.year;


        NodeID3.update(song, data.fileLocation);
    });

    socket.on("openLink", (link) => {
        var OS = process.platform;
        if (OS == 'win32') {
            var command = "start \"" + link + "\"";
        } else {
            var command = "xdg-open \"" + link + "\"";
        }
        require("child_process").exec(command)
    });
    socket.on("openSong", (Location) => {
        var OS = process.platform;
        if (OS == 'win32') {
            var command = "\"" + Location + "\"";
        } else {
            var command = "xdg-open \"" + link + "\"";
        }
        require("child_process").exec(command)
    });

    socket.on("openFolder", (Location) => {
        var OS = process.platform;
        var realSongPath = Path.resolve(__dirname, settings.songDownloadPath);
        if (OS == 'win32') {
            var command = "explorer \"" + realSongPath + "\"";
        } else {
            var command = "xdg-open \"" + realSongPath + "\"";
        }
        require("child_process").exec(command)
    });


    socket.on("getSongs", (query) => {
        getAllSongs(query,(songs) => {
            socket.emit("downloadedSongs", songs);
        });
    });


    // settings
    socket.on("getSettings", () => {
        socket.emit("receivedSettings", settings)
    })


    socket.on("saveSettings", (data) => {
        settings = data;
        console.log(settings.songDownloadPath)
        writeConfig((result) => {
            socket.emit("savedSettings", result)
        })
    })
});

//////////////////////
// HELPER FUNCTIONS //
//////////////////////

function searchYoutube(query, callback) {
    var searchTerms = query;
    if(!searchTerms.includes(".com")) {
        if (experimentalSearchTerms) {
            searchTerms += ' "topic"'
        }
    }

    ytsearch(searchTerms, (err, results) => {
        var trueResults = [];
        if(searchTerms.includes(".com")) {
            var song = {
                albumArt: results.videos[0].thumbnail,
                title: results.videos[0].title,
                artist: results.videos[0].author.name,
                url: results.videos[0].url,
                year: results.videos[0].year,
            };
            trueResults.push(song);
            callback(trueResults);
            return;
        }

        if (err) {
            console.log(err);
        } else {
            for (var i = 0; i < results.videos.length; i++) {
                //if the video has an excluded word, skip it
                var skip = false;
                for (var j = 0; j < excludedWords.length; j++) {
                    if (results.videos[i].title.includes(excludedWords[j])) {
                        skip = true;
                    }
                }
                if (skip) {
                    continue;
                } else {
                    var song = {
                        albumArt: results.videos[i].thumbnail,
                        title: results.videos[i].title,
                        artist: results.videos[i].author.name,
                        url: results.videos[i].url,
                        year: results.videos[i].year,
                    };
                    trueResults.push(song);
                }
            }
            callback(trueResults);
        }
    });
}

const util = require("util");
const execFile = util.promisify(require("child_process").execFile);

async function downloadVideo(url, title) {
    var outputFilePath = `${songDownloadPath}//${title}.mp3`;
    if (fs.existsSync(outputFilePath)) {
        outputFilePath = `${songDownloadPath}//${title}(${getRandomInt(1000)}).mp3`;
    }

    const parameters = [
        "-x",
        "--audio-format",
        "mp3",
        "--add-metadata",
        "--audio-quality",
        "0",
        "--output",
        outputFilePath,
        "--ppa",
        "EmbedThumbnail+ffmpeg_o:-c:v mjpeg -vf crop=\"'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'\"",
        url,
    ];

    if (downloadArt) {
        parameters.push("--embed-thumbnail");
    }

    try {
        await execFile(backendDownloader, parameters);

        // Use node-id3 to get artist and song name
        const song = NodeID3.read(outputFilePath);



        const description = song.userDefinedText.find(
            (x) => x.description === "description") ?.value;

        if (description) {
            const yearMatch = description.match(/\d{4}/);
            if (yearMatch) {
                const year = yearMatch[0];
                NodeID3.update({
                    year
                }, outputFilePath);
            }
        }

        // Normalize audio
        if (mp3gainNormalizeAudio) {
            mp3gainFile(outputFilePath);
        }

        if (experimentalTitler) {
            var titleSplit = song.title.split(" - ");
            if (titleSplit.length == 2) {
                var artist = titleSplit[0];
                var songName = titleSplit[1];
                for (var i = 0; i < experimentalTitlerRemover.length; i++) {
                    songName = songName.replace(experimentalTitlerRemover[i], "");
                }
                NodeID3.update({
                    artist,
                    title: songName
                }, outputFilePath);
            }
        }


        var socketData = {
            url: url,
            fileLocation: outputFilePath,
        };
        console.log("Saved to: " + socketData.fileLocation)
        userSocket.emit("DownloadComplete", socketData);

    } catch (err) {
        console.error(err);
    }
}


function mp3gainFile(path) {
    var child = require("child_process").execFile;
    var executablePath = "mp3gain";

    var parameters = ["-r", "-c", "-d", mp3gainDB, path];
    var childProcess = child(executablePath, parameters, function (err, data) {
        if (err) {
            console.error(err);
            return;
        }
    });
}

async function getSongData(fileLocation) {
    var song = NodeID3.read(fileLocation);
    var songData = {
        title: song.title,
        artist: song.artist,
        album: song.album,
        year: song.year,
        albumArt: song.image.imageBuffer.toString("base64"),
        fileLocation: fileLocation,
    };

    return songData;
}



async function base64toIMG(base64, outputPath) {
    return new Promise((resolve, reject) => {
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, ''); // Remove data URI prefix
        const buffer = Buffer.from(base64Data, 'base64');

        fs.writeFile(outputPath, buffer, 'binary', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(outputPath);
            }
        });
    });
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

async function getAllSongs(query, callback) {
    var query = query || "";
    var songs = [];
    var realPath = Path.resolve(__dirname, settings.songDownloadPath) + "/";
    fs.readdir(realPath, (err, files) => {
        if (err) {
            console.log(err);
        } else {

            files = files.filter((file) => {
                return file.includes(".mp3");
            });
            
            if (query != "") {
                files = files.filter((file) => {
                    var fileName = file.split(".mp3")[0].toLowerCase();
                    return fileName.includes(query.toLowerCase());
                });
            }

            files.forEach((file) => {
                var song = NodeID3.read(realPath + file);
                var songData = {
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    year: getSongYear(song),
                    albumArt: song.image.imageBuffer.toString("base64"),
                    fileLocation: realPath + file,
                };
                songs.push(songData);
            });
            
        }
        callback(songs);
    });
}



function getSongYear(song) {
    if (song.originalReleaseTime) {
        return song.originalReleaseTime.substring(0, 4);
    }
    if (song.recordingTime) {
        return song.recordingTime.substring(0, 4);
    }
    if (song.userDefinedText) {
        const year = song.userDefinedText.find(
            (x) => x.description === "year"
        ) ?.value;
        if (year) {
            return year;
        }
    }

    if (song.year) {
        return song.year;
    }

    return "";
}

var backendDownloader = settings.backendDownloader;
var songDownloadPath = Path.resolve(__dirname, settings.songDownloadPath);
var excludedWords = settings.excludedWords;
var mp3gainDB = settings.mp3gainDB;
var downloadArt = settings.downloadArt;
var mp3gainNormalizeAudio = settings.mp3gainNormalizeAudio;
var experimentalSearchTerms = settings.experimentalSearchTerms;
var experimentalTitler = settings.experimentalTitler;
var experimentalTitlerRemover = settings.experimentalTitlerRemover;

function reinitializeVariables() {
    backendDownloader = settings.backendDownloader;
    songDownloadPath = Path.resolve(__dirname, settings.songDownloadPath);
    excludedWords = settings.excludedWords;
    mp3gainDB = settings.mp3gainDB;
    downloadArt = settings.downloadArt;
    mp3gainNormalizeAudio = settings.mp3gainNormalizeAudio;
    experimentalSearchTerms = settings.experimentalSearchTerms;
    experimentalTitler = settings.experimentalTitler;
    experimentalTitlerRemover = settings.experimentalTitlerRemover;
}

function writeConfig(callback) {
    try {
        fs.writeFileSync("./config.json", JSON.stringify(settings, null, 4));
        reinitializeVariables();
        callback(1, null)
    } catch (e) {
        callback(e, null)
    }
}