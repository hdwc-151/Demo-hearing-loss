import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { IS_DEMO } from "./api";
import { isNative } from "./native";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: đăng ký service worker ở bản build thường (không ở dev, bản demo một file hay app Capacitor vì ở đó
// tài nguyên đã nằm sẵn trong máy). Nhờ vậy cài lên màn hình chính iOS/Android vẫn mở được khi mất mạng.
if (import.meta.env.PROD && !IS_DEMO && !isNative() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
