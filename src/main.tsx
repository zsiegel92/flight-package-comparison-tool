import { Provider as TooltipProvider } from "@radix-ui/react-tooltip";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const container = document.getElementById("app");
if (!container) throw new Error("Missing app root");

createRoot(container).render(
	<TooltipProvider delayDuration={150}>
		<App />
	</TooltipProvider>,
);
