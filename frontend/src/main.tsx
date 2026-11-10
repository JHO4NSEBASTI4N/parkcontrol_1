import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const elementoRaiz = document.getElementById("app");

if (!elementoRaiz) {
  throw new Error("No se encontró el elemento raíz #app en index.html");
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <App />
  </StrictMode>
);