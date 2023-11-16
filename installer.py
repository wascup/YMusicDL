from sys import platform
import os
import shutil
import subprocess
import requests, zipfile, io

class ymusicdl_installer:
    def __init__(self):
        self.is_ytdlp_installed = self.__check_if_ytdlp_is_installed()
        self.is_ffmpeg_installed = self.__check_if_ffmpeg_is_installed()

    def install(self):
        # install for windows
        if platform == "win32":
            self.__install_for_win32()
        
        # TODO: install for Linux

    def __check_if_ytdlp_is_installed(self):
        output = subprocess.getoutput("yt-dlp")
        if "yt-dlp: error: You must provide at least one URL." in output:
            return True
        return False
    
    def __check_if_ffmpeg_is_installed(self):
        output = subprocess.getoutput("ffmpeg")
        if "ffmpeg version" in output:
            return True
        return False
    
    def __install_ytdlp(self):
        print("-- installing yt-dlp")
        subprocess.getoutput("pip install yt-dlp")
        print("-- yt-dlp successfully installed")


    def __install_for_win32(self):
        print("-- installing YMusicDL for Windows")
        if self.is_ytdlp_installed == False:
            self.__install_ytdlp()

        if self.is_ffmpeg_installed == False:
            self.__install_ffmpeg_win32()

        self.__install_node_modules()
        print("-- installation complete")

    def __install_ffmpeg_win32(self):
        print("-- installing ffmpeg")
        download_request = requests.get("https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip")
        print("-- zipping ffmpeg")
        downloaded_zipfile = zipfile.ZipFile(io.BytesIO(download_request.content))
        print("-- unzipping ffmpeg")
        downloaded_zipfile.extractall("./")
        print("-- moving ffmpeg files")
        os.rename("./ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe", "./ffmpeg.exe")
        os.rename("./ffmpeg-master-latest-win64-gpl/bin/ffplay.exe", "./ffplay.exe")
        os.rename("./ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe", "./ffprobe.exe")
        shutil.rmtree("./ffmpeg-master-latest-win64-gpl/") # shutil because os isn't reliable
        print("-- ffmpeg successfully installed")

    def __install_node_modules(self):
        print("-- installing node modules")
        subprocess.getoutput("npm i")
        print("-- node modules successfully installed")

if __name__ == "__main__":
    ymusicdl_installer().install()