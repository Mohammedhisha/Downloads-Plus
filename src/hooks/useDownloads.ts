import { useState, useEffect, useRef } from 'react';
import { isToday, isYesterday, format } from 'date-fns';

export interface EnrichedDownloadItem extends chrome.downloads.DownloadItem {
  speedBytesPerSecond?: number;
  fileIcon?: string;
}

export interface GroupedDownloads {
  label: string;
  items: EnrichedDownloadItem[];
}

const MOCK_ITEMS: EnrichedDownloadItem[] = [
  {
    id: 1,
    url: 'https://example.com/Avatar.mp4',
    finalUrl: 'https://example.com/Avatar.mp4',
    referrer: '',
    filename: 'Avatar: Fire and Ash (2025) DL 2600p x265 ENG.AC3.mp4',
    incognito: false,
    danger: 'safe',
    mime: 'video/mp4',
    startTime: new Date().toISOString(),
    endTime: '',
    estimatedEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    state: 'in_progress',
    paused: false,
    canResume: true,
    error: undefined,
    bytesReceived: 1024 * 1024 * 1024,
    totalBytes: 24.9 * 1024 * 1024 * 1024,
    fileSize: 24.9 * 1024 * 1024 * 1024,
    exists: true,
    speedBytesPerSecond: 3.9 * 1024 * 1024
  },
  {
    id: 2,
    url: 'https://glamirok.com/video.mp4',
    finalUrl: 'https://glamirok.com/video.mp4',
    referrer: '',
    filename: 'How to Seduce a Stranger to 4eek - Mack (720p 4x265).mp4',
    incognito: false,
    danger: 'safe',
    mime: 'video/mp4',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    estimatedEndTime: '',
    state: 'complete',
    paused: false,
    canResume: false,
    error: undefined,
    bytesReceived: 500 * 1024 * 1024,
    totalBytes: 500 * 1024 * 1024,
    fileSize: 500 * 1024 * 1024,
    exists: false
  }
];

export function useDownloads() {
  const [downloads, setDownloads] = useState<EnrichedDownloadItem[]>([]);
  const speedRef = useRef<{ [id: number]: { bytes: number, time: number, speed: number } }>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.downloads) {
      setDownloads(MOCK_ITEMS);
      return;
    }

    const loadDownloads = () => {
      chrome.downloads.search({ orderBy: ['-startTime'] }, (items) => {
        const currentTime = Date.now();
        const enriched = items.map(item => {
          let speed = 0;
          if (item.state === 'in_progress') {
            if (speedRef.current[item.id]) {
              const prev = speedRef.current[item.id];
              const timeDiff = (currentTime - prev.time) / 1000;
              // If timeDiff > 2s the tab was hidden; skip speed calc this tick
              if (timeDiff > 0 && timeDiff < 2) {
                speed = Math.max(0, (item.bytesReceived - prev.bytes) / timeDiff);
              }
              // If timeDiff >= 2s we just reset the baseline (speed stays 0 for one tick)
            }
            speedRef.current[item.id] = { bytes: item.bytesReceived, time: currentTime, speed };
          }
          return { ...item, speedBytesPerSecond: speed } as EnrichedDownloadItem;
        });

        // Fetch file icons for all items
        let pending = enriched.length;
        if (pending === 0) {
          setDownloads(enriched);
          return;
        }
        enriched.forEach((enrichedItem, idx) => {
          if (!enrichedItem.filename) {
            pending--;
            if (pending === 0) setDownloads([...enriched]);
            return;
          }
          chrome.downloads.getFileIcon(enrichedItem.id, { size: 32 }, (iconUrl) => {
            // Silently catch and ignore "Filename not yet determined" errors
            if (chrome.runtime.lastError) {
              // No action needed
            }
            if (iconUrl) enriched[idx].fileIcon = iconUrl;
            pending--;
            if (pending === 0) {
              setDownloads([...enriched]);
            }
          });
        });
      });
    };

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(loadDownloads, 1000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    loadDownloads();
    startPolling();

    const createdListener = (_item: chrome.downloads.DownloadItem) => {
      loadDownloads();
    };

    const changedListener = (_delta: chrome.downloads.DownloadDelta) => {
      loadDownloads();
    };

    const erasedListener = (id: number) => {
      setDownloads((prev) => prev.filter((item) => item.id !== id));
      delete speedRef.current[id];
    };

    chrome.downloads.onCreated.addListener(createdListener);
    chrome.downloads.onChanged.addListener(changedListener);
    chrome.downloads.onErased.addListener(erasedListener);

    // When the tab is hidden, stop polling entirely (no queued callbacks).
    // When shown again, reset speed baselines, fetch fresh data, and restart polling.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Wipe stale speed baselines so the first tick doesn't compute a bogus average
        speedRef.current = {};
        loadDownloads();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      chrome.downloads.onCreated.removeListener(createdListener);
      chrome.downloads.onChanged.removeListener(changedListener);
      chrome.downloads.onErased.removeListener(erasedListener);
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const groupedDownloads: GroupedDownloads[] = [];
  
  downloads.forEach((item) => {
    const date = new Date(item.startTime);
    let label = '';
    
    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else {
      label = format(date, 'd MMMM yyyy'); // e.g. 5 April 2026
    }

    const group = groupedDownloads.find((g) => g.label === label);
    if (group) {
      group.items.push(item);
    } else {
      groupedDownloads.push({ label, items: [item] });
    }
  });

  return { downloads, groupedDownloads };
}
