import React, { useState } from 'react';
import { useAudio } from '../context/AudioPlayerContext';
import { Radio, X, Download, Trash2, Play, Pause, Circle, Disc, HardDrive } from 'lucide-react';

interface RecorderModalProps {
  onClose: () => void;
}

export const RecorderModal: React.FC<RecorderModalProps> = ({ onClose }) => {
  const {
    isRecording,
    recordingDurationSec,
    startRecording,
    stopRecording,
    recordings,
    deleteRecording,
    currentStation,
  } = useAudio();

  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePreview = (id: string, blobUrl: string) => {
    if (activePreviewId === id && isPreviewPlaying) {
      previewAudio?.pause();
      setIsPreviewPlaying(false);
      return;
    }

    if (previewAudio) {
      previewAudio.pause();
    }

    const audio = new Audio(blobUrl);
    setPreviewAudio(audio);
    setActivePreviewId(id);
    setIsPreviewPlaying(true);

    audio.play().catch(() => setIsPreviewPlaying(false));
    audio.onended = () => setIsPreviewPlaying(false);
  };

  const handleDownload = (blobUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-100 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Disc className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Запись прямого радиоэфира</span>
                {isRecording && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                    <Circle className="w-2 h-2 fill-cyan-500" /> REC {formatSeconds(recordingDurationSec)}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">Сохранение треков и передач в аудиофайл</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Station Recorder Banner */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                <Radio className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-400">Текущая станция:</div>
                <div className="font-bold text-white text-sm sm:text-base truncate">
                  {currentStation?.name || 'Ничего не играет'}
                </div>
              </div>
            </div>

            {/* REC Button */}
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 animate-pulse"
              >
                <div className="w-3 h-3 rounded-sm bg-white" />
                <span>Остановить запись ({formatSeconds(recordingDurationSec)})</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={!currentStation}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-red-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Circle className="w-3.5 h-3.5 fill-white" />
                <span>Начать запись эфира</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved Recordings List */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-violet-400" /> Сохранённые записи ({recordings.length})
            </span>
            <span className="text-[11px] text-zinc-500">Качество: Оригинал потока</span>
          </div>

          {recordings.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 bg-zinc-950/40 rounded-2xl border border-zinc-850">
              <Disc className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
              <p className="text-sm text-zinc-400">У вас пока нет сохранённых записей</p>
              <p className="text-xs text-zinc-600 mt-1">
                Включите любимую радиостанцию и нажмите «Начать запись»
              </p>
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleTogglePreview(rec.id, rec.blobUrl)}
                    className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-violet-500/20 hover:text-violet-400 text-zinc-300 flex items-center justify-center shrink-0 transition-colors"
                  >
                    {activePreviewId === rec.id && isPreviewPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-white truncate">
                      {rec.stationName}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span>{rec.date}</span>
                      <span>·</span>
                      <span className="font-mono text-violet-400">{formatSeconds(rec.durationSec)}</span>
                      <span>·</span>
                      <span className="text-zinc-500 font-mono">{rec.fileSizeFormatted}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(rec.blobUrl, rec.fileName)}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Скачать файл"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Скачать</span>
                  </button>

                  <button
                    onClick={() => deleteRecording(rec.id)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
