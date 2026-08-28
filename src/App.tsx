import React from 'react';
import './App.css';

import NavBar from './components/NavBar';
import { Outlet } from 'react-router-dom';

function App(): React.JSX.Element {
  return (
    <>

      <NavBar />
      <Outlet /> { /* this acts as the object which will render different components based off the route */}

    </>
  );
}

export default App;
