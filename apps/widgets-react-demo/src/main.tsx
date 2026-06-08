import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@eni-chain/app-sdk-widgets-react/styles.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
