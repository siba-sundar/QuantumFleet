// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import ErrorBoundary from "./ErrorBoundary";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { ThirdwebProvider } from "thirdweb/react";
import { sepolia } from "thirdweb/chains";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThirdwebProvider activeChain={sepolia}>
          <App />
        </ThirdwebProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
