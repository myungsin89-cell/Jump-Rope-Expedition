import React from 'react';
import ReactDOM from 'react-dom/client';
import CardPreview from './CardPreview';
import '../../styles.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CardPreview />
    </React.StrictMode>,
  );
}
