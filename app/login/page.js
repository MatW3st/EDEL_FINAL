"use client";
import React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import DOMPurify from "dompurify";
import "./login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Nuevo estado para el indicador de carga
  const router = useRouter();

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && !/<[^>]*>/.test(email); // Rechaza HTML
  };

  const isValidPassword = (password) => {
    return password.length >= 6 && !/<[^>]*>/.test(password); // Rechaza HTML
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true); // Activa el estado de carga al iniciar la solicitud

    if (!isValidEmail(email)) {
      setError("Por favor, ingresa un email válido sin código HTML.");
      setLoading(false); // Desactiva el estado de carga si hay error
      return;
    }
    if (!isValidPassword(password)) {
      setError("La contraseña debe tener al menos 6 caracteres y no contener código HTML.");
      setLoading(false);
      return;
    }

    const cleanEmail = DOMPurify.sanitize(email);
    const cleanPassword = DOMPurify.sanitize(password);

    try {
      const response = await axios.post(
        "https://gatito027.vercel.app/login",
        { _email: cleanEmail, _password: cleanPassword },
        { withCredentials: true, credentials: "include" }
      );

      const sessionToken = response.data;

      if (sessionToken) {
        Cookies.set("token", sessionToken, { expires: 1, path: "/", secure: true, sameSite: "strict" });
        setShowModal(true);
      } else {
        setError("No se recibió una sesión válida.");
      }
    } catch (error) {
      setError(DOMPurify.sanitize(error.response?.data?.message || "Error al iniciar sesión"));
    } finally {
      setLoading(false); // Desactiva el estado de carga al finalizar (éxito o error)
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-image">
          <img src="/masorca.png" alt="IMAGEN DE UN ELOTE XD" />
        </div>
        <div className="login-form">
          <h2>Iniciar Sesión</h2>
          <form onSubmit={handleSubmit}>
            <label>Correo:</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label>Contraseña:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Cargando..." : "Login"}
            </button>
          </form>
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>✅ ¡Inicio de sesión exitoso!</h3>
            <p>Puedes continuar a la Planeación...</p>
            <button onClick={() => router.push("/interfaz")}>Ir ahora</button>
          </div>
        </div>
      )}
    </div>
  );
}
