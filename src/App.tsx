import { useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { ConfigPanel } from "./components/ConfigPanel";
import { LogViewer } from "./components/LogViewer";

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <Layout activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && <Dashboard />}
      {tab === "config" && <ConfigPanel />}
      {tab === "logs" && <LogViewer />}
    </Layout>
  );
}
