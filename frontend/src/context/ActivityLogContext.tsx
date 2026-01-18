
import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface LogItem {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
  timestamp: number
}

interface ActivityLogContextType {
  addLog: (message: string, type?: 'success' | 'info' | 'error') => void
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined)

export const useActivityLog = () => {
  const context = useContext(ActivityLogContext)
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider')
  }
  return context
}

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<LogItem[]>([])

  const addLog = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9)
    const newLog = { id, message, type, timestamp: Date.now() }
    
    setLogs(prev => [newLog, ...prev].slice(0, 5)) // Keep max 5 logs

    // Auto remove after 5 seconds
    setTimeout(() => {
      setLogs(prev => prev.filter(log => log.id !== id))
    }, 5000)
  }

  return (
    <ActivityLogContext.Provider value={{ addLog }}>
      {children}
      {/* Poll Up Overlay */}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {logs.map(log => (
            <div 
              key={log.id}
              className={`
                pointer-events-auto transform transition-all duration-500 ease-out animate-in slide-in-from-right-10 fade-in
                min-w-[300px] p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl
                flex items-center gap-3
                ${log.type === 'success' ? 'bg-cyan-950/80 text-cyan-50' : 'bg-gray-900/80 text-white'}
              `}
            >
              <div className={`
                w-2 h-10 rounded-full
                ${log.type === 'success' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-gray-500'}
              `} />
              <div>
                <p className="font-bold text-sm tracking-wide uppercase opacity-70">
                  {log.type === 'success' ? 'Transaction Confirmed' : 'Notification'}
                </p>
                <p className="font-medium">{log.message}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ActivityLogContext.Provider>
  )
}
