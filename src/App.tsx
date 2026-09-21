import React from 'react';
import './App.css';


import { Outlet } from 'react-router-dom';

function App(): React.JSX.Element {
  return (
    <>


      <Outlet /> { /* this acts as the object which will render different components based off the route */}

    </>
  );
}

export default App;
