import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from '@/App.jsx';
import '@/index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const Root = () => {
  // Clerk is required for authenticated features but should not block public
  // reads if the key is missing in a preview env — render a plain app and
  // treat every visitor as signed-out.
  if (!PUBLISHABLE_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[auth] VITE_CLERK_PUBLISHABLE_KEY not set — rendering without Clerk');
    return <App />;
  }
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
