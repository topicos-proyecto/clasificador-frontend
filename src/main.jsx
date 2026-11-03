import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles.css'
import './admin.css'
import Soporte from './pages/public/Soporte.jsx'
import Login from './pages/admin/Login.jsx'
import Layout from './pages/admin/Layout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Tickets from './pages/admin/Tickets.jsx'
import Notificaciones from './pages/admin/Notificaciones.jsx'
import Areas from './pages/admin/Areas.jsx'
import Empleados from './pages/admin/Empleados.jsx'
import Modelo from './pages/admin/Modelo.jsx'
import Laboratorio from './pages/admin/Laboratorio.jsx'

function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/soporte" replace/>}/>
      <Route path="/soporte" element={<Soporte/>}/>
      <Route path="/admin/login" element={<Login/>}/>
      <Route path="/admin" element={<Layout/>}>
        <Route index element={<Dashboard/>}/>
        <Route path="tickets" element={<Tickets/>}/>
        <Route path="notificaciones" element={<Notificaciones/>}/>
        <Route path="areas" element={<Areas/>}/>
        <Route path="empleados" element={<Empleados/>}/>
        <Route path="modelo" element={<Modelo/>}/>
        <Route path="laboratorio" element={<Laboratorio/>}/>
      </Route>
      <Route path="*" element={<Navigate to="/soporte" replace/>}/>
    </Routes>
  </BrowserRouter>
}

createRoot(document.getElementById('root')).render(<App/>)
