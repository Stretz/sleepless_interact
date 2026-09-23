import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/latin-ext-700.css";
import { App } from "@/App";
import { bindMessages } from "@/nui/observe";
import { post } from "@/nui/post";
import { bindInteract } from "@/stores/interact";
import { isDuiSurface } from "@/utils/misc";
import "@/style/global.css";

bindMessages();
bindInteract();
post("load", { surface: isDuiSurface() ? "dui" : "cursor" });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
