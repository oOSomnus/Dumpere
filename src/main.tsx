import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './renderer/App'
import './index.css'

// Mount the app
const container = document.getElementById('root')
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
