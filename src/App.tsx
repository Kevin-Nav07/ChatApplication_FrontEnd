import React from 'react';
import { Outlet } from 'react-router-dom';
import HearthProvider from './components/hearth/HearthProvider';

// The root layout. HearthProvider sits around every page, so there is one fire for the whole app:
// it stays lit while the routes change underneath it, and glides to wherever each page asks for it
function App(): React.JSX.Element {
  return (
    <HearthProvider>
      <Outlet /> {/* replaced by the page for the current route */}
    </HearthProvider>
  );
}

export default App;
