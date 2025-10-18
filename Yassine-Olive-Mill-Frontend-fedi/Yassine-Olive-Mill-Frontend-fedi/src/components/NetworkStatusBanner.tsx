import React from 'react';

function useOnlineStatus() {
  const [online, setOnline] = React.useState<boolean>(navigator.onLine);
  React.useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

export default function NetworkStatusBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
      background: '#222', color: '#fff', padding: '8px 12px', borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)', zIndex: 10000, fontSize: 14
    }}>
      You are offline. Changes will sync when connection is back.
    </div>
  );
}
