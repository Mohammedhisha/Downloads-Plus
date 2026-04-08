import { useState, useEffect } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { useDownloads } from './hooks/useDownloads';
import { DownloadItemCard } from './components/DownloadItemCard';
import { motion, AnimatePresence } from 'framer-motion';
import { parseFilename } from './lib/parser';


function App() {
  const { downloads: realDownloads, groupedDownloads: realGrouped } = useDownloads();
  const [search, setSearch] = useState('');

  const filteredGroups = realGrouped.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const s = search.toLowerCase();
      if (!s) return true;
      const { title, tags } = parseFilename(item.filename);
      return (
        title.toLowerCase().includes(s) ||
        item.url.toLowerCase().includes(s) ||
        tags.some(tag => tag.toLowerCase().includes(s))
      );
    })
  })).filter(group => group.items.length > 0);

  const handlePause  = (id: number) => { if (typeof chrome !== 'undefined' && chrome.downloads) chrome.downloads.pause(id); };
  const handleResume = (id: number) => { if (typeof chrome !== 'undefined' && chrome.downloads) chrome.downloads.resume(id); };
  const handleCancel = (id: number) => { if (typeof chrome !== 'undefined' && chrome.downloads) chrome.downloads.cancel(id); };
  const handleRemove = (id: number) => { if (typeof chrome !== 'undefined' && chrome.downloads) chrome.downloads.erase({ id }); };
  const handleShow   = (id: number) => { if (typeof chrome !== 'undefined' && chrome.downloads) chrome.downloads.show(id); };
  const handleRetry  = (item: any) => {
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      if (item.canResume) chrome.downloads.resume(item.id);
      else chrome.downloads.download({ url: item.finalUrl || item.url });
    }
  };

  const handleClearAll = () => {
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      realDownloads.filter(d => d.state !== 'in_progress').forEach(d => chrome.downloads.erase({ id: d.id }));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] relative flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--color-bg-base)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/direct-download.svg" alt="Downloads" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">Downloads Plus</h1>
        </div>

        <div className="flex-1 max-w-2xl mx-12">
          <div className="relative flex items-center w-full h-10 rounded-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] focus-within:border-gray-400 focus-within:bg-[var(--color-bg-item)] transition-colors overflow-hidden">
            <Search className="absolute left-4 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search download history"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none pl-12 pr-4 text-sm text-[var(--color-text-primary)] placeholder-gray-500 font-medium"
            />
          </div>
        </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  chrome.runtime.sendMessage({ type: 'OPEN_OLD_DOWNLOADS', tabId: tab?.id });
                }
              }}
              className="px-4 py-1.5 border border-[var(--color-border)] text-sm rounded-full text-gray-400 hover:bg-white/5 transition-colors flex items-center gap-2 shrink-0"
            >
              <ExternalLink size={14} /> Old page
            </button>

            <button onClick={handleClearAll} className="px-4 py-1.5 border border-[var(--color-border)] text-sm rounded-full text-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue)] hover:bg-opacity-10 transition-colors shrink-0">
              Clear all
            </button>
          </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 flex-grow w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key="real"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >

            {filteredGroups.length === 0 ? (
              <div className="text-center mt-20 text-gray-500">No download history found.</div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.label} className="mb-8">
                  <h2 className="text-[11px] font-semibold text-gray-500 mb-4 ml-1 tracking-widest uppercase opacity-60">
                    {group.label}
                  </h2>
                  <div className="flex flex-col">
                    {group.items.map(item => (
                      <DownloadItemCard
                        key={item.id}
                        item={item}
                        searchQuery={search}
                        onPause={handlePause}
                        onResume={handleResume}
                        onCancel={handleCancel}
                        onRemove={handleRemove}
                        onShow={handleShow}
                        onRetry={handleRetry}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
