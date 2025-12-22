import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import os from 'os'

// Disable security warnings in dev (CSP warning suppression)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#0a0a0a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Vite builds this to dist-electron/preload.js
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

// Avoid cache lock issues in dev mode
if (process.env.VITE_DEV_SERVER_URL) {
    app.setPath('userData', path.join(os.tmpdir(), 'antigravity-dev-' + Date.now()))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

ipcMain.handle('save-video', async (_event, buffer: ArrayBuffer) => {
    console.log('Save video request received, buffer size:', buffer.byteLength);

    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Export MP4',
        defaultPath: `antigravity-${Date.now()}.mp4`,
        filters: [{ name: 'Movies', extensions: ['mp4'] }],
    })

    if (!filePath) {
        console.log('Export canceled by user');
        return { success: false, message: 'Canceled' };
    }

    const tempWebm = path.join(os.tmpdir(), `antigravity-temp-${Date.now()}.webm`)
    console.log('Writing temp file:', tempWebm);

    try {
        fs.writeFileSync(tempWebm, Buffer.from(buffer))
        console.log('Temp file written successfully');
    } catch (err) {
        console.error('Failed to write temp file:', err);
        return { success: false, message: `Failed to write temp file: ${err}` };
    }

    return new Promise((resolve) => {
        console.log('Starting FFmpeg conversion...');

        const ffmpegPath = 'C:\\Users\\satya\\Downloads\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe';

        // Try GPU first, fall back to CPU if it fails
        const tryEncode = (useGPU: boolean) => {
            const args = [
                '-i', tempWebm,
                '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            ];

            if (useGPU) {
                console.log('Attempting GPU-accelerated encoding (NVENC)...');
                args.push(
                    '-c:v', 'h264_nvenc',
                    '-preset', 'p4',
                    '-rc', 'vbr',
                    '-cq', '18',
                    '-b:v', '8M',
                    '-maxrate', '12M',
                    '-bufsize', '16M',
                );
            } else {
                console.log('Using CPU encoding (libx264) - this may take longer...');
                args.push(
                    '-c:v', 'libx264',
                    '-preset', 'slow',  // Better quality for CPU
                    '-crf', '18',       // High quality
                    '-profile:v', 'high',
                    '-level', '4.2',
                );
            }

            args.push(
                '-c:a', 'aac',
                '-b:a', '192k',
                '-movflags', '+faststart',
                '-y',
                filePath,
            );

            const ffmpeg = spawn(ffmpegPath, args);

            let ffmpegOutput = '';
            let ffmpegError = '';

            ffmpeg.stdout.on('data', (data) => {
                ffmpegOutput += data.toString();
            });

            ffmpeg.stderr.on('data', (data) => {
                ffmpegError += data.toString();
                console.log('FFmpeg:', data.toString());
            });

            ffmpeg.on('close', (code) => {
                console.log('FFmpeg exited with code:', code);

                try {
                    fs.unlinkSync(tempWebm);
                    console.log('Temp file deleted');
                } catch (e) {
                    console.error('Failed to delete temp file:', e);
                }

                if (code === 0) {
                    console.log('Export successful:', filePath);
                    resolve({ success: true, path: filePath });
                } else if (useGPU && code !== 0) {
                    // GPU failed, try CPU
                    console.warn('GPU encoding failed, falling back to CPU...');
                    // Write temp file again since we deleted it
                    try {
                        fs.writeFileSync(tempWebm, Buffer.from(buffer));
                        tryEncode(false);
                    } catch (err) {
                        resolve({ success: false, message: `Failed to write temp file for CPU fallback: ${err}` });
                    }
                } else {
                    console.error('FFmpeg failed with code:', code);
                    console.error('FFmpeg error output:', ffmpegError);
                    resolve({
                        success: false,
                        message: `FFmpeg failed (code ${code}). Check if FFmpeg is installed and in PATH.`
                    });
                }
            });

            ffmpeg.on('error', (err) => {
                console.error('FFmpeg spawn error:', err);
                try {
                    fs.unlinkSync(tempWebm);
                } catch (e) { }

                if (useGPU) {
                    console.warn('GPU encoding spawn failed, falling back to CPU...');
                    try {
                        fs.writeFileSync(tempWebm, Buffer.from(buffer));
                        tryEncode(false);
                    } catch (err2) {
                        resolve({ success: false, message: `FFmpeg error: ${err.message}` });
                    }
                } else {
                    resolve({
                        success: false,
                        message: `FFmpeg error: ${err.message}. Is FFmpeg installed and in PATH?`
                    });
                }
            });
        };

        // Start with GPU encoding
        tryEncode(true);
    });
});

// WebM-only export (no FFmpeg needed)
ipcMain.handle('save-video-webm', async (_event, buffer: ArrayBuffer) => {
    console.log('Save WebM request received, buffer size:', buffer.byteLength);

    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save WebM',
        defaultPath: `antigravity-${Date.now()}.webm`,
        filters: [{ name: 'WebM Video', extensions: ['webm'] }],
    });

    if (!filePath) {
        console.log('Export canceled by user');
        return { success: false, message: 'Canceled' };
    }

    try {
        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log('WebM file saved successfully:', filePath);
        return { success: true, path: filePath };
    } catch (err) {
        console.error('Failed to save WebM:', err);
        return { success: false, message: `Failed to save: ${err}` };
    }
})
