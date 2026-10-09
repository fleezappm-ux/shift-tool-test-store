import {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {GasUrlSetup} from './components/GasUrlSetup.tsx';
import {installGlobalErrorReporting} from './lib/error-report.ts';
import {adoptGasUrlFromAddress, readGasUrl} from './lib/gas-config.ts';

installGlobalErrorReporting();
adoptGasUrlFromAddress();

/** お店の接続先が決まっていれば画面を開き、まだなら入力画面を出す。 */
function Root() {
  const [connected, setConnected] = useState(() => readGasUrl() !== "");
  if (!connected) return <GasUrlSetup onDone={() => setConnected(true)} />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><Root /></ErrorBoundary>
  </StrictMode>,
);
