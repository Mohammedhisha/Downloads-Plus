import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  MoreVertical, 
  X, 
  Link as LinkIcon, 
  Folder, 
  FileVideo,
  ImageIcon,
  Music,
  FileArchive,
  ChevronDown,
  Info,
  RefreshCw
} from 'lucide-react';
import { formatBytes, parseFilename } from '../lib/parser';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  item: any;
  searchQuery?: string;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onCancel: (id: number) => void;
  onRemove: (id: number) => void;
  onShow: (id: number) => void;
  onRetry: (item: any) => void;
}

const PlayPauseSVG = ({ isPaused }: { isPaused: boolean }) => {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <motion.path
        initial={false}
        animate={{
          d: isPaused
             // When paused, we show PLAY (Triangle)
            ? "M 6 4 L 6 20 L 20 12 L 20 12 Z"
             // When active, we show PAUSE (Left Bar)
            : "M 6 4 L 6 20 L 10 20 L 10 4 Z"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      />
      <motion.path
        initial={false}
        animate={{
          d: isPaused
             // When paused, the right bar compresses into the triangle's tip
            ? "M 20 12 L 20 12 L 20 12 L 20 12 Z"
             // When active, we show PAUSE (Right Bar)
            : "M 14 4 L 14 20 L 18 20 L 18 4 Z"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      />
    </svg>
  );
};

export const DownloadItemCard: React.FC<Props> = ({ item, searchQuery = '', onPause, onResume, onCancel, onRemove, onShow, onRetry }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showFullUrl, setShowFullUrl] = useState(false);
  const [showFullReferrer, setShowFullReferrer] = useState(false);
  const [showGreenGlow, setShowGreenGlow] = useState(false);
  const wasInProgress = useRef(false);

  const { title, tags } = parseFilename(item.filename);
  const isComplete = item.state === 'complete';
  const isDeleted = !item.exists && isComplete;
  const inProgress = item.state === 'in_progress';
  const isInterrupted = item.state === 'interrupted';

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-blue-500/40 text-white rounded-sm px-0.5">{part}</span> 
        : part
    );
  };

  // Detect transition from in_progress → complete and fire a 5s green glow
  useEffect(() => {
    if (inProgress) {
      wasInProgress.current = true;
    } else if (isComplete && wasInProgress.current) {
      wasInProgress.current = false;
      setShowGreenGlow(true);
      const t = setTimeout(() => setShowGreenGlow(false), 5000);
      return () => clearTimeout(t);
    }
  }, [inProgress, isComplete]);

  // Progress calculations
  const progressPercent = item.totalBytes > 0 ? (item.bytesReceived / item.totalBytes) * 100 : 0;
  const rawSpeed = item.speedBytesPerSecond !== undefined ? item.speedBytesPerSecond : item.speed;
  const speedStr = rawSpeed !== undefined ? `${formatBytes(rawSpeed)}/s` : '0 Bytes/s';
  
  const cardClasses = `flex flex-col p-4 bg-[var(--color-bg-panel)] rounded-xl transition-all duration-300 overflow-hidden relative z-0 ${
    isInterrupted 
      ? 'border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)] bg-red-500/5' 
      : 'border border-[var(--color-border)] shadow-sm'
  }`;
  
  // Choose Icon logic
  const renderIcon = () => {
    // Use the OS-provided icon for exe files (shows actual app icon)
    const isExe = item.filename.match(/\.exe$/i);
    if (isExe && item.fileIcon) {
      return <img src={item.fileIcon} alt="" className="w-6 h-6 object-contain" />;
    }

    const m = (item.mime || '').toLowerCase();
    const extMatch = item.filename.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    const props = { className: "text-gray-300", size: 24 };

    if (m.includes('video') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return <FileVideo {...props} />;
    if (m.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <ImageIcon {...props} />;
    if (m.includes('audio') || ['mp3', 'wav', 'flac', 'ogg'].includes(ext)) return <Music {...props} />;
    if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return <FileArchive {...props} />;
    
    return <FileText {...props} />;
  };

  return (
    <div className={`relative isolate z-0 ${(inProgress || isInterrupted || showGreenGlow) ? 'my-2' : 'my-0.5'}`} style={{ isolation: 'isolate' }}>
      {/* Background Glow Layer — always mounted, fully CSS-transitioned */}
      {(() => {
        const isGreen = showGreenGlow || (inProgress && progressPercent >= 100);
        const isRed = isInterrupted;
        const glowActive = inProgress || showGreenGlow;
        const glowWidth = (showGreenGlow || progressPercent >= 100) ? 100 : progressPercent;
        const glowOpacity = glowActive ? (isGreen ? 0.5 : 0.4) : 0;
        const glowColor = isRed ? '#ef4444' : isGreen ? '#22c55e' : 'var(--color-accent-blue)';
        return (
          <div
            style={{
              position: 'absolute',
              top: 0, bottom: 0, left: 0,
              width: `${glowWidth}%`,
              backgroundColor: glowColor,
              borderRadius: '0.75rem',
              filter: 'blur(14px)',
              opacity: glowOpacity,
              zIndex: -1,
              pointerEvents: 'none',
              transition: 'opacity 700ms ease, background-color 600ms ease, width 300ms ease',
            }}
          />
        );
      })()}

      <div className={cardClasses}>
        <div className="flex gap-4 min-w-0 relative z-20">
        
        {/* Left Icon Panel */}
        <div className="flex-shrink-0">
          <div className="w-12 h-14 bg-[var(--color-bg-item)] rounded-md flex items-center justify-center border border-[var(--color-border)]">
            {renderIcon()}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow min-w-0 pr-4 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            {/* Title with break-all for extremely long unwrapped strings, or truncate */}
            <h3 className={`text-[13px] font-medium break-all pr-2 ${isDeleted ? 'line-through text-gray-500' : isInterrupted ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-primary)]'}`}>
              {highlightText(title, searchQuery)}
            </h3>
            {inProgress && (
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <Info size={16} />
              </button>
            )}
          </div>

          {/* Tags list */}
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            {tags.map((t: string, i: number) => {
              const isMatched = searchQuery.trim() !== '' && t.toLowerCase().includes(searchQuery.toLowerCase());
              return (
                <span 
                  key={i} 
                  className={`px-2 py-[2px] text-[10px] font-bold border rounded-sm transition-all duration-300 ${
                    isMatched 
                      ? 'bg-blue-500/20 border-blue-400 text-blue-200 shadow-[0_0_10px_rgba(96,165,250,0.4)] pt-0.5' 
                      : 'border-[var(--color-border)] text-gray-300'
                  }`}
                >
                  {t.toUpperCase()}
                </span>
              );
            })}
          </div>

          {/* Source Location Text */}
          {(!inProgress) && (
            <div className="text-[12px] text-gray-400 mt-2 truncate pr-4">
              {isDeleted ? (
                  <span className="text-gray-500">&bull; Deleted from {item.finalUrl || item.url}</span>
              ) : (
                  <span>
                    Downloaded from <span className="text-blue-400 hover:underline cursor-pointer">{new URL(item.finalUrl || item.url || 'http://localhost').origin}</span>
                  </span>
              )}
            </div>
          )}

          {/* Progress Bar & Details */}
          {inProgress && (
            <div className="mt-3 text-[12px] text-gray-400 font-medium tracking-wide flex flex-col gap-1">
              <div className="w-full h-1 bg-[var(--color-border)] rounded-full mb-1 overflow-hidden">
                <div 
                  className="h-full bg-[var(--color-accent-blue)] rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="tabular-nums">
                  {formatBytes(item.bytesReceived)} / {formatBytes(item.totalBytes)} - {Math.round(progressPercent)}%
                </span>
                <div className="flex items-center gap-2 w-[180px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" className={`flex-shrink-0 ${!item.paused ? "animate-spin" : ""}`}>
                    <circle cx="12" cy="12" r="10" stroke="#3c4043" strokeWidth="3" fill="none" />
                    <circle 
                      cx="12" cy="12" r="10" 
                      stroke="var(--color-accent-blue)" 
                      strokeWidth="3" 
                      fill="none" 
                      strokeDasharray="62.8" 
                      strokeDashoffset={62.8 - (62.8 * progressPercent) / 100}
                      className="transition-all duration-500 ease-in-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex items-center justify-start flex-1 overflow-visible">
                    <span>{item.paused ? 'Paused' : 'Downloading'}</span>
                    {!item.paused && (
                      <span className="text-gray-500 ml-1.5 tabular-nums whitespace-nowrap">
                        &bull; {speedStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deleted or Failed Status */}
          {(isDeleted || isInterrupted) && (
            <div className="mt-1">
              <span className={`text-[12px] font-bold tracking-wide ${isInterrupted ? 'text-[var(--color-accent-red)]' : 'text-gray-500'}`}>
                {isInterrupted ? `Failed${item.error ? ` - ${item.error.replace('FILE_', '').replace('NETWORK_', '').replace('_', ' ').toLowerCase()}` : ''}` : 'Deleted'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons Right Side */}
        <div className="flex-shrink-0 flex items-center gap-2 ml-auto">
          {inProgress ? (
            <div className="flex flex-col gap-2">
                <button 
                  onClick={() => item.paused ? onResume(item.id) : onPause(item.id)}
                  className="flex items-center justify-center gap-2 w-28 py-2 border border-[var(--color-accent-blue)] text-[var(--color-accent-blue)] rounded-md text-[13px] font-medium hover:bg-[var(--color-accent-blue)] hover:text-[#1A1A1A] transition-colors"
                >
                  <PlayPauseSVG isPaused={item.paused} />
                  {item.paused ? 'Resume' : 'Pause'}
                </button>
                <button 
                  onClick={() => onCancel(item.id)}
                  className="flex items-center justify-center gap-2 w-28 py-2 border border-[var(--color-border)] text-gray-300 rounded-md text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={15} /> Cancel
                </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(item.finalUrl || item.url);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] text-gray-300 rounded text-[13px] hover:bg-white/10 hover:text-white transition-colors"
                >
                  <LinkIcon size={14} /> Copy link
                </button>
              <button 
                  onClick={() => onRemove(item.id)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] text-gray-300 rounded text-[13px] hover:bg-white/10 hover:text-white transition-colors"
                >
                  Remove from list
                </button>
                {!isDeleted && !isInterrupted && (
                  <button 
                      onClick={() => onShow(item.id)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] text-gray-300 rounded text-[13px] hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Folder size={14} /> Open Folder
                  </button>
                )}
                {isInterrupted && (
                  <button 
                      onClick={() => onRetry(item)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-accent-red)] text-[var(--color-accent-red)] rounded text-[13px] hover:bg-[var(--color-accent-red)] hover:text-white transition-colors"
                    >
                      <RefreshCw size={14} /> Retry
                  </button>
                )}
                {!inProgress && (
                    <button 
                      onClick={() => setShowInfo(!showInfo)}
                      className="p-1.5 border border-[var(--color-border)] text-gray-300 rounded hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
                    >
                      <ChevronDown size={14} className={`transition-transform ${showInfo ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Debug / Extra Info Section */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <h4 className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">Detailed Information</h4>
              <div className="bg-[var(--color-bg-item)] p-4 rounded-xl border border-[var(--color-border)]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">MIME Type</span>
                    <span className="text-xs text-[var(--color-text-primary)] mt-0.5">{item.mime || 'Unknown'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">File Size</span>
                    <span className="text-xs text-[var(--color-text-primary)] mt-0.5">{formatBytes(item.fileSize || item.totalBytes)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">State</span>
                    <span className="text-xs text-[var(--color-text-primary)] mt-0.5 capitalize">{item.state.replace('_', ' ')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Danger Level</span>
                    <span className="text-xs text-[var(--color-text-primary)] mt-0.5 capitalize">{item.danger}</span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Started</span>
                    <span className="text-xs text-[var(--color-text-primary)] mt-0.5">{new Date(item.startTime).toLocaleString()}</span>
                  </div>
                  {item.endTime && (
                    <div className="flex flex-col col-span-2">
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Finished</span>
                      <span className="text-xs text-[var(--color-text-primary)] mt-0.5">{new Date(item.endTime).toLocaleString()}</span>
                    </div>
                  )}
                  {item.referrer && (
                    <div className="flex flex-col col-span-2 md:col-span-4">
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Referrer</span>
                      <div className="text-xs text-[var(--color-text-primary)] mt-0.5 break-all">
                        {!showFullReferrer && item.referrer.length > 200 ? `${item.referrer.substring(0, 200)}...` : item.referrer}
                        {item.referrer.length > 200 && (
                          <button onClick={() => setShowFullReferrer(!showFullReferrer)} className="text-[var(--color-accent-blue)] hover:underline ml-1 font-medium select-none">
                            {showFullReferrer ? 'Show less' : 'Show more...'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col col-span-2 md:col-span-4 mt-1">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Origin URL</span>
                    <div className="text-[11px] text-[var(--color-text-primary)] mt-0.5 break-all leading-relaxed bg-[var(--color-bg-base)] p-2 rounded border border-[var(--color-border)]">
                      {!showFullUrl && item.url.length > 200 ? `${item.url.substring(0, 200)}...` : item.url}
                      {item.url.length > 200 && (
                        <button onClick={() => setShowFullUrl(!showFullUrl)} className="text-[var(--color-accent-blue)] hover:underline ml-1 font-medium select-none">
                          {showFullUrl ? 'Show less' : 'Show more...'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
